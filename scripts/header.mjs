// Плавающая шапка: геометрия, телефон и перекраска на тёмном фоне.
//
// Гоняем в режиме заказчика — «уменьшить анимацию» включено.
// node scripts/header.mjs
import { chromium } from "playwright";

const ok = (cond, text) => console.log(`  ${cond ? "ok  " : "ПЛОХО"} ${text}`);
let bad = 0;
const check = (cond, text) => { if (!cond) bad++; ok(cond, text); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
/*
  Отключаем подмагничивание блоков: проба ищет границу перекраски логотипа
  пошаговой развёрткой по прокрутке, а притяжение уводит её с намеченных
  позиций — граница «не находится» там, где она есть.
*/
await page.evaluate(() => {
  document.documentElement.style.scrollSnapType = "none";
});
await page.waitForTimeout(900);

const { scale, stageTop } = await page.evaluate(() => ({
  scale: parseFloat(getComputedStyle(document.documentElement).fontSize) / 16,
  stageTop: document.querySelector("main > .stage").getBoundingClientRect().top + window.scrollY,
}));
/** Прокрутка, при которой верх окна стоит на координате сцены y. */
const at = (y) => Math.round(stageTop + y * scale);

// ── геометрия ─────────────────────────────────────────────────
const geom = await page.evaluate(() => {
  const header = document.querySelector(".floating-site-header");
  const stageX = header.querySelector(".stage").getBoundingClientRect().x;
  const rect = (sel) => {
    const el = header.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x - stageX, y: b.y, w: b.width, h: b.height };
  };
  const phone = header.querySelector(".u-header-phone");
  return {
    лого: rect(".floating-header-logo"),
    телеграм: rect("[aria-label='Telegram MyWish']"),
    max: rect("[aria-label='MAX MyWish']"),
    телефон: rect(".u-header-phone"),
    текст: phone.textContent.trim(),
    строк: phone.getClientRects().length,
    href: phone.getAttribute("href"),
  };
});
const L = (v) => +(v / scale).toFixed(1);
const b = (r) => ({ x: L(r.x), y: L(r.y), w: L(r.w), h: L(r.h) });

console.log("геометрия (макетные координаты внутри сцены):");
for (const [name, key] of [["лого", "лого"], ["телеграм", "телеграм"], ["MAX", "max"], ["телефон", "телефон"]]) {
  const r = b(geom[key]);
  console.log(`  ${name.padEnd(9)} x ${String(r.x).padStart(6)}  y ${String(r.y).padStart(5)}  w ${String(r.w).padStart(6)}  h ${r.h}`);
}
const phone = b(geom.телефон);
const max = b(geom.max);
const tg = b(geom.телеграм);
console.log("");
check(Math.abs(phone.x + phone.w - 1312) < 1, `правый край телефона на 1312 (сейчас ${(phone.x + phone.w).toFixed(1)})`);
check(geom.строк === 1, `номер в одну строку (строк: ${geom.строк})`);
check(geom.текст === "+7 (962) 886-46-05", `текст «${geom.текст}»`);
check(geom.href === "tel:+79628864605", `ссылка ${geom.href}`);
check(phone.x - (max.x + max.w) >= 14, `зазор MAX → телефон ${(phone.x - max.x - max.w).toFixed(1)} (было 15)`);
check(max.x - (tg.x + tg.w) >= 6, `зазор Telegram → MAX ${(max.x - tg.x - tg.w).toFixed(1)} (было 7)`);

// ── перекраска ────────────────────────────────────────────────
const probe = async (sceneY) => {
  await page.evaluate((s) => window.scrollTo({ top: s, behavior: "instant" }), at(sceneY));
  await page.waitForTimeout(450);
  return page.evaluate(() => {
    const h = document.querySelector(".floating-site-header");
    const cs = (sel, prop) => getComputedStyle(h.querySelector(sel))[prop];
    return {
      over: h.dataset.over,
      фильтр: cs(".floating-header-logo", "filter"),
      пилюля: cs(".u-header-phone", "backgroundColor"),
      текст: cs(".u-header-phone", "color"),
      плашка: cs(".floating-header-chip", "backgroundColor"),
      длительность: cs(".floating-header-logo", "transitionDuration"),
    };
  });
};

console.log("\nперекраска на тёмной полосе (сцена 3172…3852):");
const light = await probe(2800);
const dark = await probe(3400);
const back = await probe(4200);
check(light.over === "light" && light.фильтр === "none", `на светлом фоне схема light, логотип без фильтра`);
check(dark.over === "dark" && dark.фильтр.includes("invert"), `на тёмном схема dark, логотип белый (${dark.фильтр})`);
check(back.over === "light" && back.фильтр === "none", `после полосы снова light`);
check(dark.пилюля === "rgb(219, 64, 79)", `пилюля на тёмном краснеет (${dark.пилюля})`);
check(light.пилюля === "rgb(14, 23, 54)", `пилюля на светлом тёмно-синяя (${light.пилюля})`);
check(dark.текст === "rgb(255, 255, 255)" && light.текст === "rgb(255, 255, 255)", `номер белый в обеих схемах`);
check(dark.плашка === "rgba(255, 249, 247, 0.92)", `плашки на тёмном плотные (${dark.плашка})`);

// ── границы переключения ──────────────────────────────────────
const read = async (y) => { await page.evaluate((s) => window.scrollTo({ top: s, behavior: "instant" }), at(y)); await page.waitForTimeout(110); return page.evaluate(() => document.querySelector(".floating-site-header").dataset.over); };
const edge = async (from, to, step) => {
  let prev = await read(from);
  for (let y = from + step; step > 0 ? y <= to : y >= to; y += step) {
    const now = await read(y);
    if (now !== prev) return y;
    prev = now;
  }
  return null;
};
const inEdge = await edge(3100, 3260, 2);
const outEdge = await edge(3900, 3700, -2);
console.log("\nграницы переключения — логотип должен белеть, лёжа на тёмном целиком:");
if (inEdge !== null) {
  console.log(`  вход:  логотип накрывает ${inEdge + 20} … ${inEdge + 89}, тёмное начинается на 3172`);
  check(Math.abs(inEdge + 20 - 3172) <= 6, `промах на входе ${Math.abs(inEdge + 20 - 3172)}px (допуск 6)`);
} else { bad++; console.log("  ПЛОХО вход не найден"); }
if (outEdge !== null) {
  console.log(`  выход: логотип накрывает ${outEdge + 20} … ${outEdge + 89}, тёмное кончается на 3852`);
  check(Math.abs(outEdge + 89 - 3852) <= 6, `промах на выходе ${Math.abs(outEdge + 89 - 3852)}px (допуск 6)`);
} else { bad++; console.log("  ПЛОХО выход не найден"); }

// ── сниженная анимация ────────────────────────────────────────
console.log("\nпри «уменьшить анимацию»:");
check(dark.длительность === "0.22s", `перекраска логотипа плавная, ${dark.длительность} (не должно быть 0.01ms)`);

// ── передача первому экрану ───────────────────────────────────
// Шапка hero стоит на 37 макетных px от верха страницы, плавающая — на 20 от
// верха окна. Последние 17 × масштаб пикселей плавающая едет вниз вместе со
// страницей и на прокрутке 0 оказывается ровно на месте статической — там и
// происходит подмена.
const dockRange = 17 * scale;

/** Подъехать к позиции снизу вверх — иначе плавающая шапка не покажется. */
const upTo = async (target) => {
  await page.evaluate((s) => window.scrollTo({ top: s, behavior: "instant" }), target + 400);
  await page.waitForTimeout(250);
  for (let i = 1; i <= 10; i++) {
    await page.evaluate((s) => window.scrollTo({ top: s, behavior: "instant" }), target + 400 - i * 40);
    await page.waitForTimeout(35);
  }
  await page.evaluate((s) => window.scrollTo({ top: s, behavior: "instant" }), target);
  /*
    Шапку зовёт движение курсора, а не его положение: пока мышь лежит
    неподвижно, событий нет и показывать нечего. Шевелим её в верхней полосе —
    так же, как это делает человек, который тянется к меню.
  */
  await page.mouse.move(700, 44);
  await page.mouse.move(700, 40);
  await page.waitForTimeout(450);
  return page.evaluate(() => {
    const float = document.querySelector(".floating-site-header");
    const hero = document.querySelector(".hero-static-header");
    const fl = float.querySelector(".floating-header-logo").getBoundingClientRect();
    const hl = hero.querySelector("img[src*='logo.webp']").getBoundingClientRect();
    return {
      владелец: document.documentElement.dataset.headerOwner,
      видна: float.dataset.visible,
      схема: float.dataset.over,
      героСкрыт: getComputedStyle(hero).visibility === "hidden",
      плавающий: [fl.x, fl.y],
      геро: [hl.x, hl.y],
    };
  });
};

console.log(`\nпередача первому экрану (доезд ${dockRange.toFixed(1)}px, подмена на прокрутке 0):`);

/*
  Шапку вызывает курсор, поэтому держим его в верхней полосе на всё время
  доезда: без этого она не показана, и передавать эстафету нечему.
*/
await page.mouse.move(700, 40);
await page.waitForTimeout(400);

/* Внутри участка доезда шапка должна стоять там же, где приезжает статическая. */
const mid = await upTo(Math.max(1, Math.round(dockRange / 2)));
const atEdge = await upTo(1);
const done = await upTo(0);

const gap = (s) => [
  Math.abs(s.плавающий[0] - s.геро[0]),
  Math.abs(s.плавающий[1] - s.геро[1]),
];
const [mdx, mdy] = gap(mid);
const [edx, edy] = gap(atEdge);

console.log(`  середина доезда: владелец ${mid.владелец}, расхождение с местом статической Δx ${mdx.toFixed(2)} Δy ${mdy.toFixed(2)}`);
console.log(`  перед подменой:  владелец ${atEdge.владелец}, шапка hero скрыта: ${atEdge.героСкрыт}, Δx ${edx.toFixed(2)} Δy ${edy.toFixed(2)}`);
console.log(`  после подмены:   владелец ${done.владелец}, шапка hero скрыта: ${done.героСкрыт}, плавающая видна: ${done.видна}`);

check(mid.владелец === "floating" && mid.героСкрыт, "на доезде держит плавающая, статическая спрятана");
check(mdx < 1.5 && mdy < 1.5, `на доезде шапка идёт по траектории статической (Δy ${mdy.toFixed(2)}, допуск 1.5px)`);
check(edx < 1.5 && edy < 1.5, `перед подменой шапки совпадают (Δy ${edy.toFixed(2)}, допуск 1.5px)`);
check(done.владелец === "hero" && !done.героСкрыт && done.видна === "false", "после подмены держит статическая, плавающая убрана");
check(mid.схема === "hero", `над первым экраном схема hero (${mid.схема})`);

console.log("\nошибки консоли:", errors.length ? errors : "нет");
/* ── вызов курсором: приходит по наведению, уходит, когда увели ─ */
console.log("");
console.log("шапку зовёт курсор:");
const видна = () => page.evaluate(() => document.querySelector(".floating-site-header").dataset.visible);
/* Подальше от точек притяжения, иначе прокрутку возвращает к блоку. */
await page.evaluate(() => window.scrollTo({ top: 3400, behavior: "instant" }));
await page.waitForTimeout(500);
check((await видна()) === "false", "после прыжка вниз шапки нет");

await page.mouse.move(700, 600);
await page.waitForTimeout(400);
check((await видна()) === "false", "курсор посреди экрана её не зовёт");

await page.mouse.move(700, 60);
await page.waitForTimeout(500);
check((await видна()) === "true", "курсор у верхнего края — пришла");

await page.mouse.move(700, 150);
await page.waitForTimeout(400);
check((await видна()) === "true", "у самой границы не мигает");

await page.mouse.move(700, 400);
await page.waitForTimeout(700);
check((await видна()) === "false", "увели курсор вниз — ушла");

await page.mouse.move(700, 40);
await page.waitForTimeout(500);
check((await видна()) === "true", "позвали снова — снова пришла");

await page.mouse.wheel(0, 300);
await page.waitForTimeout(500);
check((await видна()) === "false", "прокрутка вниз убирает её, где бы ни был курсор");

/*
  Ход не должен глохнуть при «уменьшить анимацию»: у самого края экрана
  мгновенное появление читается как рывок страницы, а не как меню.
*/
const ход = await page.evaluate(
  () => getComputedStyle(document.querySelector(".floating-site-header")).transitionDuration,
);
console.log("  длительность хода:", ход);
check(parseFloat(ход) > 0.2, "выезд плавный даже при сниженной анимации");

console.log("\nошибки консоли:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

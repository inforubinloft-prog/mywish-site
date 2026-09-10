// Страница залов: структура, входы с главной и просмотр фотографий.
//
// Гоняем в режиме заказчика — «уменьшить анимацию» включено.
// node scripts/halls-page.mjs
import { chromium } from "playwright";
import { LOCATIONS, HALLS } from "../src/lib/halls.mjs";

let bad = 0;
const check = (cond, text) => {
  if (!cond) bad++;
  console.log(`  ${cond ? "ok  " : "ПЛОХО"} ${text}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const errors = [];
const missing = [];
/*
  Считаем своими только ошибки со страницы. Виджет Яндекс-карты живёт в чужом
  iframe и тянет за собой рекламный cookie-sync — десяток запросов к биржам,
  часть которых всегда отваливается по сертификату или редиректам. К нашему
  коду это отношения не имеет, и молчать об этом виджет не умеет.
*/
const своя = (m) => {
  const url = m.location?.()?.url ?? "";
  return !url || url.includes("localhost:3000");
};
page.on("console", (m) => m.type() === "error" && своя(m) && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e.message)));
page.on("response", (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url()}`));

/** Плавная прокрутка теперь везде — ждём, пока страница встанет. */
const settle = async () => {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) return;
    last = y;
    await page.waitForTimeout(80);
  }
};

// ── входы с главной ───────────────────────────────────────────
console.log("входы на страницу залов с главной:");
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const entries = await page.evaluate(() => ({
  всеЗалыВСекции: document.querySelector("#halls a.halls-action-all")?.getAttribute("href"),
  кнопкиЛокаций: [...document.querySelectorAll("#where .u-halls-link")].map((a) => a.getAttribute("href")),
  подвалЗалы: [...document.querySelectorAll('footer a[href^="/halls#"]')].map((a) => a.getAttribute("href")),
  подвалВсеЗалы: [...document.querySelectorAll('footer a[href="/halls"]')].length,
}));
console.log("  «ВСЕ ЗАЛЫ» во втором блоке →", entries.всеЗалыВСекции);
console.log("  кнопки «Залы» у адресов →", entries.кнопкиЛокаций.join(", "));
console.log("  подвал, колонка «Залы» →", entries.подвалЗалы.length, "ссылок");
check(entries.всеЗалыВСекции === "/halls", "кнопка «ВСЕ ЗАЛЫ» ведёт на страницу залов");
check(
  entries.кнопкиЛокаций.length === 3 &&
    entries.кнопкиЛокаций.every((h, i) => h === `/halls#${LOCATIONS[i].slug}`),
  "каждая кнопка «Залы» ведёт на свою площадку",
);
check(entries.подвалЗалы.length === HALLS.length, `в подвале ${HALLS.length} ссылок на залы`);
check(entries.подвалВсеЗалы === 1, "в подвале есть «Все залы»");

// ── сама страница ─────────────────────────────────────────────
console.log("\nстраница залов:");
await page.goto("http://localhost:3000/halls", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

const structure = await page.evaluate(() => ({
  заголовок: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim(),
  площадок: document.querySelectorAll(".halls-location").length,
  карточек: document.querySelectorAll(".halls-card").length,
  шапка: !!document.querySelector(".hero-static-header"),
  видео: !!document.querySelector(".halls-hero-video"),
  подвал: !!document.querySelector(".halls-footer"),
  якоряПлощадок: [...document.querySelectorAll(".halls-location")].map((s) => s.id),
  якоряЗалов: [...document.querySelectorAll(".halls-card")].map((s) => s.id),
}));
console.log("  заголовок:", structure.заголовок);
console.log("  площадок", structure.площадок, "· карточек", structure.карточек);
check(structure.площадок === 3, "три площадки");
check(structure.карточек === 9, "девять залов");
check(structure.шапка && structure.видео && structure.подвал, "шапка, ролик и подвал на месте");
check(
  structure.якоряПлощадок.join() === LOCATIONS.map((l) => l.slug).join(),
  "якоря площадок совпадают со списком",
);
check(
  structure.якоряЗалов.join() === HALLS.map((h) => h.slug).join(),
  "якоря залов совпадают со списком",
);

// шрифты и цвета — те же, что на главной
const tokens = await page.evaluate(() => {
  const title = document.querySelector(".halls-card-title");
  const cs = getComputedStyle(title);
  return { шрифт: cs.fontFamily.split(",")[0], цветФона: getComputedStyle(document.body).backgroundColor };
});
console.log("  шрифт названия зала:", tokens.шрифт, "· фон страницы:", tokens.цветФона);
check(tokens.шрифт.includes("fira"), "названия набраны фирменным Fira, как заголовки главной");
check(tokens.цветФона === "rgb(252, 225, 227)", "фон тот же, что на главной");

// обложки загрузились
const covers = await page.evaluate(() =>
  [...document.querySelectorAll(".halls-card-img")].map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0 })),
);
const badCovers = covers.filter((c) => !c.ok);
check(badCovers.length === 0, `все девять обложек загрузились${badCovers.length ? ": " + badCovers.map((c) => c.src).join(" ") : ""}`);

// ── листание прямо в карточке ─────────────────────────────────
console.log("\nлистание в карточке:");
const cardBefore = await page.evaluate(() => {
  const c = document.querySelector("#flamingo");
  return {
    кадр: c.querySelector(".halls-card-img").getAttribute("src"),
    счётчик: c.querySelector(".halls-card-count").textContent,
    стрелкиПрозрачны: getComputedStyle(c.querySelector(".halls-card-nav")).opacity,
  };
});
console.log("  до наведения:", JSON.stringify(cardBefore));
check(cardBefore.счётчик === "1 / 15", "счётчик на обложке показывает первый кадр");
check(cardBefore.стрелкиПрозрачны === "0", "без курсора стрелки не мешают обложке");

await page.hover("#flamingo .halls-card-frame");
await page.waitForTimeout(350);
const shown = await page.evaluate(
  () => getComputedStyle(document.querySelector("#flamingo .halls-card-nav")).opacity,
);
check(shown === "1", `под курсором стрелки проступают (${shown})`);

await page.click("#flamingo .halls-card-next");
await page.waitForTimeout(400);
const cardAfter = await page.evaluate(() => {
  const c = document.querySelector("#flamingo");
  return {
    кадр: c.querySelector(".halls-card-img").getAttribute("src"),
    счётчик: c.querySelector(".halls-card-count").textContent,
    окно: document.querySelector("dialog.halls-viewer").open,
  };
});
console.log("  после стрелки:", JSON.stringify(cardAfter));
check(cardAfter.счётчик === "2 / 15" && cardAfter.кадр !== cardBefore.кадр, "кадр листается на месте");
check(!cardAfter.окно, "листание в карточке не открывает окно");
check(cardAfter.кадр.includes("thumb-"), "в карточке кадры карточного размера, не полноразмерные");

/*
  Отскок при нажатии. У стрелки в translate стоит вертикальное центрирование,
  и правило :active однажды его затирало — кнопка прыгала вниз на пол-своей
  высоты и уходила из-под курсора.
*/
const nav = await page.evaluate(() => {
  const a = document.querySelector("#flamingo .halls-card-next");
  const r = a.getBoundingClientRect();
  return { центр: getComputedStyle(a).translate, y: r.y + r.height / 2, x: r.x + r.width / 2 };
});
await page.mouse.move(nav.x, nav.y);
await page.mouse.down();
await page.waitForTimeout(200);
const pressedY = await page.evaluate(() => {
  const r = document.querySelector("#flamingo .halls-card-next").getBoundingClientRect();
  return r.y + r.height / 2;
});
await page.mouse.up();
await page.waitForTimeout(200);
const bounce = Math.abs(pressedY - nav.y);
console.log(`  отскок стрелки при нажатии: ${bounce.toFixed(1)}px (в покое translate ${nav.центр})`);
check(bounce < 4, `отскок в пределах пары пикселей, а не на пол-кнопки (${bounce.toFixed(1)}px)`);
check(nav.центр.includes("-50%"), "центрирование стрелки не потеряно");

/* Соседние кадры подгружены заранее — иначе листание упирается в сеть. */
const preloaded = await page.evaluate(
  () => document.querySelectorAll("#flamingo .halls-card-preload img").length,
);
check(preloaded === 2, `соседние кадры подгружаются заранее (${preloaded})`);

/* Соседние карточки листаются независимо. */
const neighbour = await page.evaluate(
  () => document.querySelector("#white .halls-card-count").textContent,
);
check(neighbour === "1 / 15", "соседняя карточка осталась на своём кадре");

// ── бронь зала ────────────────────────────────────────────────
console.log("\nбронь зала:");
await page.click("#flamingo .halls-card-book");
await page.waitForTimeout(1600);
await settle();
const booked = await page.evaluate(() => ({
  адрес: location.pathname + location.hash,
  зал: document.querySelector("#hall")?.value,
  сохранено: sessionStorage.getItem("mywish:hall"),
}));
console.log("  после «Забронировать»:", JSON.stringify(booked));
check(booked.адрес === "/#packages", "переносит на выбор пакета — следующий шаг");
check(booked.зал === "Фламинго", "выбранный зал уже стоит в форме");
check(booked.сохранено === "Фламинго", "выбор переживёт и перезагрузку страницы");

/* И тот же выбор поднимается после полной перезагрузки. */
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.waitForTimeout(1200);
const restored = await page.evaluate(() => document.querySelector("#hall")?.value);
console.log("  после перезагрузки главной в форме:", restored);
check(restored === "Фламинго", "после перезагрузки зал остаётся выбранным");

// ── просмотр фотографий ───────────────────────────────────────
console.log("\nпросмотр фотографий:");
await page.goto("http://localhost:3000/halls", { waitUntil: "load" });
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector("#flamingo .halls-card-open").click());
await page.waitForTimeout(600);

const opened = await page.evaluate(() => {
  const d = document.querySelector("dialog.halls-viewer");
  return {
    открыт: d.open,
    зал: d.querySelector(".halls-viewer-title")?.textContent,
    кадр: d.querySelector(".halls-viewer-img")?.getAttribute("src"),
    кнопка: d.querySelector(".halls-viewer-book")?.textContent.trim(),
    цветНазвания: getComputedStyle(d.querySelector(".halls-viewer-title")).color,
    карта: d.querySelector(".halls-viewer-sub a")?.getAttribute("href"),
  };
});
console.log("  открыт:", JSON.stringify(opened));
check(opened.открыт, "окно открылось");
check(opened.зал === "Фламинго", "показан нужный зал");
check(opened.кнопка === "Выбрать этот зал", "внизу окна кнопка выбора зала");
check(opened.цветНазвания === "rgb(219, 64, 79)", "название зала акцентное (" + opened.цветНазвания + ")");
check(opened.карта === LOCATIONS[0].map, "в шапке окна ссылка на карточку площадки");

await page.click(".halls-viewer-next");
await page.waitForTimeout(400);
const next = await page.evaluate(() => ({
  кнопка: document.querySelector(".halls-viewer-book")?.textContent.trim(),
  кадр: document.querySelector(".halls-viewer-img").getAttribute("src"),
}));
console.log("  после стрелки вправо:", JSON.stringify(next));
check(next.кадр !== opened.кадр, "стрелка листает вперёд");

await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(400);
const кадр = () =>
  page.evaluate(() => document.querySelector(".halls-viewer-img").getAttribute("src"));
const back = await кадр();
console.log("  после стрелки влево с клавиатуры:", back);
check(back.endsWith("/01.webp"), "клавиатура листает назад");

await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(400);
const wrap = await кадр();
console.log("  с первого кадра назад:", wrap);
check(wrap.endsWith("/15.webp"), "с первого кадра назад попадаем на последний");

/*
  Листание половинами кадра: правая — вперёд, левая — назад. Целимся в
  середину половины, как это делает и человек.
*/
const рамка = await page.evaluate(() => {
  const r = document.querySelector(".halls-viewer-img").getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await page.mouse.click(рамка.x + рамка.w * 0.75, рамка.y + рамка.h / 2);
await page.waitForTimeout(450);
const половинаВперёд = await кадр();
await page.mouse.click(рамка.x + рамка.w * 0.25, рамка.y + рамка.h / 2);
await page.waitForTimeout(450);
const половинаНазад = await кадр();
console.log("  правая половина →", половинаВперёд, "| левая →", половинаНазад);
check(половинаВперёд.endsWith("/01.webp"), "правая половина кадра листает вперёд");
check(половинаНазад.endsWith("/15.webp"), "левая половина кадра листает назад");

// ── схемы залов ───────────────────────────────────────────────
console.log("\nсхемы залов:");
const modes = await page.evaluate(() =>
  [...document.querySelectorAll(".halls-viewer-mode")].map((b) => b.textContent.trim()),
);
console.log("  переключатель:", modes.join(" | "));
check(modes.length === 2, "в просмотре два режима — фото и схема");

await page.evaluate(() => {
  const b = [...document.querySelectorAll(".halls-viewer-mode")].find((x) => x.textContent.includes("Схема"));
  b.click();
});
await page.waitForTimeout(500);
const plan = await page.evaluate(() => ({
  кадр: document.querySelector(".halls-viewer-img").getAttribute("src"),
  стрелкиСкрыты: [...document.querySelectorAll(".halls-viewer-arrow")].every((a) => a.hidden),
  подложка: getComputedStyle(document.querySelector(".halls-viewer-img")).backgroundColor,
  загружен: (() => { const i = document.querySelector(".halls-viewer-img"); return i.complete && i.naturalWidth > 0; })(),
}));
/*
  Схема не должна растягиваться: браузер выводит её на 980 CSS px, а на плотном
  экране это вдвое больше настоящих пикселей. Пока сюда клали готовую копию
  1536, картинку растягивало, и жёсткий край силуэта лез наружу лесенкой.
*/
const planScale = await page.evaluate(() => {
  const i = document.querySelector(".halls-viewer-img");
  return {
    свой: i.naturalWidth,
    наЭкране: Math.round(i.getBoundingClientRect().width),
    нужноНа2х: Math.round(i.getBoundingClientRect().width * 2),
  };
});
console.log("  размеры схемы:", JSON.stringify(planScale));
check(
  planScale.свой >= planScale.нужноНа2х,
  `схема не растягивается: ${planScale.свой} против ${planScale.нужноНа2х} нужных на плотном экране`,
);

console.log("  режим схемы:", JSON.stringify(plan));
check(plan.кадр === "/halls/flamingo/plan-1.webp", "показана схема этого зала");
check(plan.кадр.includes("plan-"), "показана схема, а не фотография");
check(plan.стрелкиСкрыты, "у зала с одной схемой стрелки убраны");
check(plan.подложка === "rgb(252, 225, 227)", "под схемой светлая подложка — она с прозрачным фоном");
check(plan.загружен, "файл схемы отдался");

await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// у «Вайта» схем две — там стрелки нужны
await page.evaluate(() => document.querySelector("#white .halls-card-open").click());
await page.waitForTimeout(500);
await page.evaluate(() => {
  const b = [...document.querySelectorAll(".halls-viewer-mode")].find((x) => x.textContent.includes("Схема"));
  b.click();
});
await page.waitForTimeout(500);
const twoPlans = await page.evaluate(() => ({
  кадр: document.querySelector(".halls-viewer-img").getAttribute("src"),
  стрелкиВидны: [...document.querySelectorAll(".halls-viewer-arrow")].every((a) => !a.hidden),
}));
console.log("  «Вайт», у него две схемы:", JSON.stringify(twoPlans));
check(twoPlans.кадр.includes("plan-1"), "показана первая схема зала");
check(twoPlans.стрелкиВидны, "у зала с двумя схемами стрелки на месте");

await page.keyboard.press("Escape");
await page.waitForTimeout(500);
const closed = await page.evaluate(() => !document.querySelector("dialog.halls-viewer").open);
check(closed, "Escape закрывает просмотр");

// ── переход по якорю с главной ────────────────────────────────
console.log("\nпереход по якорю:");
await page.goto("http://localhost:3000/halls#kachalova-8", { waitUntil: "load" });
await page.waitForTimeout(1200);
await settle();
const anchored = await page.evaluate(() => Math.round(document.querySelector("#kachalova-8").getBoundingClientRect().top));
console.log(`  верх площадки «Профессора Качалова, 8И» на ${anchored}px от верха окна`);
check(anchored > 60 && anchored < 220, "площадка встала под шапкой, а не под ней");

console.log("\nошибки консоли:", errors.length ? errors : "нет");
console.log("не отдалось сервером:", missing.length ? missing.slice(0, 5) : "нет");
if (errors.length || missing.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

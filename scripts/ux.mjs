// Отклик на наведение и появление блоков при прокрутке.
//
// Гоняем в режиме заказчика — «уменьшить анимацию» включено.
// node scripts/ux.mjs
import { chromium } from "playwright";

let bad = 0;
const check = (cond, text) => {
  if (!cond) bad++;
  console.log(`  ${cond ? "ok  " : "ПЛОХО"} ${text}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const errors = [];
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
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(900);

// ── появление при прокрутке ───────────────────────────────────
console.log("появление блоков при прокрутке:");
const marked = await page.evaluate(() => document.querySelectorAll("[data-reveal]").length);
check(marked > 20, `размечено блоков: ${marked}`);

const dialogs = await page.evaluate(
  () => [...document.querySelectorAll("dialog")].filter((d) => d.hasAttribute("data-reveal")).length,
);
check(dialogs === 0, `модалки документов не размечены (${dialogs})`);

// прокручиваем всю страницу и смотрим, не остался ли кто спрятанным
await page.evaluate(async () => {
  const step = window.innerHeight * 0.7;
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 90));
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
});
/* Ждём с запасом: последняя ступень лестницы — 350мс задержки плюс 640мс хода. */
await page.waitForTimeout(2200);
const hidden = await page.evaluate(() =>
  [...document.querySelectorAll("[data-reveal]")]
    .filter((el) => !el.hasAttribute("data-revealed"))
    .map((el) => `${el.tagName}.${el.className}`.slice(0, 50)),
);
check(hidden.length === 0, `после прокрутки спрятанных блоков не осталось${hidden.length ? ": " + hidden.slice(0, 4).join(" | ") : ""}`);

const dur = await page.evaluate(() => {
  const el = document.querySelector("[data-reveal][data-revealed]");
  return getComputedStyle(el).animationDuration;
});
check(dur === "0.64s", `при сниженной анимации появление остаётся плавным (${dur})`);

const opaque = await page.evaluate(() =>
  [...document.querySelectorAll("[data-reveal]")].every((el) => Number(getComputedStyle(el).opacity) === 1),
);
check(opaque, "все показанные блоки полностью непрозрачны");

// ── ссылки в карточках пакетов ────────────────────────────────
console.log("\nссылки в карточках пакетов:");
const links = await page.evaluate(() =>
  [...document.querySelectorAll("#packages .u-package-link")].map((a) => ({
    t: a.textContent.trim(),
    href: a.getAttribute("href"),
  })),
);
for (const l of links) console.log(`  ${l.t} → ${l.href}`);
check(links.length === 6, `по две ссылки в каждой из трёх карточек (${links.length})`);
check(links.filter((l) => l.href === "#reels").length === 3, "«Reels» уводит в свою секцию во всех трёх");
check(links.filter((l) => l.href === "#manager").length === 3, "«Личный менеджер» уводит в свою секцию во всех трёх");

const linkBefore = await page.evaluate(() => {
  const a = document.querySelector("#packages .u-package-link");
  const icon = a.querySelector(".u-package-link-icon");
  return {
    прозрачность: getComputedStyle(a).opacity,
    значок: getComputedStyle(icon).backgroundColor,
    длительность: getComputedStyle(a).transitionDuration,
  };
});
await page.hover("#packages .u-package-link");
await page.waitForTimeout(320);
const linkAfter = await page.evaluate(() => {
  const a = document.querySelector("#packages .u-package-link");
  const icon = a.querySelector(".u-package-link-icon");
  return {
    прозрачность: getComputedStyle(a).opacity,
    значок: getComputedStyle(icon).backgroundColor,
    подъём: getComputedStyle(icon).transform,
  };
});
console.log(`  прозрачность: ${linkBefore.прозрачность} → ${linkAfter.прозрачность}`);
console.log(`  подложка значка: ${linkBefore.значок} → ${linkAfter.значок}`);
check(linkBefore.прозрачность !== linkAfter.прозрачность, "ссылка отзывается на курсор");
check(linkBefore.значок !== linkAfter.значок, "значок перехода тоже отзывается");
/*
  Проверка на грабли: класс ссылки однажды переименовали, а в списке
  исключений prefers-reduced-motion остался старый — отклик превратился
  в щелчок (1e-05s), и заметить это на глаз нельзя.
*/
check(
  parseFloat(linkBefore.длительность) > 0.05,
  `переход плавный при сниженной анимации (${linkBefore.длительность})`,
);

// ── отклик управления ─────────────────────────────────────────
console.log("\nотклик управления:");
await page.evaluate(() => document.querySelector("#price").scrollIntoView({ block: "center" }));
await page.waitForTimeout(600);

/*
  Прокрутка теперь плавная, и scrollIntoView доезжает не мгновенно. Если
  навести курсор раньше, чем страница встанет, элемент уедет из-под него —
  и отклик померится наполовину или не померится вовсе. Ждём остановки.
*/
const settle = async () => {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) return;
    last = y;
    await page.waitForTimeout(80);
  }
};

const read = (sel, keys) =>
  page.evaluate(
    ([s, k]) => {
      const el = document.querySelector(s);
      const cs = getComputedStyle(el);
      return Object.fromEntries(k.map((p) => [p, cs[p]]));
    },
    [sel, keys],
  );

const probe = async (sel, label, keys) => {
  await settle();
  const before = await read(sel, keys);
  await page.hover(sel);
  await page.waitForTimeout(340);
  const after = await read(sel, keys);
  const changed = keys.filter((k) => before[k] !== after[k]);
  console.log(`  ${label}: изменилось ${changed.length ? changed.join(", ") : "НИЧЕГО"}`);
  for (const k of changed) console.log(`      ${k}: ${before[k]} → ${after[k]}`);
  return changed;
};

const arrow = await probe('#price [aria-label="Следующий месяц"]', "стрелка месяца", [
  "backgroundColor", "borderColor", "color", "scale", "boxShadow",
]);
check(arrow.includes("backgroundColor") && arrow.length >= 3, "у стрелки месяца появилась заметная отдача");

const day = await probe('#price .u-day:not([disabled]):not([aria-pressed="true"])', "день календаря", [
  "backgroundColor", "borderColor", "translate", "boxShadow",
]);
check(day.includes("translate") && day.includes("borderColor"), "день поднимается и получает акцентную обводку");

const opt = await probe('#price [data-node-id="914:1777"] .u-option:not([aria-pressed="true"])', "выбор пакета", [
  "backgroundColor", "borderColor", "translate", "boxShadow",
]);
check(opt.includes("translate"), "переключатель пакета поднимается под курсором");

const hrs = await probe('#price [data-node-id="914:1761"] .u-option:not([aria-pressed="true"])', "выбор часов", [
  "backgroundColor", "borderColor", "translate", "boxShadow",
]);
check(hrs.includes("translate"), "переключатель часов поднимается под курсором");

// ── вопросы ───────────────────────────────────────────────────
console.log("\nвопросы:");
await page.evaluate(() => document.querySelector("#faq").scrollIntoView({ block: "center" }));
await page.waitForTimeout(600);
const faq = await probe('#faq details[data-open="false"]', "плашка вопроса", [
  "backgroundColor", "translate", "boxShadow",
]);
check(faq.length >= 3, "у вопроса меняются подложка, подъём и тень");

const faqInner = await page.evaluate(() => {
  const d = document.querySelector('#faq details[data-open="false"]:hover');
  if (!d) return null;
  return {
    значок: getComputedStyle(d.querySelector(".u-faq-mark")).backgroundColor,
    масштаб: getComputedStyle(d.querySelector(".u-faq-mark")).scale,
    вопрос: getComputedStyle(d.querySelector(".u-faq-question")).color,
  };
});
console.log("  значок и текст:", JSON.stringify(faqInner));
check(faqInner !== null && faqInner.значок === "rgb(219, 64, 79)", "плюсик заливается акцентом");
check(faqInner !== null && faqInner.вопрос === "rgb(219, 64, 79)", "текст вопроса уходит в акцент");

// ── стык первого экрана ───────────────────────────────────────
console.log("\nстык первого экрана:");
const seam = await page.evaluate(() => {
  const el = document.querySelector(".hero-seam");
  if (!el) return null;
  const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
  const r = el.getBoundingClientRect();
  return {
    высотаМакет: Math.round(r.height / scale),
    градиент: getComputedStyle(el).backgroundImage.slice(0, 48),
  };
});
console.log("  ", JSON.stringify(seam));
check(seam !== null, "полоса растворения на месте");
check(seam !== null && seam.градиент.includes("gradient"), "это градиент, а не заливка");

console.log("\nошибки консоли:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

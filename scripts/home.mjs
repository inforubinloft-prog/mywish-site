/*
  Возврат на первый экран и сброс выбранного зала.

  Логотип — ссылка в обеих шапках, статической и плавающей: до этого нажать
  на него можно было ровно в одной точке сайта. На главной он не переходит,
  а прокручивает наверх — иначе перезагрузка сбрасывала бы выбранный зал.

  Зал: повторное нажатие снимает выбор, перезагрузка его сбрасывает, а
  переход со страницы залов — по-прежнему доносит.
*/
import { chromium } from "playwright";
let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };
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
const settle = async () => { let l = -1; for (let i = 0; i < 40; i++) { const y = await page.evaluate(() => Math.round(window.scrollY)); if (y === l) return; l = y; await page.waitForTimeout(80); } };

await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

console.log("логотип в статической шапке:");
const stat = await page.evaluate(() => {
  const a = document.querySelector(".hero-static-header .site-header-home");
  return { есть: !!a, href: a?.getAttribute("href"), метка: a?.getAttribute("aria-label") };
});
console.log("  ", JSON.stringify(stat));
check(stat.есть && stat.href === "/", "знак — ссылка");

console.log("\nлоготип в плавающей шапке:");
/* Уводим вниз, потом вверх — так появляется плавающая шапка. */
await page.evaluate(() => window.scrollTo(0, 5200));
await settle();
await page.evaluate(() => window.scrollBy(0, -400));
await settle();
await page.waitForTimeout(500);
const float = await page.evaluate(() => {
  const h = document.querySelector(".floating-site-header");
  const a = h.querySelector(".site-header-home");
  return { видна: h.dataset.visible, ссылка: !!a, href: a?.getAttribute("href") };
});
console.log("  ", JSON.stringify(float));
check(float.видна === "true", "плавающая шапка на экране");
check(float.ссылка && float.href === "/", "и здесь знак — ссылка");

const наведение = await page.evaluate(() => {
  const a = document.querySelector(".floating-site-header .site-header-home");
  return getComputedStyle(a, "::after").opacity;
});
await page.hover(".floating-site-header .site-header-home");
await page.waitForTimeout(500);
const после = await page.evaluate(() => {
  const a = document.querySelector(".floating-site-header .site-header-home");
  const cs = getComputedStyle(a);
  const слой = getComputedStyle(a, "::after");
  return { слой: слой.opacity, цвет: слой.backgroundColor, маска: слой.maskImage, подъём: cs.translate };
});
console.log("  слой цвета:", наведение, "→ непрозрачность", после.слой, "цвет", после.цвет, "подъём", после.подъём);
check(наведение === "0" && после.слой === "1", "под курсором знак перекрашивается");
check(после.цвет === "rgb(219, 64, 79)", `цвет фирменный (${после.цвет})`);
check(после.маска.includes("logo.webp"), "красный вырезан по силуэту знака");
check(после.подъём !== "none" && после.подъём !== "0px", `знак приподнимается (${после.подъём})`);

console.log("\nвозврат на первый экран:");
await page.click(".floating-site-header .site-header-home");
await page.waitForTimeout(1200);
await settle();
const верх = await page.evaluate(() => ({ y: Math.round(window.scrollY), адрес: location.pathname + location.hash }));
console.log("  ", JSON.stringify(верх));
check(верх.y === 0, `вернулись наверх (${верх.y})`);
check(верх.адрес === "/", "адрес остался главной, без перезагрузки");

console.log("\nвыбор зала:");
await page.evaluate(() => document.querySelector("#halls").scrollIntoView({ block: "center" }));
await settle();
await page.waitForTimeout(400);
const кнопкаДальше = await page.locator(".halls-action-next").count();
check(кнопкаДальше === 0, `плашки «Дальше: пакет» больше нет (${кнопкаДальше})`);
const центр = await page.evaluate(() => {
  const r = document.querySelector(".halls-action-all").getBoundingClientRect();
  const s = document.querySelector(".halls-actions").getBoundingClientRect();
  return Math.round(r.x + r.width / 2 - (s.x + s.width / 2));
});
check(Math.abs(центр) <= 1, `кнопка «Все залы» по центру полосы (смещение ${центр})`);

await page.locator('[data-hall-option="black"]').evaluate((el) => el.click());
await page.waitForTimeout(300);
const выбран = await page.evaluate(() => ({
  нажат: document.querySelector('[data-hall-option="black"]').getAttribute("aria-pressed"),
  подпись: document.querySelector("#halls-instruction").textContent.slice(0, 40),
  вХранилище: sessionStorage.getItem("mywish:hall"),
}));
console.log("  после выбора:", JSON.stringify(выбран));
check(выбран.нажат === "true", "зал выбран");

await page.locator('[data-hall-option="black"]').evaluate((el) => el.click());
await page.waitForTimeout(300);
const снят = await page.evaluate(() => ({
  нажат: document.querySelector('[data-hall-option="black"]').getAttribute("aria-pressed"),
  вХранилище: sessionStorage.getItem("mywish:hall"),
}));
console.log("  после повторного нажатия:", JSON.stringify(снят));
check(снят.нажат === "false", "повторное нажатие снимает выбор");
check(снят.вХранилище === null, "и вычищает хранилище");

console.log("\nсброс при перезагрузке:");
await page.locator('[data-hall-option="white"]').evaluate((el) => el.click());
await page.waitForTimeout(300);
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(1200);
const послеF5 = await page.evaluate(() => ({
  нажатых: document.querySelectorAll('[data-hall-option][aria-pressed="true"]').length,
  вХранилище: sessionStorage.getItem("mywish:hall"),
  вФорме: document.querySelector("#hall")?.value,
}));
console.log("  ", JSON.stringify(послеF5));
check(послеF5.нажатых === 0, "после F5 выбор сброшен");
check(послеF5.вХранилище === null, "хранилище пусто");

console.log("\nпереход со страницы залов выбор доносит:");
await page.goto("http://localhost:3000/halls", { waitUntil: "load" });
await page.waitForTimeout(800);
await page.evaluate(() => sessionStorage.setItem("mywish:hall", "Блэк"));
await page.click(".hero-static-header .site-header-home");
await page.waitForTimeout(1500);
const донесли = await page.evaluate(() => ({
  адрес: location.pathname,
  зал: document.querySelector("#hall")?.value,
  вХранилище: sessionStorage.getItem("mywish:hall"),
}));
console.log("  ", JSON.stringify(донесли));
check(донесли.адрес === "/", "со страницы залов знак ведёт на главную");
check(донесли.зал === "Блэк", `зал доехал до формы (${донесли.зал})`);

console.log("\nошибки консоли:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

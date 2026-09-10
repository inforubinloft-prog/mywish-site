/*
  Подсказки под заголовками четырёх шагов: зал, пакет, дата, заявка.

  Приём один: пока курсор ни на чём — правило целиком, под курсором — факт
  про то, на что навели, и что случится по нажатию. Сделанный выбор подсказка
  не повторяет: он виден на самом объекте.

  Проверяем каждый шаг: покой, наведение, возврат в покой и то, что строка
  помещается в одну строку без обрезки.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: "reduce" });
const errors = [];
const своя = (m) => { const u = m.location?.()?.url ?? ""; return !u || u.includes("localhost:3000"); };
page.on("console", (m) => m.type() === "error" && своя(m) && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e.message)));

await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1800);

const подсказка = (selector) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    return {
      текст: el.textContent.trim(),
      наведение: el.dataset.active,
      влезает: el.scrollWidth <= el.clientWidth + 1,
      цвет: getComputedStyle(el).color,
    };
  }, selector);

const шаг = async (имя, selector, наведи, ожидание) => {
  console.log(`\n${имя}:`);
  await page.mouse.move(10, 10);
  await page.waitForTimeout(400);
  const покой = await подсказка(selector);
  console.log("  покой:     ", покой.текст.slice(0, 78));
  check(покой.наведение === "false", "в покое подсказка обычная");
  check(покой.влезает, "строка покоя помещается целиком");

  await наведи();
  await page.waitForTimeout(500);
  const наведение = await подсказка(selector);
  console.log("  наведение: ", наведение.текст.slice(0, 78));
  check(наведение.наведение === "true", "под курсором подсказка сменилась");
  check(наведение.цвет === "rgb(219, 64, 79)", `и стала акцентной (${наведение.цвет})`);
  check(наведение.влезает, "строка наведения помещается целиком");
  for (const кусок of ожидание) {
    check(наведение.текст.includes(кусок), `в подсказке есть «${кусок}»`);
  }

  await page.mouse.move(10, 10);
  await page.waitForTimeout(500);
  check((await подсказка(selector)).наведение === "false", "курсор ушёл — подсказка вернулась");
};

await page.evaluate(() => document.querySelector("#halls").scrollIntoView({ block: "center" }));
await page.waitForTimeout(1400);
await шаг("зал", "#halls-instruction", async () => {
  const т = await page.evaluate(() => {
    const el = document.querySelector('[data-hall-option="black"]');
    const r = el.getBoundingClientRect();
    const nums = [...getComputedStyle(el).clipPath.matchAll(/([\d.]+)%\s+([\d.]+)%/g)].map((m) => [+m[1], +m[2]]);
    const cx = nums.reduce((a, p) => a + p[0], 0) / nums.length;
    const cy = nums.reduce((a, p) => a + p[1], 0) / nums.length;
    return { x: r.x + (r.width * cx) / 100, y: r.y + (r.height * cy) / 100 };
  });
  await page.mouse.move(т.x, т.y);
}, ["Блэк", "нажми"]);

await page.evaluate(() => document.querySelector("#packages").scrollIntoView({ block: "center" }));
await page.waitForTimeout(1000);
await шаг("пакет", '#packages [data-node-id="914:1309"]', async () => {
  await page.hover('.u-package-card[data-package="extra"]');
}, ["«Экстра»", "32 500 ₽", "аренда зала", "нажми, чтобы выбрать"]);

await page.evaluate(() => document.querySelector("#price").scrollIntoView({ block: "center" }));
await page.waitForTimeout(1000);
await шаг("дата", '#price [data-node-id="914:1561"]', async () => {
  await page.locator(".u-day:not(:disabled)").nth(3).hover();
}, ["/час", "ч —"]);

await page.evaluate(() => document.querySelector("#contact").scrollIntoView({ block: "center" }));
await page.waitForTimeout(1000);
await шаг("заявка (пустая форма)", '#contact [data-node-id="914:1801"]', async () => {
  await page.hover('#contact button[type="submit"]');
}, ["Не хватает", "имени", "телефона", "согласия"]);

console.log("\nзаявка, когда всё заполнено:");
await page.fill("#name", "Анна");
await page.fill("#phone", "9998887766");
await page.click("#consent");
await page.hover('#contact button[type="submit"]');
await page.waitForTimeout(500);
const готово = await подсказка('#contact [data-node-id="914:1801"]');
console.log("  ", готово.текст.slice(0, 90));
check(готово.текст.startsWith("В заявке:"), "подсказка показывает состав заявки");
check(готово.текст.includes("₽"), "и итоговую сумму");
/*
  Незаполненное в перечисление не попадает: заглушка вроде «зал подберём»
  стояла в одном ряду с настоящими пунктами и читалась как ещё один выбор.
  То, чего не хватает, идёт отдельной фразой в конце.
*/
check(
  !готово.текст.includes("· зал подберём"),
  "невыбранное не стоит в перечислении",
);
check(
  /Зал подберём вместе$/.test(готово.текст) || готово.текст.trim().endsWith("₽"),
  "про невыбранный зал сказано отдельной фразой",
);
check(готово.влезает, "строка помещается целиком");

console.log("\nошибки консоли:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

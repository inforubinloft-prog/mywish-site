/** Проверка калькулятора в секции «6. дата и цена» и базовой доступности. */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.waitForTimeout(800);

const total = () => page.locator('[data-node-id="874:666"] p.font-display').innerText();
const summary = () => page.locator('[data-node-id="874:666"] div.text-right').innerText();

const rows = [];
rows.push(["стартовое состояние (макет)", await total(), (await summary()).replace(/\n/g, " | ")]);

// 22 августа — суббота, 4 900 ₽/час
await page.getByRole("button", { name: /^22 август/ }).click();
await page.waitForTimeout(80);
rows.push(["выбрали 22 августа (сб)", await total(), (await summary()).replace(/\n/g, " | ")]);

await page.getByRole("button", { name: "6 ч" }).click();
await page.waitForTimeout(80);
rows.push(["выбрали 6 часов", await total(), (await summary()).replace(/\n/g, " | ")]);

await page.getByText("Хэппи", { exact: true }).click();
await page.waitForTimeout(80);
rows.push(["выбрали пакет «Хэппи»", await total(), (await summary()).replace(/\n/g, " | ")]);

// перелистывание месяца
await page.getByRole("button", { name: "Следующий месяц" }).click();
await page.waitForTimeout(80);
const month = await page.locator('[data-node-id="874:477"] p[aria-live]').innerText();
rows.push(["следующий месяц", month, ""]);
await page.getByRole("button", { name: "Предыдущий месяц" }).click();
await page.waitForTimeout(80);

// клавиатура: первый Tab должен попадать на логотип
await page.keyboard.press("Tab");
const firstFocus = await page.evaluate(() => {
  const a = document.activeElement;
  return `${a.tagName} ${a.getAttribute("aria-label") || a.textContent?.trim().slice(0, 30)}`;
});

// заблокированные дни не кликаются
const disabledCount = await page.locator('[data-node-id="874:477"] button[disabled]').count();

// семантика и alt
const a11y = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll("img")];
  return {
    h1: document.querySelectorAll("h1").length,
    h2: document.querySelectorAll("h2").length,
    imgsTotal: imgs.length,
    imgsNoAlt: imgs.filter((i) => i.getAttribute("alt") === null).length,
    decorative: imgs.filter((i) => i.getAttribute("alt") === "").length,
    landmarks: ["header", "nav", "main", "section", "footer"].map((t) => `${t}:${document.querySelectorAll(t).length}`).join(" "),
    divButtons: [...document.querySelectorAll("div[onclick]")].length,
  };
});

console.log("=== КАЛЬКУЛЯТОР ===");
for (const [what, value, detail] of rows) console.log(` ${what.padEnd(30)} ${value}   ${detail}`);
console.log(`\nЗаблокированных дней в августе 2026: ${disabledCount} (в макете 16: с 1 по 16)`);
console.log(`Первый Tab: ${firstFocus}`);
console.log("\n=== СЕМАНТИКА ===");
console.log(JSON.stringify(a11y, null, 1));

await browser.close();

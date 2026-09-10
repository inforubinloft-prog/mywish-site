// Маска ника и список гостей.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.locator("#contact").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

for (const [input, title] of [
  ["lada_mywish", "обычный ник"],
  ["@lada", "уже с собачкой"],
  ["@@lada@wish", "несколько собачек"],
  ["lada wish 2026", "с пробелами"],
  ["  ", "только пробелы"],
  ["лада", "кириллица"],
  ["Лада_Wish2026", "кириллица вперемешку"],
  ["lada.my-wish!", "точки, дефисы, знаки"],
]) {
  await page.fill("#messenger", "");
  await page.type("#messenger", input, { delay: 5 });
  console.log(`${title.padEnd(20)} «${input}» → «${await page.inputValue("#messenger")}»`);
}
await page.fill("#messenger", "@lada");
for (let i = 0; i < 4; i++) await page.press("#messenger", "Backspace");
console.log("после четырёх Backspace:".padEnd(21), `«${await page.inputValue("#messenger")}»`);

const guests = await page.$$eval("#guests option", (o) => o.map((x) => x.textContent));
console.log("\nгости:", guests.join(" | "));
await page.selectOption("#guests", { index: 3 });
console.log("выбрали третий вариант:", await page.inputValue("#guests"));
await browser.close();

// Проверка: после появления левого блока шапка остаётся кликабельной.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.waitForTimeout(10000); // ждём весь сценарий

const targets = [
  ['логотип', "#hero img[alt*='MyWish']"],
  ["меню — Залы", "#hero nav a:nth-child(2)"],
  ["меню — Цены", "#hero nav a:nth-child(4)"],
  ["Telegram", "#hero a[aria-label*='Telegram']"],
  ["MAX", "#hero a[aria-label*='MAX']"],
  ["CTA в шапке", "#hero .u-cta.size-full"],
  ["CTA слева", "#hero .u-cta.w-193"],
  ["Выбрать зал", "#hero .u-cta.w-136"],
];

for (const [name, sel] of targets) {
  const r = await page.evaluate((s) => {
    const el = document.querySelector(s);
    const b = el.getBoundingClientRect();
    const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return { сверху: top ? top.tagName + (top.className ? "." + String(top.className).split(" ")[0] : "") : "-", свой: el.contains(top) };
  }, sel);
  console.log(name.padEnd(14), r.свой ? "кликабелен" : "ПЕРЕКРЫТ → " + r.сверху);
}

// и наведение реально меняет вид
await page.locator("#hero nav a:nth-child(2)").hover();
await page.waitForTimeout(300);
const pill = await page.evaluate(() => getComputedStyle(document.querySelector("#hero nav a:nth-child(2) span[aria-hidden]")).opacity);
console.log("пилюля при наведении:", pill);
await browser.close();

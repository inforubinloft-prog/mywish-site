// Аккордеон: один открытый, переключение, отклик на наведение, запас до подвала.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.locator("#faq").scrollIntoViewIfNeeded();
await page.waitForTimeout(600);

const state = () => page.evaluate(() => {
  const d = [...document.querySelectorAll("#faq details")];
  return {
    открыт: d.findIndex((x) => x.open),
    открытых: d.filter((x) => x.open).length,
    высоты: d.map((x) => Math.round(x.getBoundingClientRect().height)),
  };
});

const s0 = await state();
console.log("старт:      открыт", s0.открыт, "| всего открытых", s0.открытых, "| высоты", s0.высоты.join(" "));

await page.locator("#faq details").nth(4).locator("summary").click();
await page.waitForTimeout(300);
const s1 = await state();
console.log("клик по 05: открыт", s1.открыт, "| всего открытых", s1.открытых, "| высоты", s1.высоты.join(" "));

await page.locator("#faq details").nth(4).locator("summary").click();
await page.waitForTimeout(300);
const s2 = await state();
console.log("повтор:     открыт", s2.открыт, "| всего открытых", s2.открытых);

// клик мимо значка — по тексту вопроса
await page.locator("#faq details").nth(1).locator("summary span").nth(1).click();
await page.waitForTimeout(300);
console.log("клик по тексту вопроса 02 → открыт", (await state()).открыт);

// наведение на закрытый
const mark = "#faq details:nth-of-type(4) .u-faq-mark";
const before = await page.evaluate((s) => { const e = document.querySelector(s); const c = getComputedStyle(e); return c.borderColor + " / " + c.color; }, mark);
await page.locator("#faq details").nth(3).hover();
await page.waitForTimeout(300);
const after = await page.evaluate((s) => { const e = document.querySelector(s); const c = getComputedStyle(e); return c.borderColor + " / " + c.color; }, mark);
console.log("значок при наведении:", before, "→", after);

const geo = await page.evaluate(() => {
  const list = document.querySelector("#faq details").parentElement.getBoundingClientRect();
  const sec = document.querySelector("#faq").getBoundingClientRect();
  const footer = document.querySelector("footer").getBoundingClientRect();
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
  return {
    списокМакет: Math.round(list.height / rem),
    секцияМакет: Math.round(sec.height / rem),
    доПодвала: Math.round((footer.top - list.bottom) / rem),
  };
});
console.log("список", geo.списокМакет, "| коробка секции", geo.секцияМакет, "| запас до подвала", geo.доПодвала);
await browser.close();

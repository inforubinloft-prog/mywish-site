import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

const read = async (sel, what) => {
  const el = page.locator(sel).first();
  const before = await el.evaluate((e) => {
    const s = getComputedStyle(e);
    return `${s.backgroundColor} / ${s.color}`;
  });
  await el.hover();
  await page.waitForTimeout(350);
  const after = await el.evaluate((e) => {
    const s = getComputedStyle(e);
    return `${s.backgroundColor} / ${s.color}`;
  });
  const pill = await el.evaluate((e) => {
    const p = e.querySelector("span[aria-hidden]");
    return p ? getComputedStyle(p).opacity : null;
  });
  console.log(what.padEnd(24), "покой:", before.padEnd(42), "наведение:", after, pill !== null ? `| пилюля opacity ${pill}` : "");
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
};

await read("#hero nav a", "меню — Залы");
await read("#hero .u-cta.w-133", "шапка СВЯЗАТЬСЯ");
await read("#hero .u-cta.w-193", "СВЯЗАТЬСЯ");
await read("#hero .u-cta.w-136", "Выбрать зал");

const logo = await page.locator("#hero a[aria-label*='главную'] img").evaluate((e) => e.currentSrc.split("/").pop() + " " + e.naturalWidth + "×" + e.naturalHeight);
console.log("логотип:", logo);

await page.screenshot({ path: "docs/shots/hero-now.png" });
await browser.close();

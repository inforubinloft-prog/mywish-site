// Обтравка персонажа: ставим его на контрастный фон прямо на странице.
import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const el = page.locator('[data-node-id="914:1211"]');
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.evaluate(() => {
  const img = document.querySelector('[data-node-id="914:1211"]');
  img.style.background = "repeating-conic-gradient(#0f0 0 25%, #060 0 50%) 0 0/16px 16px";
  img.style.zIndex = "50";
});
await page.waitForTimeout(200);
await el.screenshot({ path: out });
await browser.close();
console.log("→", out);

import { chromium } from "playwright";
const [, , out, steps] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const sec = page.locator('[data-section="price"]');
await sec.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
for (let i = 0; i < Number(steps); i++) { await page.click('#price button[aria-label="Следующий месяц"]'); await page.waitForTimeout(100); }
await page.waitForTimeout(300);
await sec.screenshot({ path: out });
await browser.close();
console.log("→", out);

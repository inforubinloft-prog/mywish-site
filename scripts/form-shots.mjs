import { chromium } from "playwright";
const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const form = page.locator('[data-node-id="914:1802"]');
await form.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await form.screenshot({ path: `${OUT}/form-1.png` });

await page.click('#contact button[type="submit"]');
await page.waitForTimeout(600);
await form.screenshot({ path: `${OUT}/form-invalid.png` });

await page.fill("#name", "Лада");
await page.type("#phone", "9161234567", { delay: 5 });
await page.selectOption("#hall", "Фламинго");
await page.selectOption("#guests", "24");
await page.hover('#contact button[type="submit"]');
await page.waitForTimeout(400);
await form.screenshot({ path: `${OUT}/form-filled.png` });
console.log("готово");
await browser.close();

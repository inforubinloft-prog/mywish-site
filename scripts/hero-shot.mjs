import { chromium } from "playwright";
const [, , out, w, h] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(9000); // ждём весь сценарий первого экрана
await page.screenshot({ path: out });
await browser.close();
console.log("→", out);

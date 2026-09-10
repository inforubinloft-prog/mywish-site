import { chromium } from "playwright";
const [, , out, w, h] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  const s = document.querySelector('[data-section="where"]');
  window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 20);
});
await page.waitForTimeout(7000);
const z = await page.evaluate(() => new URL(document.querySelector('[data-node-id="914:1905"] iframe').src).searchParams.get("z"));
console.log(`${w}×${h} → зум ${z}`);
await page.locator('[data-node-id="914:1905"]').screenshot({ path: out });
await browser.close();

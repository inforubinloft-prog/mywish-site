// Как выглядит «рекомендуем» до клика и «выбрано» после.
import { chromium } from "playwright";
const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const cards = page.locator('[data-node-id="914:1777"]');
await cards.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const clip = async (name) => {
  const a = await page.locator('[data-node-id="914:1777"]').boundingBox();
  const b = await page.locator('[data-node-id="914:1761"]').boundingBox();
  await page.screenshot({ path: `${OUT}/${name}`, clip: { x: a.x - 10, y: a.y - 10, width: a.width + 20, height: b.y + b.height - a.y + 20 } });
};
await clip("pick-before.png");
await page.locator('[data-node-id="914:1777"] button').nth(1).click();
await page.locator('[data-node-id="914:1761"] button').nth(1).click();
await page.waitForTimeout(300);
await clip("pick-after.png");
await browser.close();
console.log("готово");

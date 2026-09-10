// Карта: подставился ли виджет, какой зум и видны ли все три метки.
import { chromium } from "playwright";
const OUT = process.argv[2];
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [1920, 945], [2560, 1305]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const s = document.querySelector('[data-section="where"]');
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 20);
  });
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => {
    const f = document.querySelector('#where iframe');
    if (!f) return { есть: false };
    const b = f.getBoundingClientRect();
    const u = new URL(f.src);
    return { есть: true, размер: `${Math.round(b.width)}×${Math.round(b.height)}`, зум: u.searchParams.get("z"), точек: (u.searchParams.get("pt") || "").split("~").length, центр: u.searchParams.get("ll") };
  });
  console.log(`${w}×${h}`.padEnd(11), JSON.stringify(r));
  if (w === 1440) await page.locator("#where").screenshot({ path: `${OUT}/map.png` });
  await page.close();
}
await browser.close();

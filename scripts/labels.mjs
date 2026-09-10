// Совпадают ли подписи с метками: сравниваем позиции подписей с синими
// пинами, найденными на снимке карты.
import { chromium } from "playwright";
import sharp from "sharp";
const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  const s = document.querySelector('[data-section="where"]');
  window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 20);
});
await page.waitForTimeout(7000);

const info = await page.evaluate(() => {
  const wrap = document.querySelector('[data-node-id="914:1905"]');
  const wb = wrap.getBoundingClientRect();
  const labels = [...wrap.querySelectorAll(".u-map-label")].map((l) => {
    const b = l.getBoundingClientRect();
    return { текст: l.textContent, x: Math.round(b.left - wb.left), y: Math.round(b.top - wb.top) };
  });
  const f = wrap.querySelector("iframe");
  return { зум: new URL(f.src).searchParams.get("z"), размер: `${Math.round(wb.width)}×${Math.round(wb.height)}`, labels, box: { x: wb.x, y: wb.y, w: wb.width, h: wb.height } };
});

// снимок только карты, без подписей — ищем синие пины
await page.evaluate(() => document.querySelectorAll(".u-map-label").forEach((l) => (l.style.display = "none")));
await page.waitForTimeout(300);
const shot = await page.locator('[data-node-id="914:1905"]').screenshot();
const { data, info: im } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// цвет пина Яндекса — насыщенный синий
const hits = [];
for (let y = 0; y < im.height; y++)
  for (let x = 0; x < im.width; x++) {
    const i = (y * im.width + x) * 4;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (b > 150 && b - r > 70 && b - g > 50) hits.push([x, y]);
  }
// кластеризуем
const cl = [];
for (const [x, y] of hits) {
  const c = cl.find((c) => Math.abs(c.x / c.n - x) < 40 && Math.abs(c.y / c.n - y) < 50);
  if (c) { c.x += x; c.y += y; c.n++; c.maxY = Math.max(c.maxY, y); }
  else cl.push({ x, y, n: 1, maxY: y });
}
const pins = cl.filter((c) => c.n > 60).map((c) => ({ x: Math.round(c.x / c.n), низ: c.maxY })).sort((a, b) => a.x - b.x);
console.log("зум", info.зум, "| блок", info.размер);
console.log("метки найдены:", JSON.stringify(pins));
console.log("подписи:", JSON.stringify(info.labels));
await page.evaluate(() => document.querySelectorAll(".u-map-label").forEach((l) => (l.style.display = "")));
await page.waitForTimeout(200);
await page.locator('[data-node-id="914:1905"]').screenshot({ path: `${OUT}/map-labels.png` });
await browser.close();

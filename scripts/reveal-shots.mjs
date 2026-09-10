// Кадры раскрытия левого блока: ждём фазу 3 и снимаем каждые 300мс.
import { chromium } from "playwright";
import sharp from "sharp";
sharp.cache(false);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000", { waitUntil: "load" });

// ждём момент, когда группа получила data-shown
await page.waitForFunction(() => document.querySelectorAll(".hero-gate")[1]?.dataset.shown === "true", null, { timeout: 15000 });
const t0 = Date.now();

const files = [];
for (const at of [100, 250, 430, 620, 800, 950]) {
  const wait = at - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const f = `docs/shots/rv-${at}.png`;
  await page.screenshot({ path: f, clip: { x: 40, y: 250, width: 820, height: 420 } });
  files.push([f, `+${(at / 1000).toFixed(1)}с`]);
}
await browser.close();

const W = 440;
const bufs = [];
for (const [f] of files) bufs.push(await sharp(f).resize({ width: W }).toBuffer());
const h = (await sharp(bufs[0]).metadata()).height;
await sharp({
  create: { width: W * 2 + 30, height: (h + 10) * 3 + 10, channels: 3, background: { r: 240, g: 240, b: 240 } },
})
  .composite(bufs.map((b, i) => ({ input: b, left: 10 + (i % 2) * (W + 10), top: 10 + Math.floor(i / 2) * (h + 10) })))
  .png()
  .toFile("docs/shots/reveal.png");
console.log("кадры:", files.map(([, l]) => l).join(" · "));

import { chromium } from "playwright";
import sharp from "sharp";
sharp.cache(false);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.waitForFunction(() => document.querySelectorAll(".hero-gate")[0]?.dataset.shown === "true", null, { timeout: 8000 });
const t0 = Date.now();
const files = [];
for (const at of [60, 180, 320, 520]) {
  const w = at - (Date.now() - t0);
  if (w > 0) await page.waitForTimeout(w);
  const f = `docs/shots/dr-${at}.png`;
  await page.screenshot({ path: f, clip: { x: 100, y: 0, width: 1240, height: 130 } });
  files.push([f, `+${at}мс`]);
}
await browser.close();

const W = 880;
const bufs = [];
for (const [f] of files) bufs.push(await sharp(f).resize({ width: W }).toBuffer());
const h = (await sharp(bufs[0]).metadata()).height;
await sharp({ create: { width: W + 20, height: (h + 8) * bufs.length + 8, channels: 3, background: { r: 242, g: 242, b: 242 } } })
  .composite(bufs.map((b, i) => ({ input: b, left: 10, top: 8 + i * (h + 8) })))
  .png()
  .toFile("docs/shots/drop.png");
console.log("кадры:", files.map(([, l]) => l).join(" · "));

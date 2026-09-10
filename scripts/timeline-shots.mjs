import { chromium } from "playwright";
import sharp from "sharp";
sharp.cache(false);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const t0 = Date.now();
await page.goto("http://localhost:3000", { waitUntil: "load" });

const marks = [
  [300, "0.3с — затемнение"],
  [1600, "1.6с — чистое видео"],
  [3600, "3.6с — верхняя панель"],
  [9000, "9.0с — левый блок и вуаль"],
];
const files = [];
for (const [at, label] of marks) {
  const wait = at - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const f = `docs/shots/tl-${at}.png`;
  await page.screenshot({ path: f });
  files.push([f, label]);
  console.log(label);
}
await browser.close();

const W = 460;
const bufs = [];
for (const [f] of files) bufs.push(await sharp(f).resize({ width: W }).toBuffer());
const h = (await sharp(bufs[0]).metadata()).height;
await sharp({ create: { width: W * 2 + 30, height: (h + 10) * 2 + 10, channels: 3, background: { r: 245, g: 245, b: 245 } } })
  .composite(bufs.map((b, i) => ({ input: b, left: 10 + (i % 2) * (W + 10), top: 10 + Math.floor(i / 2) * (h + 10) })))
  .png()
  .toFile("docs/shots/timeline.png");
console.log("склейка готова");

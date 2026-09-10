import { chromium } from "playwright";
import sharp from "sharp";
sharp.cache(false);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => document.querySelectorAll("video").forEach((v) => { v.pause(); v.currentTime = 6; }));
await page.waitForTimeout(600);

const shot = async (name, clip, hoverSel) => {
  if (hoverSel) {
    await page.locator(hoverSel).first().hover();
    await page.waitForTimeout(350);
  } else {
    await page.mouse.move(700, 900);
    await page.waitForTimeout(350);
  }
  await page.screenshot({ path: `docs/shots/st-${name}.png`, clip });
};

const head = { x: 120, y: 25, width: 1210, height: 80 };
await shot("head-rest", head);
await shot("nav-1", head, "#hero nav a:nth-child(2)");
await shot("nav-3", head, "#hero nav a:nth-child(4)");
await shot("social", head, "#hero a[aria-label*='Telegram']");

const cta = { x: 120, y: 590, width: 400, height: 80 };
await shot("cta-rest", cta);
await shot("cta-hover", cta, "#hero .u-cta.w-193");

await browser.close();

// склейка
const rows = [
  ["head-rest", "покой"],
  ["nav-1", "наведение: Залы"],
  ["nav-3", "наведение: Цены"],
  ["social", "наведение: Telegram"],
];
const bufs = [];
for (const [f] of rows) bufs.push(await sharp(`docs/shots/st-${f}.png`).resize({ width: 900 }).toBuffer());
const h = (await sharp(bufs[0]).metadata()).height;
await sharp({ create: { width: 920, height: (h + 8) * bufs.length + 8, channels: 3, background: { r: 245, g: 245, b: 245 } } })
  .composite(bufs.map((b, i) => ({ input: b, left: 10, top: 8 + i * (h + 8) })))
  .png()
  .toFile("docs/shots/states-nav.png");

const c1 = await sharp("docs/shots/st-cta-rest.png").resize({ width: 440 }).toBuffer();
const c2 = await sharp("docs/shots/st-cta-hover.png").resize({ width: 440 }).toBuffer();
const ch = (await sharp(c1).metadata()).height;
await sharp({ create: { width: 910, height: ch + 20, channels: 3, background: { r: 245, g: 245, b: 245 } } })
  .composite([{ input: c1, left: 10, top: 10 }, { input: c2, left: 460, top: 10 }])
  .png()
  .toFile("docs/shots/states-cta.png");
console.log("готово");

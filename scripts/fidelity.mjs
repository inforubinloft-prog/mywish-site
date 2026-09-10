// Расхождение с макетом по секциям: снимок сцены против docs/ref/page.png.
import { chromium } from "playwright";
import sharp from "sharp";

const SECTIONS = [
  ["залы", 96, 835], ["галерея", 1020, 1125], ["рилсы", 2189, 1015],
  ["менеджер", 3204, 660], ["пакеты", 3898, 940], ["дата и цена", 4880, 963],
  ["форма", 5883, 917], ["как проходит", 6840, 940], ["где", 7820, 900],
];
const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.querySelectorAll("img[loading=lazy]").forEach(i => i.loading = "eager"); });
await page.evaluate(() => new Promise((res) => { const p=[...document.images].filter(i=>!i.complete); if(!p.length) return res(); let n=p.length; const d=()=>--n===0&&res(); p.forEach(i=>{i.addEventListener('load',d,{once:true});i.addEventListener('error',d,{once:true})}); setTimeout(res,20000); }));
await page.waitForTimeout(800);
const shot = await page.locator("main > .stage").screenshot({ path: OUT ? `${OUT}/stage.png` : undefined });
await browser.close();

const site = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const ref = await sharp("docs/ref/page.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = site.info.width;
console.log(`сцена ${W}×${site.info.height}, макет ${ref.info.width}×${ref.info.height}`);
for (const [name, y, h] of SECTIONS) {
  let diff = 0, total = 0;
  for (let row = y; row < y + h; row += 2) {
    for (let x = 0; x < W; x += 2) {
      const a = (row * W + x) * 4;
      const b = ((row + 956) * ref.info.width + x) * 4;
      const d = Math.abs(site.data[a] - ref.data[b]) + Math.abs(site.data[a+1] - ref.data[b+1]) + Math.abs(site.data[a+2] - ref.data[b+2]);
      if (d > 24) diff++;
      total++;
    }
  }
  console.log(`${name.padEnd(14)} ${(100 * diff / total).toFixed(1)}%`);
}

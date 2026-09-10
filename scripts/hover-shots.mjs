// Снимки состояний при наведении.
import { chromium } from "playwright";
const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

const shots = [
  ["halls-cta", '#halls a.u-cta', '#halls a.u-cta', 60],
  ["gallery", '#gallery figure:nth-of-type(6)', '#gallery figure:nth-of-type(6)', 40],
  ["chip", '#packages article:nth-of-type(2) a.u-chip', '#packages article:nth-of-type(2)', 0],
];
for (const [name, hoverSel, shotSel, pad] of shots) {
  const h = page.locator(hoverSel).first();
  await h.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise((res) => { const p=[...document.images].filter(i=>!i.complete); if(!p.length) return res(); let n=p.length; const d=()=>--n===0&&res(); p.forEach(i=>{i.addEventListener('load',d,{once:true});i.addEventListener('error',d,{once:true})}); setTimeout(res,8000); }));
  await page.waitForTimeout(400);
  await h.hover();
  await page.waitForTimeout(500);
  const box = await page.locator(shotSel).first().boundingBox();
  await page.screenshot({ path: `${OUT}/hover-${name}.png`, clip: { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 } });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
}
await browser.close();
console.log("готово");

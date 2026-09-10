// Ищем, чем нарисована красная дуга под секцией «Выбери зал»,
// и как она кадрируется на разной ширине окна.
import { chromium } from "playwright";

const OUT = process.argv[2] || ".";
const widths = process.argv.slice(3).map(Number);
const browser = await chromium.launch();

for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 950 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // прокручиваем к началу секции «Выбери зал»
  await page.evaluate(() => {
    const s = document.querySelector('[data-section="halls"]');
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 20);
  });
  await page.evaluate(
    () => new Promise((res) => { const p=[...document.images].filter(i=>!i.complete); if(!p.length) return res(); let n=p.length; const d=()=>--n===0&&res(); p.forEach(i=>{i.addEventListener('load',d,{once:true});i.addEventListener('error',d,{once:true})}); setTimeout(res,10000); }),
  );
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".decor-bleed img").forEach((img) => {
      const b = img.getBoundingClientRect();
      out.push({
        файл: img.getAttribute("src").split("/").pop(),
        w: Math.round(b.width), h: Math.round(b.height),
        left: Math.round(b.left), right: Math.round(b.right),
        top: Math.round(b.top), bottom: Math.round(b.bottom),
      });
    });
    return { vw: innerWidth, rem: parseFloat(getComputedStyle(document.documentElement).fontSize), bands: out };
  });
  console.log(`\n── ${w}px (1rem = ${info.rem.toFixed(2)}px) ──`);
  for (const b of info.bands) console.log(`${b.файл.padEnd(20)} ${String(b.w).padStart(5)}×${String(b.h).padStart(5)}  x ${b.left}…${b.right}  y ${b.top}…${b.bottom}`);

  await page.screenshot({ path: `${OUT}/halls-${w}.png` });
  await page.close();
}
await browser.close();

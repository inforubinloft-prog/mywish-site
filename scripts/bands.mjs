// Снимки полос на широком мониторе + проверка, что края закрыты.
import { chromium } from "playwright";
const OUT = process.argv[2];
const W = Number(process.argv[3] || 2560);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: 950 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
for (const sec of ["manager", "packages", "how"]) {
  await page.evaluate((s) => {
    const el = document.querySelector(`[data-section="${s}"]`);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 40);
  }, sec);
  await page.evaluate(() => new Promise((res) => { const p=[...document.images].filter(i=>!i.complete); if(!p.length) return res(); let n=p.length; const d=()=>--n===0&&res(); p.forEach(i=>{i.addEventListener('load',d,{once:true});i.addEventListener('error',d,{once:true})}); setTimeout(res,10000); }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${sec}-${W}.png` });
}
const bad = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll(".decor-bleed img").forEach((img) => {
    const b = img.getBoundingClientRect();
    if (b.left > 0.5 || b.right < innerWidth - 0.5)
      out.push(`${img.src.split("/").pop()}: ${Math.round(b.left)}…${Math.round(b.right)} при ${innerWidth}`);
  });
  return out;
});
console.log(bad.length ? "ЩЕЛЬ У КРАЯ:\n" + bad.join("\n") : `${W}px — все подложки закрывают края`);
await browser.close();

// Реальная высота содержимого секций при масштабе 1.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.querySelectorAll("img[loading=lazy]").forEach(i => i.loading = "eager"); });
await page.evaluate(() => new Promise((res) => { const p=[...document.images].filter(i=>!i.complete); if(!p.length) return res(); let n=p.length; const d=()=>--n===0&&res(); p.forEach(i=>{i.addEventListener('load',d,{once:true});i.addEventListener('error',d,{once:true})}); setTimeout(res,15000); }));
await page.waitForTimeout(800);
const rows = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("[data-section]").forEach((s) => {
    if (s.dataset.section === "hero") return;
    const sb = s.getBoundingClientRect();
    let top = Infinity, bottom = -Infinity;
    s.querySelectorAll("*").forEach((el) => {
      if (el.closest("[aria-hidden='true']") && el.tagName === "IMG" && el.src.includes("decor")) return;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!b.width || !b.height || cs.visibility === "hidden" || cs.opacity === "0") return;
      top = Math.min(top, b.top - sb.top);
      bottom = Math.max(bottom, b.bottom - sb.top);
    });
    out.push({ секция: s.dataset.section, коробка: Math.round(sb.height), содержимое: Math.round(bottom - top), от: Math.round(top), до: Math.round(bottom) });
  });
  return out;
});
const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
console.log("масштаб", (rem / 16).toFixed(2));
console.table(rows);
await browser.close();

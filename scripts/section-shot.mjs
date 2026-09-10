// Снимок одной секции по её data-section.
import { chromium } from "playwright";
const [, , sec, out, w = "1440", scale = "1"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: 950 }, deviceScaleFactor: +scale });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const el = page.locator(`[data-section="${sec}"]`);
await el.scrollIntoViewIfNeeded();
await page.evaluate(() => new Promise((res) => { const p=[...document.images].filter(i=>!i.complete); if(!p.length) return res(); let n=p.length; const d=()=>--n===0&&res(); p.forEach(i=>{i.addEventListener('load',d,{once:true});i.addEventListener('error',d,{once:true})}); setTimeout(res,10000); }));
await page.waitForTimeout(500);
await el.screenshot({ path: out });
await browser.close();
console.log("→", out);

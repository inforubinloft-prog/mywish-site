// Кроп со страницы с увеличением — искать артефакты по краям.
import { chromium } from "playwright";
const [, , sel, dx, dy, w, h, out, scale = "4"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: Number(scale) });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const el = page.locator(sel).first();
await el.scrollIntoViewIfNeeded();
await page.evaluate(() => new Promise((res) => { const p=[...document.images].filter(i=>!i.complete); if(!p.length) return res(); let n=p.length; const d=()=>--n===0&&res(); p.forEach(i=>{i.addEventListener('load',d,{once:true});i.addEventListener('error',d,{once:true})}); setTimeout(res,8000); }));
await page.waitForTimeout(500);
const b = await el.boundingBox();
await page.screenshot({ path: out, clip: { x: b.x + +dx, y: b.y + +dy, width: +w, height: +h } });
await browser.close();
console.log("→", out, JSON.stringify(b));

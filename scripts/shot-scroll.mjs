import { chromium } from "playwright";
const [, , out, y = "0"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate((yy) => window.scrollTo(0, yy), Number(y));
await page.evaluate(
  () => new Promise((res) => { const p=[...document.images].filter(i=>!i.complete); if(!p.length) return res(); let n=p.length; const d=()=>--n===0&&res(); p.forEach(i=>{i.addEventListener('load',d,{once:true});i.addEventListener('error',d,{once:true})}); setTimeout(res,10000); }),
);
await page.waitForTimeout(600);
await page.screenshot({ path: out });
await browser.close();
console.log("→", out);

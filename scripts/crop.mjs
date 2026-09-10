// Кроп из PNG с увеличением — чтобы сверяться с макетом.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const [, , x, y, w, h, out, scale = "1", file = "docs/ref/page.png"] = process.argv;
const s = Number(scale);
const b64 = readFileSync(file).toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Math.round(w * s), height: Math.round(h * s) }, deviceScaleFactor: 1 });
await page.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${b64}"
  style="position:absolute;left:${-x}px;top:${-y}px;transform-origin:0 0;image-rendering:pixelated;zoom:${s}"></body>`);
await page.waitForTimeout(600);
await page.screenshot({ path: out });
await browser.close();
console.log("→", out);

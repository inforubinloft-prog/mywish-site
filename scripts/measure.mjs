import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
const data = await page.evaluate(() => {
  const h = document.querySelector("#halls h2");
  const em = h.querySelector("em");
  const r = document.createRange(); r.selectNodeContents(em);
  const cs = getComputedStyle(h);
  const loaded = [...document.fonts].map((f) => `${f.family}/${f.weight} ${f.status}`);
  return {
    rootFont: getComputedStyle(document.documentElement).fontSize,
    innerWidth: window.innerWidth,
    docWidth: document.documentElement.clientWidth,
    headingBox: h.getBoundingClientRect().width,
    accentWidth: r.getBoundingClientRect().width,
    headingHeight: h.getBoundingClientRect().height,
    font: cs.fontFamily.split(",")[0],
    fontSize: cs.fontSize,
    fonts: loaded,
  };
});
console.log(JSON.stringify(data, null, 1));
await browser.close();

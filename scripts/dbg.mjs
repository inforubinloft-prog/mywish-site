import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1000);
console.log(JSON.stringify(await page.evaluate(() => {
  const h = document.querySelector("#halls h2");
  const em = h.querySelector("em");
  const r = document.createRange(); r.selectNodeContents(em);
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-family:var(--font-display);font-weight:900;font-size:78px;letter-spacing:0.04em";
  probe.textContent = "под стиль праздника";
  document.body.appendChild(probe);
  const probeFira = probe.getBoundingClientRect().width;
  probe.style.fontFamily = "Arial";
  const probeArial = probe.getBoundingClientRect().width;
  probe.remove();
  return {
    lineBoxes: em.getClientRects().length,
    emRect: [...em.getClientRects()].map((x) => Math.round(x.width)),
    rangeWidth: Math.round(r.getBoundingClientRect().width),
    h2Height: Math.round(h.getBoundingClientRect().height),
    probeFira: Math.round(probeFira),
    probeArial: Math.round(probeArial),
    check: document.fonts.check("900 78px fira"),
  };
}), null, 1));
await browser.close();

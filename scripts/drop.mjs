// Насколько заметен выезд: положение элементов шапки по кадрам.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.waitForFunction(() => document.querySelectorAll(".hero-gate")[0]?.dataset.shown === "true", null, { timeout: 8000 });
const t0 = Date.now();
for (const at of [80, 200, 350, 500, 700, 900]) {
  const w = at - (Date.now() - t0);
  if (w > 0) await page.waitForTimeout(w);
  const y = await page.evaluate(() =>
    [...document.querySelectorAll(".hero-drop")].map((e) => {
      const m = getComputedStyle(e).transform;
      return m === "none" ? "0" : Math.round(parseFloat(m.split(",")[5])) + "";
    }),
  );
  console.log(String(at + "мс").padStart(6), "сдвиг по Y:", y.map((v) => String(v).padStart(4)).join(" "));
}
await browser.close();

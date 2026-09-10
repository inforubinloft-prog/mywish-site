// Проверка сценария первого экрана: 0.3с занавес → 2с шапка → 7с левый блок.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 }, deviceScaleFactor: 1 });
const t0 = Date.now();
await page.goto("http://localhost:3000", { waitUntil: "load" });

const read = () =>
  page.evaluate(() => {
    const curtain = document.querySelector(".hero-curtain");
    const groups = [...document.querySelectorAll(".hero-reveal")];
    const veil = groups[0];
    const top = groups[1];
    const left = groups[2];
    const o = (e) => (e ? +getComputedStyle(e).opacity : null);
    return { занавес: o(curtain), вуаль: o(veil), шапка: o(top), левый: o(left) };
  });

for (const at of [400, 1200, 2600, 3200, 7400, 8400, 9500]) {
  const wait = at - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const s = await read();
  console.log(
    String(((Date.now() - t0) / 1000).toFixed(1) + "с").padStart(6),
    "занавес " + s.занавес.toFixed(2),
    "| шапка " + s.шапка.toFixed(2),
    "| левый " + s.левый.toFixed(2),
    "| вуаль " + s.вуаль.toFixed(2),
  );
}
await browser.close();

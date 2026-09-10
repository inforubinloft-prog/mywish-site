// Пузыри переписки: сколько строк, вылезает ли текст, где время.
import { chromium } from "playwright";
const browser = await chromium.launch();
const W = Number(process.argv[2] || 1440);
const page = await browser.newPage({ viewport: { width: W, height: 950 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
const r = await page.evaluate(() => {
  const card = document.querySelector('[data-node-id="914:1188"]');
  const cb = card.getBoundingClientRect();
  const out = [];
  card.querySelectorAll("div > div").forEach((b) => {
    const [p, t] = b.querySelectorAll("p");
    const bb = b.getBoundingClientRect(), pb = p.getBoundingClientRect(), tb = t.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(p).lineHeight);
    out.push({
      текст: p.textContent.slice(0, 24) + "…",
      пузырь: `${Math.round(bb.width)}×${Math.round(bb.height)}`,
      строк: Math.round(pb.height / lh),
      "текст за пузырь": Math.round(pb.bottom - bb.bottom + 10),
      "наезд на время": Math.round(pb.right - tb.left),
      "пузырь за карточку": Math.round(bb.bottom - cb.bottom),
    });
  });
  return { карточка: `${Math.round(cb.width)}×${Math.round(cb.height)}`, out };
});
console.log("карточка", r.карточка);
console.table(r.out);
await browser.close();

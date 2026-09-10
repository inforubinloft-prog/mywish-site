// Сколько недель показывает календарь в каждом месяце и как это меняет карточку.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
for (let i = 0; i < 12; i++) {
  const r = await page.evaluate(() => {
    const card = document.querySelector('[data-node-id="914:1564"]');
    const grid = card.querySelector('[style*="grid-template-rows"]');
    const legend = card.querySelector(".flex[style*='column-gap']:last-of-type");
    const cb = card.getBoundingClientRect(), gb = grid.getBoundingClientRect();
    const cells = [...grid.children].filter((c) => c.tagName === "BUTTON");
    const rows = new Set(cells.map((c) => Math.round(c.getBoundingClientRect().top))).size;
    const legendBottom = Math.max(...[...card.querySelectorAll("span.flex.items-center")].map((s) => s.getBoundingClientRect().bottom));
    return {
      месяц: card.querySelector("span.font-display").textContent,
      недель: rows,
      сетка: Math.round(gb.height),
      карточка: Math.round(cb.height),
      "поле снизу": Math.round(cb.bottom - legendBottom),
      "зазор до легенды": Math.round(legendBottom - gb.bottom),
    };
  });
  console.log(`${String(r.месяц).padEnd(16)} недель ${r.недель}  сетка ${String(r.сетка).padStart(3)}  карточка ${String(r.карточка).padStart(3)}  зазор ${r["зазор до легенды"]}  поле ${r["поле снизу"]}`);
  if (i < 11) await page.click('#price button[aria-label="Следующий месяц"]');
  await page.waitForTimeout(120);
}
await browser.close();

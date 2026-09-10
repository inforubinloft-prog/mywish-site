// Сверка координат вёрстки с макетом Figma 914:193.
// Ожидаемые значения — абсолютные Y страницы (hero = 956, дальше как в макете).
import { chromium } from "playwright";

const EXPECT = [
  ["#halls h2", 340, 1077, 699],
  ["#gallery h2", 544, 1976, 352],
  ["#reels h2", 563, 3197, 314],
  ["#manager h2", 502, 4160, 473],
  ["#packages h2", 332, 4879, 774],
  ["#price h2", 512, 5915, 429],
  ["#contact h2", 419, 6865, 600],
  ["#how h2", 554, 7850, 331],
  ["#where h2", 532, 8509, 340],
  ["#faq h2", 130, 9221, 464],
  ["#how li:nth-child(1)", 164, 8093, 213],
  ["#how li:nth-child(2)", 459, 8093, 230],
  ["#how li:nth-child(3)", 716, 8093, 271],
  ["#how li:nth-child(4)", 1055, 8093, 230],
  ['#where [data-node-id="914:1905"]', 130, 8691, 713],
  ["#faq details:nth-of-type(1)", 642, 9220, 668],
  // У пунктов 2 и 8 сверяем только левый край и ширину: они стоят под
  // раскрытым ответом, а его высота зависит от длины текста. Тексты ответов
  // ещё не готовы, так что привязывать их Y к макету нечего.
  ["#faq details:nth-of-type(2)", 642, null, 668],
  ["#faq details:nth-of-type(8)", 642, null, 668],
  ["aside[data-node-id='914:2083']", 130, 10013, 1180],
  ["footer", 130, 10240, 1180],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);

const rows = await page.evaluate((expect) => {
  return expect.map(([sel, x, y, w]) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, err: "не найден" };
    const r = el.getBoundingClientRect();
    return {
      sel,
      dx: Math.round((r.x - x) * 10) / 10,
      dy: y === null ? null : Math.round((r.y + window.scrollY - y) * 10) / 10,
      dw: Math.round((r.width - w) * 10) / 10,
    };
  });
}, EXPECT);

let bad = 0;
for (const r of rows) {
  if (r.err) { console.log(r.sel.padEnd(34), r.err); bad++; continue; }
  const ok = Math.abs(r.dx) < 2 && Math.abs(r.dy) < 2 && Math.abs(r.dw) < 2;
  if (!ok) bad++;
  console.log((ok ? "  ok " : "  ×  ") + r.sel.padEnd(32), "Δx", String(r.dx).padStart(7), "Δy", String(r.dy === null ? "—" : r.dy).padStart(7), "Δw", String(r.dw).padStart(7));
}
console.log(bad ? `\nрасхождений: ${bad} из ${rows.length}` : `\nвсе ${rows.length} проверок сошлись`);
await browser.close();

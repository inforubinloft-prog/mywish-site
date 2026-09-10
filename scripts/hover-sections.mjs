// Отклик на наведение: цвет, сдвиг, длительность — в обоих режимах анимации.
import { chromium } from "playwright";
const browser = await chromium.launch();

const TARGETS = [
  ["ВСЕ ЗАЛЫ", '#halls a.u-cta', null],
  ["фото галереи", '#gallery figure:nth-of-type(6)', 'img'],
  ["ВЫБРАТЬ · хэппи", '#packages a.u-chip', null],
  ["ВЫБРАТЬ · вау", '#packages article:nth-of-type(3) a.u-chip', null],
];

for (const rm of ["no-preference", "reduce"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await page.emulateMedia({ reducedMotion: rm });
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  console.log(`\n── prefers-reduced-motion: ${rm} ──`);
  for (const [name, sel, inner] of TARGETS) {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    const read = (s) => page.evaluate((q) => {
      const e = document.querySelector(q); const c = getComputedStyle(e);
      return { фон: c.backgroundColor, текст: c.color, сдвиг: c.transform, длит: c.transitionDuration };
    }, s);
    const q = inner ? `${sel} ${inner}` : sel;
    const before = await read(q);
    await el.hover();
    await page.waitForTimeout(400);
    const after = await read(q);
    const ch = [];
    for (const k of ["фон", "текст", "сдвиг"]) if (before[k] !== after[k]) ch.push(`${k}: ${before[k]} → ${after[k]}`);
    console.log(`${name.padEnd(18)} ${ch.length ? ch.join("; ") : "БЕЗ ИЗМЕНЕНИЙ"}  [${after.длит}]`);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
  }
  await page.close();
}
await browser.close();

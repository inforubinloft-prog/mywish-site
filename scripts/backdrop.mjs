// Яркость фона под плавающей шапкой по всей высоте сцены.
//
// Логотип шапки одноцветный, и на тёмной подложке он пропадает. Шапка умеет
// переключаться в светлую схему, но узнать цвет фона в браузере нечем: тёмное
// на странице — содержимое картинок, а не background элементов. Поэтому тёмные
// зоны перечислены руками в DARK_BACKDROPS (src/components/Decor.tsx), а этот
// скрипт даёт для них числа: снимает сцену и печатает диапазоны, где средняя
// яркость под шапкой ниже порога.
//
// Смотреть надо на зоны «лого» и «справа» — там стоят одноцветные элементы.
// Средняя зона почти всегда пёстрая (там идёт контент), по ней не ориентируемся.
//
// node scripts/backdrop.mjs [порог]
import { chromium } from "playwright";
import sharp from "sharp";

const DARK = Number(process.argv[2]) || 128;
/** Полосы короче этого — рябь контента, а не подложка. */
const MIN_BAND = 40;
/** Горизонтальные зоны шапки в координатах макета. */
const ZONES = { лого: [131, 302], меню: [567, 874], справа: [1010, 1312] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager")); });
await page.evaluate(() => new Promise((res) => {
  const pending = [...document.images].filter((i) => !i.complete);
  if (!pending.length) return res();
  let n = pending.length;
  const done = () => --n === 0 && res();
  pending.forEach((i) => { i.addEventListener("load", done, { once: true }); i.addEventListener("error", done, { once: true }); });
  setTimeout(res, 20000);
}));
await page.waitForTimeout(800);
const scale = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
const buf = await page.locator("main > .stage").screenshot();
await browser.close();

const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const toPx = (v) => Math.round(v * scale);
const lum = (x, y) => { const i = (y * W + x) * 4; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
const BAND = 69;
// Среднее по всей площади элемента, а не по одной строке: логотип высотой 69 px
// читается целиком, и одна тёмная строка посреди светлого пятна ничего не значит.
const rowLum = (yLayout, [x0, x1]) => {
  const y0 = toPx(yLayout), y1 = toPx(yLayout + BAND);
  if (y0 < 0 || y1 >= H) return null;
  let sum = 0, n = 0;
  for (let y = y0; y < y1; y += 3)
    for (let x = toPx(x0); x < toPx(x1); x += 3) { sum += lum(x, y); n++; }
  return sum / n;
};

const stageHeight = Math.round(H / scale);
console.log(`снимок ${W}×${H}, масштаб ${scale.toFixed(4)}, сцена ${stageHeight} макетных px, порог ${DARK}`);

for (const [name, xs] of Object.entries(ZONES)) {
  const ranges = [];
  let open = null;
  for (let y = 0; y < stageHeight - 1; y += 2) {
    const l = rowLum(y, xs);
    if (l === null) continue;
    if (l < DARK) { if (open === null) open = y; }
    else if (open !== null) { ranges.push([open, y]); open = null; }
  }
  if (open !== null) ranges.push([open, stageHeight]);
  const big = ranges.filter(([a, b]) => b - a >= MIN_BAND);
  console.log(`\nзона ${name} (x ${xs[0]}…${xs[1]}) — тёмные полосы в координатах сцены:`);
  if (!big.length) console.log("   нет");
  for (const [a, b] of big) console.log(`   ${a} … ${b}   (${b - a} px)`);
}

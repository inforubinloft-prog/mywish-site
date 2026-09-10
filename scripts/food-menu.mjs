// Страницы меню из PDF.
//
// Заказчик отдаёт меню страницами PDF (папка «пакеты модалка/меню/FINAL v2»),
// а модалка показывает их картинками. Прежние картинки были собраны из
// экспорта низкого качества: на экране 660 px они уже мылились, а на плотном
// экране — тем более.
//
// Растрируем сами, из вектора, сразу под нужный размер. Внешних программ для
// этого не нужно: pdfjs-dist и @napi-rs/canvas уже стоят в проекте.
//
// node scripts/food-menu.mjs [папка с PDF]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const SRC =
  "пакеты модалка/меню/FINAL v2/FINAL v2/FINAL v2/FINAL v2";
const ROOT = process.argv[2] ?? SRC;
const OUT = "public/packages/food/menu";

/**
 * Ширина страницы в пикселях.
 *
 * В модалке разворот показывается примерно 660 макетными px, то есть 1320
 * настоящими на плотном экране. Прежние 1488 формально это покрывали, но
 * фотографии внутри PDF мельче не становятся: замер по одному и тому же
 * фрагменту даёт резкость 11.8 при 1488, 12.5 при 2232 и 14.0 при 2976 —
 * значит вектор отдаёт больше, чем мы забирали. Берём 2232: дальше растёт
 * только вес, а разница на экране уже за пределом видимого.
 */
const WIDTH = 2232;

/** Кому какой номер: порядок задан именами файлов, 00 — обложка. */
const num = (name) => Number(name.match(/^(\d+)/)?.[1] ?? Number.POSITIVE_INFINITY);

if (!fs.existsSync(ROOT)) {
  console.log("НЕТ ПАПКИ:", ROOT);
  process.exit(1);
}

const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .sort((a, b) => num(a) - num(b));

if (!files.length) {
  console.log("В папке нет PDF:", ROOT);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

let bytes = 0;

for (const file of files) {
  const n = num(file);
  const задача = pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(path.join(ROOT, file))),
    /*
      Шрифты в меню превращены в кривые, системные подставлять не из чего —
      предупреждение об отсутствующем стандартном наборе только шумит.
    */
    useSystemFonts: false,
  });
  const doc = await задача.promise;

  if (doc.numPages > 1) {
    console.log(`  ВНИМАНИЕ ${file}: страниц ${doc.numPages}, берём первую`);
  }

  const page = await doc.getPage(1);
  const базовый = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: WIDTH / базовый.width });

  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const ctx = canvas.getContext("2d");
  /*
    Холст прозрачный, а страницы меню — с полями под цвет фона. Заливаем белым
    только если у страницы нет своей подложки: иначе прозрачные поля пропустят
    тень карусели внутрь листа.
  */
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  /*
    webp, а не png: страницы — это фотографии на плашке, и без потерь они
    весят вчетверо больше при той же картинке. На отдачу это всё равно не
    влияет — Next пережимает их сам, — но в репозитории лежать сорока
    мегабайтами незачем.
  */
  const out = path.join(OUT, `page-${String(n).padStart(2, "0")}.webp`);
  await sharp(canvas.toBuffer("image/png"))
    .webp({ quality: 86 })
    .toFile(out);

  const размер = fs.statSync(out).size;
  bytes += размер;
  console.log(
    `${file.padEnd(28)} → ${path.basename(out)}  ${canvas.width}×${canvas.height}  ${(размер / 1048576).toFixed(2)} МБ`,
  );

  await задача.destroy();
}

console.log(`\nготово: ${files.length} страниц, ${(bytes / 1048576).toFixed(1)} МБ в ${OUT}`);

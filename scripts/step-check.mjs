// Галочка выполненного шага: пересчёт присланного рендера под веб.
//
// Исходник — «чеклист.png» в корне проекта, 1254×1254 с прозрачным фоном.
// Показывается размером около 43 макетных px, поэтому 180 хватает и на
// плотном экране с запасом.
//
// Поля вокруг знака срезаем: стикеры шагов стоят по своим координатам из
// макета и заполняют коробку целиком — с полями галочка казалась бы мельче
// соседних стикеров на тех же координатах.
//
// node scripts/step-check.mjs [исходник]
import sharp from "sharp";
import fs from "node:fs";

const SRC = process.argv[2] ?? "чеклист.png";
const OUT = "public/steps/done.webp";

if (!fs.existsSync(SRC)) {
  console.log("НЕТ ФАЙЛА:", SRC);
  process.exit(1);
}

fs.mkdirSync("public/steps", { recursive: true });

await sharp(SRC)
  .trim({ threshold: 1 })
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 88, alphaQuality: 100 })
  .toFile(OUT);

const { width, height } = await sharp(OUT).metadata();
console.log(
  `готово: ${OUT} ${width}×${height}, ${(fs.statSync(OUT).size / 1024).toFixed(0)} КБ`,
);

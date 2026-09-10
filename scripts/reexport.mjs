// Пересборка обтравленных картинок из исходников Figma (rawImages).
// Прежние файлы — рендеры нод, из которых фон выбит по порогу: альфа только
// 0/255, а по краю остаётся светлое кольцо от фона выгрузки. У исходников
// альфа настоящая, со сглаженным краем.
import sharp from "sharp";
const S = process.argv[2];
const W = (p) => `public/figma/${p}`;

const jobs = [
  // FILL: масштаб «по большей стороне» с обрезкой по центру — как в Figma
  { src: `${S}/c1-4.png`, out: W("packages/p1.webp"), w: 302, h: 454, mode: "cover" },
  { src: `${S}/c2-4.png`, out: W("packages/p2.webp"), w: 262, h: 438, mode: "cover" },
  // CROP по вертикали: [[1,0,0],[0,0.944,0.001]] — берём 94.4 % высоты от 0.1 %
  { src: `${S}/c3-1.png`, out: W("packages/p3.webp"), w: 306, h: 396, crop: [0.001, 0.944] },
  // Бант кладём без поворота: его повернёт CSS, растр остаётся чистым
  { src: `${S}/bow-1.png`, out: W("packages/sticker.webp"), w: 570, h: 380, mode: "fill" },
];

for (const j of jobs) {
  let img = sharp(j.src);
  if (j.crop) {
    const m = await img.metadata();
    const top = Math.round(j.crop[0] * m.height);
    const height = Math.round(j.crop[1] * m.height);
    img = sharp(await img.extract({ left: 0, top, width: m.width, height }).png().toBuffer());
  }
  await img.resize(j.w, j.h, { fit: j.mode === "cover" ? "cover" : "fill", kernel: "lanczos3" })
    .webp({ quality: 92, alphaQuality: 100 }).toFile(j.out);
  const { data, info } = await sharp(j.out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let soft = 0, total = 0;
  for (let i = 3; i < data.length; i += 4) { if (data[i] > 0 && data[i] < 255) soft++; total++; }
  console.log(`${j.out.padEnd(34)} ${info.width}×${info.height}  мягких по краю ${(100 * soft / total).toFixed(2)}%`);
}

import sharp from "sharp";
const S = process.argv[2];
const jobs = [
  // 914:2082 — CROP по вертикали [[1,0,0],[0,0.93,0.069]]
  { src: `${S}/faq-1.png`, out: "public/figma/faq/hero.webp", w: 774, h: 1080, crop: [0.069, 0.93] },
  // 914:1866 — FILL, соотношение исходника совпадает с нодой
  { src: `${S}/arch-1.png`, out: "public/figma/how/backdrop.webp", w: 2039, h: 771, mode: "fill" },
];
for (const j of jobs) {
  let img = sharp(j.src);
  if (j.crop) {
    const m = await img.metadata();
    img = sharp(await img.extract({ left: 0, top: Math.round(j.crop[0] * m.height), width: m.width, height: Math.round(j.crop[1] * m.height) }).png().toBuffer());
  }
  await img.resize(j.w, j.h, { fit: "fill", kernel: "lanczos3" }).webp({ quality: 92, alphaQuality: 100 }).toFile(j.out);
  const { data, info } = await sharp(j.out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let soft = 0, total = 0;
  for (let i = 3; i < data.length; i += 4) { if (data[i] > 0 && data[i] < 255) soft++; total++; }
  console.log(`${j.out.padEnd(30)} ${info.width}×${info.height}  мягких ${(100 * soft / total).toFixed(2)}%`);
}

// Сравнение двух картинок одинакового размера: доля заметно разных пикселей.
import sharp from "sharp";
const [, , a, b] = process.argv;
const A = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const B = await sharp(b).resize(A.info.width, A.info.height, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let diff = 0, total = 0;
for (let i = 0; i < A.data.length; i += 4) {
  const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i+1] - B.data[i+1]) + Math.abs(A.data[i+2] - B.data[i+2]);
  if (d > 24) diff++;
  total++;
}
console.log(`расхождение ${(100 * diff / total).toFixed(1)}%  (${A.info.width}×${A.info.height})`);

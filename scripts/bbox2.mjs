// Габарит непрозрачного/непохожего-на-фон содержимого в кропе.
import sharp from "sharp";
const [, , file, bg = "250,213,216"] = process.argv;
const BG = bg.split(",").map(Number);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const d = Math.abs(data[i] - BG[0]) + Math.abs(data[i+1] - BG[1]) + Math.abs(data[i+2] - BG[2]);
  if (d > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
console.log(`${file.split(/[\/]/).pop().padEnd(14)} x ${x0}…${x1} (${x1-x0})   y ${y0}…${y1} (${y1-y0})`);

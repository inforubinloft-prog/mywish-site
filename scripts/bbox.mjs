// Габарит персонажа: по альфе или по «не фон» — чтобы сверить кадрирование.
import sharp from "sharp";
const [, , file, mode = "alpha", bg = "252,225,227"] = process.argv;
const BG = bg.split(",").map(Number);
const { data, info } = await sharp(file).resize(306, 459, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const on = mode === "alpha"
    ? data[i + 3] > 128
    : Math.abs(data[i] - BG[0]) + Math.abs(data[i+1] - BG[1]) + Math.abs(data[i+2] - BG[2]) > 40;
  if (on) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
console.log(`${file.split(/[\/]/).pop()}  x ${x0}…${x1}   y ${y0}…${y1}`);

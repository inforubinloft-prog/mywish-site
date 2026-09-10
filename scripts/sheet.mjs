// Контактный лист: все кандидаты на клетчатом фоне.
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";
const [, , dir, out] = process.argv;
const files = readdirSync(dir).filter((n) => /\.png$/.test(n)).sort();
const CELL = 200, COLS = 6;
const rows = Math.ceil(files.length / COLS);
const checker = Buffer.from(
  `<svg width="${CELL * COLS}" height="${CELL * rows}"><defs><pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse">
   <rect width="24" height="24" fill="#0d0"/><rect width="12" height="12" fill="#060"/><rect x="12" y="12" width="12" height="12" fill="#060"/>
   </pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`);
const layers = [];
for (let i = 0; i < files.length; i++) {
  const buf = await sharp(join(dir, files[i])).resize(CELL - 16, CELL - 30, { fit: "inside" }).png().toBuffer();
  const m = await sharp(buf).metadata();
  layers.push({ input: buf, left: (i % COLS) * CELL + 8, top: Math.floor(i / COLS) * CELL + 22 });
  layers.push({
    input: Buffer.from(`<svg width="${CELL}" height="20"><text x="4" y="14" font-family="monospace" font-size="13" fill="#fff">${files[i]}</text></svg>`),
    left: (i % COLS) * CELL, top: Math.floor(i / COLS) * CELL,
  });
}
await sharp(checker).composite(layers).png().toFile(out);
console.log("→", out, files.join(" "));

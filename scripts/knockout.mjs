// Экспорт ноды из Figma приходит с запечённым фоном родителя.
// Выбиваем его заливкой от краёв: только пиксели, связанные с границей,
// чтобы не продырявить саму иллюстрацию.
//
// node scripts/knockout.mjs <файлы.webp…>
import sharp from "sharp";
import fs from "node:fs";

sharp.cache(false);

const files = process.argv.slice(2);
const TOL = 10;

for (const file of files) {
  const input = fs.readFileSync(file);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const c0 = [data[0], data[1], data[2]];
  const near = (i) =>
    Math.abs(data[i] - c0[0]) <= TOL && Math.abs(data[i + 1] - c0[1]) <= TOL && Math.abs(data[i + 2] - c0[2]) <= TOL;

  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);

  let cleared = 0;
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const p = y * w + x;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!near(i)) continue;
    data[i + 3] = 0;
    cleared++;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  const buf = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 100 })
    .toBuffer();
  fs.writeFileSync(file, buf);
  console.log(
    file.split("/").pop().padEnd(22),
    "фон #" + c0.map((v) => v.toString(16).padStart(2, "0")).join(""),
    "выбито " + Math.round((100 * cleared) / (w * h)) + "%",
  );
}

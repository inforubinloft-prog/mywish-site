// Восстановление прозрачности одноцветной графики, выгруженной из Figma
// поверх плоского фона. Простое выбивание по ключу оставляет светлую кайму
// на сглаженных краях, поэтому считаем настоящую альфу:
//   пиксель = alpha × ink + (1 − alpha) × bg  →  alpha = (bg − пиксель)/(bg − ink)
//
// node scripts/unmatte.mjs <вход.png> <выход.webp> <#ink> <#bg>
import sharp from "sharp";
import fs from "node:fs";

sharp.cache(false);
const [, , src, out, inkHex = "#0E1736", bgHex = "#FFF9F6"] = process.argv;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ink = hex(inkHex);
const bg = hex(bgHex);

const { data, info } = await sharp(fs.readFileSync(src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  let sum = 0;
  let weight = 0;
  for (let c = 0; c < 3; c++) {
    const span = bg[c] - ink[c];
    if (Math.abs(span) < 20) continue;
    sum += ((bg[c] - data[i + c]) / span) * Math.abs(span);
    weight += Math.abs(span);
  }
  const a = Math.max(0, Math.min(1, weight ? sum / weight : 0));
  data[i] = ink[0];
  data[i + 1] = ink[1];
  data[i + 2] = ink[2];
  data[i + 3] = Math.round(a * 255);
}
const buf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100 })
  .toBuffer();
fs.writeFileSync(out, buf);
console.log(out.split("/").pop(), info.width + "×" + info.height, (buf.length / 1024 | 0) + "KB");

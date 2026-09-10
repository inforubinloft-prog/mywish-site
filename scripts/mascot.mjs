// Пересборка персонажа из исходника Figma (rawImages) — с настоящей альфой.
// Прежний файл был выгружен нодой поверх розового фона и обрезан по порогу:
// альфа была только 0 или 255, а по краю оставалось светлое кольцо.
import sharp from "sharp";
const [, , src, out] = process.argv;
await sharp(src).resize(612, 918, { fit: "fill", kernel: "lanczos3" })
  .webp({ quality: 92, alphaQuality: 100 }).toFile(out);
const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const hist = new Array(9).fill(0);
for (let i = 3; i < data.length; i += 4) hist[Math.min(8, Math.floor(data[i] / 32))]++;
console.log(`${out} ${info.width}×${info.height}`);
console.log("альфа по корзинам:", hist.join(" "));

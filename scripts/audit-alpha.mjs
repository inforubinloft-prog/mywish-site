// Аудит обтравки: у каких картинок прозрачность двоичная (0/255) — такие
// вырезаны по порогу и тащат за собой светлую кайму от фона выгрузки.
import sharp from "sharp";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(webp|png)$/i.test(p) ? [p] : [];
});

for (const file of walk("public/figma")) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let clear = 0, solid = 0, soft = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) clear++; else if (data[i] === 255) solid++; else soft++;
  }
  if (clear === 0) continue;                       // без прозрачности — не наш случай
  const edge = soft / (clear + solid + soft);
  const flag = soft === 0 ? "ПО ПОРОГУ" : "сглажена";
  console.log(`${flag.padEnd(10)} ${(edge * 100).toFixed(2).padStart(6)}% мягких  ${info.width}×${info.height}  ${file}`);
}

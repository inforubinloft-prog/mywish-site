import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";
const dir = process.argv[2];
for (const f of readdirSync(dir).filter((n) => /\.png$/.test(n))) {
  const m = await sharp(join(dir, f)).metadata();
  console.log(`${f.padEnd(12)} ${m.width}×${m.height}  соотношение ${(m.width / m.height).toFixed(3)}  альфа:${m.hasAlpha}`);
}

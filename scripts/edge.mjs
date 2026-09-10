import sharp from "sharp";
const src = process.argv[2];
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
console.log("размер", W, H);
// гистограмма альфы
const hist = new Array(9).fill(0);
for (let i = 3; i < data.length; i += 4) hist[Math.min(8, Math.floor(data[i] / 32))]++;
console.log("альфа по корзинам 0..255:", hist.join(" "));
// проходим по строке и печатаем переход фон→объект
const rows = [Math.round(H * 0.92), Math.round(H * 0.88)];
for (const y of rows) {
  const out = [];
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const a = data[i + 3];
    if (a > 0) {
      for (let k = 0; k < 8 && x + k < W; k++) {
        const j = (y * W + x + k) * 4;
        out.push(`a${data[j+3]} rgb(${data[j]},${data[j+1]},${data[j+2]})`);
      }
      break;
    }
  }
  console.log(`y=${y}: ` + out.join(" | "));
}

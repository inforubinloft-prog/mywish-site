// Самый насыщенный цвет в прямоугольнике макета — чтобы снять цвет текста.
import sharp from "sharp";
const { data, info } = await sharp("docs/ref/page.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const pick = (x0, y0, x1, y1, label) => {
  let best = null, bestScore = 1e9;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * info.width + x) * 4;
    const s = data[i] + data[i + 1] + data[i + 2];
    if (s < bestScore) { bestScore = s; best = [data[i], data[i + 1], data[i + 2]]; }
  }
  console.log(`${label.padEnd(26)} rgb(${best.join(",")})  #${best.map(v => v.toString(16).padStart(2, "0")).join("")}`);
};
pick(190, 8320, 250, 8342, "текст «Заявка»");
pick(164, 8322, 182, 8340, "кружок «Заявка»");
pick(164, 8214, 182, 8232, "кружок «Зал»");
pick(190, 8212, 240, 8234, "текст «Зал»");

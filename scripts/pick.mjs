// Цвет точек: снимок сцены против макета. Координаты — макетные (y от 0 страницы).
import sharp from "sharp";
const S = process.argv[2];
const site = await sharp(`${S}/stage.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const ref = await sharp("docs/ref/page.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const pts = [[60, 4000], [1380, 4400], [60, 5000], [1380, 5600], [60, 6600], [1380, 7000], [720, 7300], [60, 3300], [720, 4700], [1400, 4700]];
for (const [x, my] of pts) {
  const a = ((my - 956) * site.info.width + x) * 4;
  const b = (my * ref.info.width + x) * 4;
  const g = [site.data[a], site.data[a+1], site.data[a+2]];
  const r = [ref.data[b], ref.data[b+1], ref.data[b+2]];
  const d = Math.max(...r.map((v, k) => Math.abs(v - g[k])));
  console.log(`(${x},${my})  макет ${r.join(",").padEnd(13)} сайт ${g.join(",").padEnd(13)} Δ${String(d).padStart(3)}  ${d <= 6 ? "ок" : "РАСХОЖДЕНИЕ"}`);
}

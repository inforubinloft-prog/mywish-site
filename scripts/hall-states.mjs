// Состояния выбора зала: наведение, нажатие, выбран.
//
// Исходники — 27 прозрачных PNG по 2.4–2.8 МБ (папка MyWish_hall_states):
// девять залов в трёх состояниях. В каждом нарисован дом целиком, потому что
// состояние меняет не только сам этаж: соседние приглушены, выбранный
// подсвечен. Поэтому это не наклейка поверх этажа, а второй кадр дома.
//
// Здесь они приводятся к рамке, в которой уже стоят дома на странице, и
// ужимаются до экранного размера.
//
// Зачем пересчёт кадра. Присланные PNG нарисованы на другом холсте: сам дом
// тот же (соотношение сторон совпадает с точностью до 0.002), но полей вокруг
// него больше или меньше. Если положить их как есть, дом поедет относительно
// базового кадра. Поэтому у каждого файла берётся непрозрачная область, а
// затем она ставится на холст ровно с теми же полями, что у базового снимка
// в public/figma/2-halls. После этого состояние ложится на базу пиксель в
// пиксель, и координаты в разметке трогать не нужно.
//
// node scripts/hall-states.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC =
  "C:/Users/Administrator/Downloads/MyWish_hall_states/MyWish_hall_states";
/* Архив распаковывается во временную папку — путь можно передать первым доводом. */
const ROOT = process.argv[2] ?? SRC;
const OUT = "public/halls/states";

/**
 * Дома. base — тот самый файл, что стоит на странице: по нему считается рамка,
 * в которую вписываются состояния. width — ширина показа в макетных px из
 * Halls.tsx; берём вдвое больше под плотный экран.
 */
const HOUSES = [
  {
    dir: "01_kachalova_8i",
    base: "public/figma/2-halls/hall-photo-a.webp",
    width: 551,
    floors: { "01_barbi": "barbie", "02_sicilia": "sicily", "03_ocean_drive": "ocean-drive" },
  },
  {
    dir: "02_kozhevennaya_34",
    base: "public/figma/2-halls/hall-kozhevennaya-34.webp",
    width: 373,
    floors: { "01_white": "white", "02_flamingo": "flamingo", "03_black": "black" },
  },
  {
    dir: "03_kachalova_15a",
    base: "public/figma/2-halls/hall-kachalova-15a.webp",
    width: 477,
    floors: { "01_leonardo": "leonardo", "02_santa_lucia": "santa-lucia", "03_rubin_hall": "rubin-hall" },
  },
];

const STATES = ["hover", "press", "selected"];

/** Прямоугольник непрозрачной части: где на холсте лежит сам дом. */
async function content(file) {
  const img = sharp(file).ensureAlpha();
  const { width, height } = await img.metadata();
  const raw = await img.raw().toBuffer();
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let i = 3, px = 0; i < raw.length; i += 4, px++) {
    if (raw[i] < 8) continue;
    const x = px % width;
    const y = (px / width) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    canvas: { width, height },
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

fs.mkdirSync(OUT, { recursive: true });

let bytes = 0;
let count = 0;

for (const house of HOUSES) {
  const dir = path.join(ROOT, house.dir);
  if (!fs.existsSync(dir)) {
    console.log("НЕТ ПАПКИ:", dir);
    continue;
  }

  /* Поля базового снимка в долях холста — в них и вписываем состояния. */
  const было = await content(house.base);
  const поля = {
    left: было.left / было.canvas.width,
    top: было.top / было.canvas.height,
    width: было.width / было.canvas.width,
    height: было.height / было.canvas.height,
  };

  /* Рамка дома в присланных PNG. Альфа у всех состояний одна, берём по базе. */
  const стало = await content(path.join(dir, "00_base.png"));

  const отклонение =
    Math.abs(было.width / было.height - стало.width / стало.height);
  if (отклонение > 0.01) {
    console.log(
      `  ВНИМАНИЕ ${house.dir}: дом другой формы (${(было.width / было.height).toFixed(3)} против ${(стало.width / стало.height).toFixed(3)}) — состояния встанут не по месту`,
    );
  }

  const canvasW = Math.round(стало.width / поля.width);
  const canvasH = Math.round(стало.height / поля.height);
  const target = path.join(OUT, house.dir.replace(/^\d+_/, ""));
  fs.mkdirSync(target, { recursive: true });

  for (const [prefix, slug] of Object.entries(house.floors)) {
    for (const state of STATES) {
      const from = path.join(dir, `${prefix}__${state}.png`);
      if (!fs.existsSync(from)) {
        console.log("НЕТ ФАЙЛА:", from);
        continue;
      }

      const кадр = await sharp(from)
        .extract({
          left: стало.left,
          top: стало.top,
          width: стало.width,
          height: стало.height,
        })
        .toBuffer();

      const out = path.join(target, `${slug}--${state}.webp`);
      /*
        Сборка и уменьшение — двумя проходами. В одном конвейере sharp сначала
        меняет размер холста, а накладывает уже потом: кадр оказывается больше
        подложки, и вызов падает.
      */
      const холст = await sharp({
        create: {
          width: canvasW,
          height: canvasH,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          {
            input: кадр,
            left: Math.round(поля.left * canvasW),
            top: Math.round(поля.top * canvasH),
          },
        ])
        .png()
        .toBuffer();

      /* Показ вдвое меньше: 2× хватает и на плотном экране. */
      await sharp(холст)
        .resize({ width: house.width * 2 })
        .webp({ quality: 70, alphaQuality: 90 })
        .toFile(out);

      bytes += fs.statSync(out).size;
      count++;
    }
  }

  console.log(
    `${house.dir.padEnd(20)} холст ${canvasW}×${canvasH} → показ ${house.width * 2}px`,
  );
}

console.log(
  `\nготово: ${count} состояний, ${(bytes / 1048576).toFixed(2)} МБ в ${OUT}`,
);

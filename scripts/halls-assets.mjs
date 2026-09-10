// Пересчёт фотографий залов под веб.
//
// Исходники лежат в «фото залов/<адрес>/<зал>» — это выгрузка с камеры:
// 130 файлов по 6000×4000, 734 МБ. В сборку они не идут, отсюда получаются
// два размера на каждый снимок:
//   thumb-NN — кадр карточки, 3:2 кропом по центру;
//   NN       — кадр модалки, по длинной стороне 1600.
// Плюс схемы залов из отдельной папки — plan-N.
//
// Порядок кадров задан именами файлов (1.jpg, 2.jpg …) — заказчик отобрал и
// расставил их сам, поэтому сортируем по числу в начале имени, а не по строке:
// иначе 10 встанет между 1 и 2. У «Рубин Холла» часть имён вида «4 (2).jpg» —
// при равном числе идут после обычного.
//
// node scripts/halls-assets.mjs          — весь пересчёт
// node scripts/halls-assets.mjs --fan    — только карточки веера (девять файлов)
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { HALLS } from "../src/lib/halls.mjs";

const SRC = "фото залов";
const OUT = "public/halls";

/**
 * Схемы залов — изометрические разрезы «кукольного домика».
 *
 * Лежат отдельно от фотографий и уже приведены к стандарту: силуэт в области
 * 6–94 % холста, нижняя кромка на 94 %, зал центрирован (см. СТАНДАРТ.md
 * рядом с ними). Поэтому кадрировать и выравнивать их не надо — только
 * уменьшить и перевести в webp.
 *
 * Прозрачность сохраняем: на странице схема лежит на светлой подложке, и
 * запечённый фон дал бы вокруг неё чужой прямоугольник.
 */
const PLANS_SRC =
  "C:/Users/Administrator/Desktop/сайт/Залы/кукольный дом/залы для кукольного домика/СТАНДАРТ_V1/01_master_3072x2048";

/**
 * Ширина схемы под веб.
 *
 * Берём мастер 3072×2048 и уменьшаем сами, а не готовую веб-копию 1536: в окне
 * схема показывается на 980 CSS px, и на плотном экране это 1960 настоящих —
 * копию 1536 браузер растягивал, и ступеньки внешнего края лезли наружу.
 *
 * 2560, а не 1960 впритык: край силуэта в исходных рендерах вырезан жёстко,
 * без сглаживания (замерено: на 400 строках нижней кромки 23 скачка больше
 * трёх пикселей). Показ один к одному выводил бы эту лесенку в полный рост,
 * а с запасом браузер усредняет её при уменьшении. Совсем убрать ступеньки
 * отсюда нельзя — за краем силуэта нет цвета, сглаживать альфу нечем;
 * лечится только повторным экспортом рендеров со сглаживанием.
 */
const PLAN_WIDTH = 2560;

/** Оригиналы схем до нормализации — по ним видно настоящее разрешение. */
const PLANS_ORIGIN =
  "C:/Users/Administrator/Desktop/сайт/Залы/кукольный дом/залы для кукольного домика";

/**
 * Кадр карточки: 3:2 кропом по центру. Карточка шириной 373 макетных px, на
 * плотном экране и максимальном масштабе это около 900 настоящих — 1000 берём
 * с небольшим запасом. Такие делаются для всех снимков, а не только для
 * первого: фотографии листаются прямо в карточке, и гонять туда полноразмерные
 * кадры модалки было бы вчетверо дороже по весу.
 */
const THUMB = { w: 1000, h: 667, quality: 76 };

/**
 * Карточка для веера под кнопкой «Все залы» на главной.
 *
 * Портрет 5:7, кропом по центру — веер из игральных карт, они вертикальные.
 * Показывается размером около 80 макетных px, поэтому 300 хватает и на
 * плотном экране: девять таких весят вместе меньше одной обложки.
 */
const FAN = { w: 300, h: 420, quality: 74 };
/** Кадр модалки: длинная сторона 1600 — на 1440-й сцене хватает и на 2×. */
const FULL = { long: 1600, quality: 76 };

const num = (name) => {
  const m = name.match(/^(\d+)/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
};

const byOrder = (a, b) => num(a) - num(b) || a.localeCompare(b, "ru");

/* Веер собирается из первых кадров: пересчитывать ради него всё незачем. */
const ONLY_FAN = process.argv.includes("--fan");

let done = 0;
const report = [];
/** Схемы, которым не хватило настоящего разрешения. */
const stretched = [];

for (const hall of HALLS) {
  const dir = path.join(SRC, hall.src);
  if (!fs.existsSync(dir)) {
    console.log("НЕТ ПАПКИ:", dir);
    continue;
  }
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort(byOrder);
  const target = path.join(OUT, hall.slug);
  fs.mkdirSync(target, { recursive: true });

  let bytes = 0;
  for (let i = 0; i < files.length; i++) {
    const from = path.join(dir, files[i]);
    /* rotate() без аргументов применяет поворот из EXIF — часть кадров вертикальные. */
    const base = sharp(from).rotate();

    const nn = String(i + 1).padStart(2, "0");

    /* Веер собирается из заглавных снимков — берём только первый кадр зала. */
    if (i === 0) {
      const fan = path.join(target, "fan.webp");
      await base
        .clone()
        .resize(FAN.w, FAN.h, { fit: "cover", position: "centre" })
        .webp({ quality: FAN.quality })
        .toFile(fan);
      bytes += fs.statSync(fan).size;
    }

    if (ONLY_FAN) continue;

    const thumb = path.join(target, `thumb-${nn}.webp`);
    await base
      .clone()
      .resize(THUMB.w, THUMB.h, { fit: "cover", position: "centre" })
      .webp({ quality: THUMB.quality })
      .toFile(thumb);
    bytes += fs.statSync(thumb).size;

    const out = path.join(target, `${nn}.webp`);
    await base
      .clone()
      .resize(FULL.long, FULL.long, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: FULL.quality })
      .toFile(out);
    bytes += fs.statSync(out).size;
    done++;
  }

  /* Схемы: только перевод в webp, композиция уже приведена к стандарту. */
  let plans = 0;
  for (let i = 0; !ONLY_FAN && i < hall.plans.length; i++) {
    const from = path.join(PLANS_SRC, hall.plans[i]);
    if (!fs.existsSync(from)) {
      console.log("НЕТ СХЕМЫ:", from);
      continue;
    }
    /*
      Не все мастера настоящие. Два из одиннадцати собраны из маленьких
      оригиналов и растянуты: «Блэк» — из 1622×970 почти вдвое, второй вид
      «Рубин Холла» — из 1539×1022 ровно вдвое. Лишних деталей в них от этого
      не появилось, поэтому и выдавать их за 2560 незачем: файл был бы втрое
      тяжелее, а картинка та же мутная.

      Считаем настоящую ширину по оригиналу и берём меньшее из двух. Запас
      1.2 — чтобы кадр не пришлось потом растягивать в самом окне.
    */
    const origin = path.join(PLANS_ORIGIN, hall.plans[i]);
    let width = PLAN_WIDTH;
    if (fs.existsSync(origin)) {
      const real = (await sharp(origin).metadata()).width ?? PLAN_WIDTH;
      width = Math.min(PLAN_WIDTH, Math.round(real * 1.2));
      if (width < PLAN_WIDTH) stretched.push(`${hall.title}: ${real}px → ${width}`);
    }

    const out = path.join(target, `plan-${i + 1}.webp`);
    await sharp(from)
      .resize(width, null, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, alphaQuality: 100, smartSubsample: true })
      .toFile(out);
    bytes += fs.statSync(out).size;
    plans++;
  }

  report.push({ зал: hall.title, кадров: files.length, схем: plans, вес: (bytes / 1048576).toFixed(1) + " МБ" });
  console.log(
    `${hall.title.padEnd(14)} ${String(files.length).padStart(2)} кадров  ${plans} схем  ${(bytes / 1048576).toFixed(1)} МБ`,
  );
}

const total = report.reduce((a, r) => a + parseFloat(r.вес), 0);
console.log(`\nготово: ${done} кадров, ${total.toFixed(1)} МБ в public/halls`);

if (stretched.length) {
  console.log("\nсхемы, у которых мастер растянут из маленького оригинала:");
  for (const s of stretched) console.log("  " + s);
  console.log(
    "  отданы по настоящему разрешению — резкости в них всё равно нет.\n" +
      "  чтобы стали как остальные, их надо переэкспортировать из 3D в полный размер",
  );
}

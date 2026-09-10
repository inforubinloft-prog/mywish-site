/*
  Веер живых фотографий под кнопкой «Все залы».

  Проверяем не только состояние (раскрылся / не раскрылся), но и размер
  коробки. Обёртка веера нулевой ширины, и сброс Tailwind однажды уже
  схлопнул карточки в трёхпиксельную точку через max-width: 100% — при
  этом и загрузка, и повороты, и прозрачность оставались правильными.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const errors = [];
/*
  Считаем своими только ошибки со страницы. Виджет Яндекс-карты живёт в чужом
  iframe и тянет за собой рекламный cookie-sync — десяток запросов к биржам,
  часть которых всегда отваливается по сертификату или редиректам. К нашему
  коду это отношения не имеет, и молчать об этом виджет не умеет.
*/
const своя = (m) => {
  const url = m.location?.()?.url ?? "";
  return !url || url.includes("localhost:3000");
};
page.on("console", (m) => m.type() === "error" && своя(m) && errors.push(m.text()));
page.on("requestfailed", (r) => errors.push("не отдалось: " + r.url()));
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector("#halls").scrollIntoView({ block: "center" }));
await page.waitForTimeout(600);

const покой = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll(".halls-fan img")];
  return { карточек: imgs.length, прозрачность: getComputedStyle(imgs[0]).opacity };
});
check(покой.карточек === 9, `девять карточек (${покой.карточек})`);
check(покой.прозрачность === "0", "в покое веера не видно");

await page.hover(".halls-action-all");
await page.waitForTimeout(1200);

const веер = await page.evaluate(() => {
  const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
  const imgs = [...document.querySelectorAll(".halls-fan img")];
  const секция = document.querySelector("#halls").getBoundingClientRect();
  return {
    ширины: imgs.map((i) => Math.round(parseFloat(getComputedStyle(i).width) / scale)),
    прозрачности: imgs.map((i) => Number(getComputedStyle(i).opacity)),
    слои: imgs.map((i) => getComputedStyle(i).zIndex),
    повороты: new Set(imgs.map((i) => getComputedStyle(i).rotate)).size,
    файлы: imgs.map((i) => i.naturalWidth).filter((w) => w > 100).length,
    залы: imgs.map((i) => i.currentSrc.split("/").slice(-2, -1)[0]),
    соотношение: Number((imgs[0].naturalWidth / imgs[0].naturalHeight).toFixed(2)),
    вышлиЗаСекцию: imgs.some((i) => {
      const r = i.getBoundingClientRect();
      return r.top < секция.top || r.left < секция.left || r.right > секция.right;
    }),
    кнопка: getComputedStyle(document.querySelector(".halls-action-all")).backgroundColor,
  };
});
console.log("  ширины карточек, макетных px:", веер.ширины.join(" "));
check(веер.ширины.every((w) => w === 80), "карточка 80 макетных px, а не схлопнута в точку");
check(
  веер.прозрачности.every((o) => o === 1),
  "под курсором раскрыты все девять, без приглушения дальних",
);
check(веер.повороты === 9, `все девять развёрнуты по-своему (${веер.повороты})`);
check(веер.файлы === 9, `девять снимков отдались в полном размере (${веер.файлы})`);
check(!веер.вышлиЗаСекцию, "веер не вылезает за границы секции");
check(веер.соотношение === 0.71, "кадры вертикальные 5:7 (" + веер.соотношение + ")");
console.log("  порядок наложения:", веер.слои.join(" "));
check(
  веер.слои.join(" ") === "5 6 7 8 9 8 7 6 5",
  "стопка собрана от середины: средняя карточка сверху",
);

console.log("  порядок:", веер.залы.join(" "));
check(
  веер.залы.join(" ") ===
    "barbie sicily ocean-drive white flamingo black leonardo santa-lucia rubin-hall",
  "порядок как дома на экране: слева направо, этажи сверху вниз",
);
check(веер.кнопка === "rgb(14, 23, 54)", `кнопка перекрасилась (${веер.кнопка})`);


console.log("ошибки консоли:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

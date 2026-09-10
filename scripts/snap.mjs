/*
  Подмагничивание ключевых блоков.

  Четыре шага — зал, пакет, дата, заявка — притягиваются к своему верху, если
  прокрутка остановилась рядом. Между ними страница свободна: обязательное
  притяжение превратило бы её в листалку по экранам.

  Проверяем три вещи: цели именно эти четыре, рядом с целью притягивает, а на
  середине пути между блоками — нет.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: "reduce" });
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

/*
  Ждём, пока страница перестанет расти. Пока внизу догружаются картинки,
  браузер сам подправляет прокрутку, и это неотличимо от притяжения.
*/
await page.evaluate(() => {
  document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
  /*
    Заодно выключаем удержание позиции при догрузке: браузер двигает прокрутку
    сам, когда содержимое выше меняет высоту, и со стороны это неотличимо от
    притяжения — проба ловила бы чужой сдвиг.
  */
  document.body.style.overflowAnchor = "none";
});
let было = -1;
for (let i = 0; i < 40; i++) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  if (h === было) break;
  было = h;
  await page.waitForTimeout(200);
}

const цели = await page.evaluate(() =>
  Object.fromEntries(
    [...document.querySelectorAll(".u-snap")].map((s) => [
      s.id,
      Math.round(
        s.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(s).scrollMarginTop),
      ),
    ]),
  ),
);
console.log("цели притяжения:", JSON.stringify(цели));
check(
  Object.keys(цели).join(" ") === "halls packages price contact",
  "притягиваются ровно четыре шага",
);

/*
  Прокрутка мгновенная: на странице стоит scroll-behavior: smooth, и если
  просто вызвать scrollTo, проба померяет позицию где-то на полпути и решит,
  что её притянуло. Инлайновый стиль тут не помогает — браузер успевает
  прочитать прежнее значение.
*/
const стоп = async (y) => {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
  await page.waitForTimeout(600);
  return page.evaluate(() => Math.round(window.scrollY));
};

console.log("\nрядом с блоком пакетов:");
for (const δ of [-200, -80, 80, 200]) {
  const промах = (await стоп(цели.packages + δ)) - цели.packages;
  console.log(`  остановка в ${String(δ).padStart(5)} от цели → промах ${промах}`);
  check(промах === 0, `с ${δ} притянуло к началу блока`);
}

console.log("\nна середине пути между блоками:");
for (const доля of [0.4, 0.5, 0.6]) {
  const y = Math.round(цели.packages + (цели.price - цели.packages) * доля);
  const стало = await стоп(y);
  console.log(`  ${Math.round(доля * 100)}% пути → сдвиг ${стало - y}`);
  check(стало === y, `на ${Math.round(доля * 100)}% пути страница стоит там, где остановили`);
}


console.log("переход по якорю всё ещё точен:");
/* Со свежей вкладки: переход по хешу внутри уже открытой страницы Next гасит. */
const свежая = await browser.newPage({
  viewport: { width: 1440, height: 950 },
  reducedMotion: "reduce",
});
await свежая.goto("http://localhost:3000/#packages", { waitUntil: "load" });
await свежая.evaluate(() => document.fonts.ready);
await свежая.waitForTimeout(1600);
const переход = await свежая.evaluate(() => ({
  верх: Math.round(document.querySelector("#packages").getBoundingClientRect().top),
  прокрутка: Math.round(window.scrollY),
  адрес: location.hash,
}));
const верх = переход.верх;
console.log("  после перехода:", JSON.stringify(переход));
/*
  Посадка теперь одна на все шаги — 72 макетных px под плавающую шапку
  (см. landing.mjs). Проверяем, что переход по якорю приводит ровно туда же,
  куда притягивает прокрутка.
*/
check(верх >= 60 && верх <= 90, `блок встал под шапкой, а не под её край (${верх}px)`);

console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

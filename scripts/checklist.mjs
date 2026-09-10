/*
  Чек-лист «Ты уже выбрала» в блоке «как это работает».

  Четыре строки — зал, пакет, дата, заявка — показывают, что закрыто, и
  уводят к своему шагу. Это единственное место, где все четыре видны разом,
  поэтому строка должна быть ссылкой: увидел незакрытое — ткнул — оказался там.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));

await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1800);
/*
  Секция высокая, и scrollIntoView на строке чек-листа страницу не двигает —
  считаем координату сами и прокручиваем к ней. Иначе наведение целится за
  нижний край окна и молча ничего не проверяет.
*/
await page.evaluate(() => {
  /* Плавная прокрутка мешает целиться: доводим страницу мгновенно. */
  document.documentElement.style.scrollBehavior = "auto";
  const a = document.querySelector(".u-step");
  window.scrollTo(0, a.getBoundingClientRect().top + window.scrollY - 400);
});
await page.waitForTimeout(600);

const строки = await page.evaluate(() =>
  [...document.querySelectorAll(".u-step")].map((a) => ({
    тег: a.tagName,
    текст: a.textContent.replace(/\s+/g, " ").trim(),
    адрес: a.getAttribute("href"),
    готово: a.dataset.done,
  })),
);
for (const с of строки) console.log(`  ${с.текст.padEnd(28)} → ${с.адрес}`);
check(строки.length === 4, `четыре строки (${строки.length})`);
check(строки.every((с) => с.тег === "A"), "каждая строка — ссылка");
check(
  строки.map((с) => с.адрес).join(" ") === "#halls #packages #price #contact",
  "адреса ведут к своим шагам",
);
check(
  строки.every((с) => с.текст.includes("перейти")),
  "скринридеру сказано, что строка уводит к шагу",
);

console.log("\nотклик:");
const цвет = () =>
  page.evaluate(() => getComputedStyle(document.querySelector(".u-step")).color);
const покой = await цвет();
/*
  Ждём, пока строка перестанет ездить: ниже по странице догружаются картинки,
  высота меняется, и координата, снятая слишком рано, оказывается мимо.
*/
const место = await (async () => {
  let было = -1;
  for (let i = 0; i < 40; i++) {
    const r = await page.evaluate(() => {
      const b = document.querySelector(".u-step").getBoundingClientRect();
      return { x: Math.round(b.x) + 20, y: Math.round(b.y + b.height / 2) };
    });
    if (r.y === было) return r;
    было = r.y;
    await page.waitForTimeout(120);
  }
  throw new Error("строка чек-листа не встала на место");
})();
/*
  Двумя движениями: одиночный прыжок курсора страница иногда не считает
  наведением — событие приходит раньше, чем встаёт раскладка после плавной
  прокрутки, и :hover не включается.
*/
await page.mouse.move(место.x, место.y - 6);
await page.mouse.move(место.x, место.y);
await page.waitForTimeout(500);
const наведение = await page.evaluate(() => {
  const a = document.querySelector(".u-step");
  const cs = getComputedStyle(a);
  return {
    цвет: cs.color,
    подчёркивание: cs.textDecorationLine,
    сдвиг: cs.translate,
    наведена: a.matches(":hover"),
  };
});
console.log("  ", покой, "→", JSON.stringify(наведение));
check(наведение.цвет === "rgb(219, 64, 79)", "под курсором строка акцентная");
check(наведение.подчёркивание.includes("underline"), "и подчёркнута");
check(наведение.сдвиг !== "none" && наведение.сдвиг !== "0px", `и сдвигается (${наведение.сдвиг})`);

console.log("\nпереход:");
await page.click(".u-step:nth-of-type(1), a.u-step");
await page.waitForTimeout(1500);
const куда = await page.evaluate(() => ({
  адрес: location.hash,
  верх: Math.round(document.querySelector("#halls").getBoundingClientRect().top),
}));
console.log("  ", JSON.stringify(куда));
check(куда.адрес === "#halls", "нажатие уводит к своему блоку");
check(Math.abs(куда.верх) < 120, `и блок оказывается вверху экрана (${куда.верх}px)`);

console.log("\nошибки:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

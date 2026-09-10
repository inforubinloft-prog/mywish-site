/*
  Выбор зала на странице залов.

  Кнопка в карточке — то же действие, что и в модалке фотографий: выбрать
  зал и уйти к пакету. Проверяем, что выбор виден (кнопка меняет вид),
  остальные кнопки гаснут, а переход попадает ровно в начало блока пакетов.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));

await page.goto("http://localhost:3000/halls", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const кнопки = () =>
  page.evaluate(() =>
    [...document.querySelectorAll(".halls-card-book")].map((b) => {
      const cs = getComputedStyle(b);
      return {
        зал: b.closest(".halls-card").id,
        надпись: b.textContent.trim(),
        фон: cs.backgroundColor,
        прозрачность: Number(cs.opacity).toFixed(2),
      };
    }),
  );

console.log("в покое:");
const покой = await кнопки();
console.log("  ", покой.slice(0, 2).map((b) => b.зал + ": " + b.надпись + " " + b.фон).join(" | "));
check(покой.every((b) => b.надпись === "Выбрать"), "на всех кнопках «Выбрать»");
check(покой.every((b) => b.прозрачность === "1.00"), "все кнопки в полную силу");
check(покой.every((b) => b.фон === "rgb(219, 64, 79)"), "все акцентные");

console.log("\nпод курсором:");
await page.hover("#flamingo .halls-card-book");
await page.waitForTimeout(400);
const наведение = await page.evaluate(() =>
  getComputedStyle(document.querySelector("#flamingo .halls-card-book")).backgroundColor,
);
console.log("  фон:", наведение);
check(наведение === "rgb(14, 23, 54)", "под курсором кнопка меняет цвет");

console.log("\nпосле выбора:");
await page.click("#flamingo .halls-card-book");
await page.waitForTimeout(900);
await page.goBack();
await page.waitForTimeout(1200);
await page.mouse.move(10, 10);
await page.waitForTimeout(500);
const выбран = await кнопки();
const свой = выбран.find((b) => b.зал === "flamingo");
const прочие = выбран.filter((b) => b.зал !== "flamingo");
console.log("  выбранный:", JSON.stringify(свой));
console.log("  соседний: ", JSON.stringify(прочие[0]));
check(свой.надпись === "Выбран", "на выбранной кнопке «Выбран»");
check(свой.фон === "rgb(14, 23, 54)", `выбранная закрепила тёмный фон (${свой.фон})`);
check(свой.прозрачность === "1.00", "выбранная в полную силу");
check(прочие.every((b) => Number(b.прозрачность) < 0.6), "остальные кнопки приглушены");

console.log("\nпереход к пакетам:");
await page.click("#black .halls-card-book");
await page.waitForTimeout(1600);
const переход = await page.evaluate(() => {
  const s = document.querySelector("#packages");
  return {
    адрес: location.pathname + location.hash,
    верхСекции: Math.round(s.getBoundingClientRect().top),
    зал: document.querySelector("#hall")?.value,
  };
});
console.log("  ", JSON.stringify(переход));
check(переход.адрес === "/#packages", "ушли на главную к пакетам");
check(переход.верхСекции >= 0 && переход.верхСекции <= 40, `экран начинается с блока пакетов (${переход.верхСекции}px)`);
check(переход.зал === "Блэк", "выбранный зал доехал до формы");

console.log("\nошибки:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

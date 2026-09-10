// Декабрьский прайс: два периода внутри месяца и легенда под календарём.
//
// node scripts/december.mjs
import { chromium } from "playwright";

const ОЖИДАНИЕ = {
  "1-11": { будни: 3800, "пт/вс": 5850, суббота: 7800 },
  "12-31": { будни: 4350, "пт/вс": 6750, суббота: 9000 },
};
const ГРУППА = (wd) => (wd === 5 ? "суббота" : wd === 4 || wd === 6 ? "пт/вс" : "будни");

let bad = 0;
const check = (cond, text) => { if (!cond) bad++; console.log(`  ${cond ? "ok  " : "ПЛОХО"} ${text}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

// листаем до декабря
const месяц = () => page.evaluate(() => document.querySelector('#price [data-node-id="914:1564"] span.font-display').textContent.trim());
let шагов = 0;
while (!(await месяц()).startsWith("Декабрь") && шагов < 14) {
  await page.click('#price [aria-label="Следующий месяц"]');
  await page.waitForTimeout(120);
  шагов++;
}
const m = await месяц();
console.log(`долистали до: ${m} (${шагов} шагов)`);
if (!m.startsWith("Декабрь")) { console.log("ПЛОХО декабрь не найден"); process.exit(1); }
const год = Number(m.split(" ")[1]);

// цены во всех ячейках месяца
const дни = await page.evaluate(() =>
  [...document.querySelectorAll('#price .u-day')].map((el) => ({
    день: Number(el.querySelectorAll("span")[0].textContent),
    цена: Number(el.querySelectorAll("span")[1].textContent.replace(/[^0-9]/g, "")),
  })),
);
console.log(`ячеек в декабре: ${дни.length}`);

let промахов = 0;
for (const { день, цена } of дни) {
  const wd = (new Date(год, 11, день).getDay() + 6) % 7;
  const период = день <= 11 ? "1-11" : "12-31";
  const надо = ОЖИДАНИЕ[период][ГРУППА(wd)];
  if (цена !== надо) { промахов++; console.log(`  ПЛОХО ${день} декабря (${ГРУППА(wd)}, ${период}): ${цена}, ждали ${надо}`); }
}
check(промахов === 0, `все ${дни.length} ячеек декабря по своему прайсу`);

// граница периодов
const ц = (d) => дни.find((x) => x.день === d)?.цена;
console.log(`  11 декабря ${ц(11)} ₽/час → 12 декабря ${ц(12)} ₽/час`);

// легенда: два периода
const легенда = await page.evaluate(() => {
  const card = document.querySelector('#price [data-node-id="914:1564"]');
  const rows = [...card.querySelectorAll(":scope > div:last-child > div")];
  return rows.map((r) => r.innerText.replace(/\n/g, " · ").trim());
});
console.log("легенда:");
for (const r of легенда) console.log("   ", r);
check(легенда.length === 2, `в декабре две строки легенды (сейчас ${легенда.length})`);
check(легенда.some((r) => r.includes("1–11 декабря")) && легенда.some((r) => r.includes("с 12 декабря")), "обе строки подписаны периодом");

// расчёт по выбранной дате из второго периода
await page.evaluate(() => {
  const d = [...document.querySelectorAll('#price .u-day')].find((el) => Number(el.querySelectorAll("span")[0].textContent) === 26);
  d.click();
});
await page.waitForTimeout(200);
const расчёт = await page.evaluate(() => document.querySelector('#price [data-node-id="914:1753"] p:last-child').innerText.replace(/\n/g, " | "));
console.log("расчёт на 26 декабря:", расчёт);
const wd26 = (new Date(год, 11, 26).getDay() + 6) % 7;
const надо26 = ОЖИДАНИЕ["12-31"][ГРУППА(wd26)];
check(расчёт.replace(/[\u00a0\s]/g, "").includes(`${надо26}`.replace(/(\d)(?=(\d{3})+$)/g, "$1")), `в расчёте тариф ${надо26} ₽ (${ГРУППА(wd26)})`);

// январь следующего года — снова обычный прайс
await page.click('#price [aria-label="Следующий месяц"]');
await page.waitForTimeout(150);
const январь = await page.evaluate(() =>
  [...document.querySelectorAll('#price .u-day')].map((el) => Number(el.querySelectorAll("span")[1].textContent.replace(/[^0-9]/g, ""))),
);
const набор = [...new Set(январь)].sort((a, b) => a - b);
console.log(`после декабря (${await месяц()}) тарифы: ${набор.join(" / ")}`);
check(набор.every((v) => [2900, 4500, 6000].includes(v)), "в январе снова обычный прайс 2900 / 4500 / 6000");

console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

/*
  Отметка выполненных шагов: зал, пакет, дата, заявка.

  Сделанный шаг меняет стикер над заголовком на галочку и уводит акцентную
  строку заголовка из розового в тёмно-синий. Отметка снимается вместе с
  выбором — иначе чек-лист врёт.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (u.includes("localhost:3000") && !u.endsWith(".mp4")) errors.push("не отдалось: " + u);
});

await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2000);

const шаги = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-step]")].map((s) => {
      const em = s.querySelector(".u-heading em");
      const check = s.querySelector(".u-step-check");
      const стикер = s.querySelector(".u-step-sticker");
      return {
        шаг: s.dataset.step,
        сделан: s.dataset.done,
        акцент: em ? getComputedStyle(em).color : null,
        галочка: Number(getComputedStyle(check).opacity).toFixed(2),
        стикер: стикер ? Number(getComputedStyle(стикер).opacity).toFixed(2) : null,
      };
    }),
  );

console.log("в начале:");
const начало = await шаги();
for (const ш of начало) console.log(`  ${ш.шаг.padEnd(8)} сделан ${ш.сделан} · акцент ${ш.акцент} · галочка ${ш.галочка} · стикер ${ш.стикер}`);
check(начало.length === 4, `четыре шага размечены (${начало.length})`);
check(начало.every((ш) => ш.сделан === "false"), "ни один шаг не отмечен");
check(начало.every((ш) => ш.акцент === "rgb(219, 64, 79)"), "все акценты розовые");
check(начало.every((ш) => ш.галочка === "0.00"), "галочек не видно");

const шаг = (имя) => (list) => list.find((ш) => ш.шаг === имя);

console.log("\nвыбрали зал:");
await page.evaluate(() => document.querySelector("#halls").scrollIntoView({ block: "center" }));
await page.waitForTimeout(1200);
await page.locator('[data-hall-option="black"]').evaluate((el) => el.click());
await page.waitForTimeout(700);
const послеЗала = шаг("hall")(await шаги());
console.log("  ", JSON.stringify(послеЗала));
check(послеЗала.сделан === "true", "шаг отмечен");
check(послеЗала.акцент === "rgb(14, 23, 54)", `акцент ушёл в тёмно-синий (${послеЗала.акцент})`);
check(послеЗала.галочка === "1.00", "галочка появилась");
check(послеЗала.стикер === "0.00", "прежний стикер уступил ей место");

console.log("\nсняли выбор зала:");
await page.locator('[data-hall-option="black"]').evaluate((el) => el.click());
await page.waitForTimeout(700);
const снова = шаг("hall")(await шаги());
check(снова.сделан === "false" && снова.галочка === "0.00", "отметка снялась вместе с выбором");
check(снова.акцент === "rgb(219, 64, 79)", "акцент вернулся");
await page.locator('[data-hall-option="black"]').evaluate((el) => el.click());
await page.waitForTimeout(500);

/* ── отыгрыш закрытия ────────────────────────────────────────── */
const отыгрыш = () =>
  page.evaluate(() => {
    const пакет = document.querySelector('[data-step="package"]');
    const дата = document.querySelector('[data-step="date"]');
    const имя = (el) => {
      const a = getComputedStyle(el);
      return a.animationName + " " + a.animationDuration;
    };
    return {
      праздник: пакет.hasAttribute("data-just-done"),
      зов: дата.hasAttribute("data-invite"),
      галочка: имя(пакет.querySelector(".u-step-check")),
      искра: имя(пакет.querySelector(".u-step-burst i")),
      искр: пакет.querySelectorAll(".u-step-burst i").length,
      стикерДаты: имя(дата.querySelector(".u-step-sticker")),
    };
  });

console.log("\nвыбрали пакет:");
await page.evaluate(() => document.querySelector("#packages").scrollIntoView({ block: "center" }));
await page.waitForTimeout(900);
await page.click('.u-package-card[data-package="wow"] .u-chip');
await page.waitForTimeout(700);
const пакет = шаг("package")(await шаги());
console.log("  ", JSON.stringify(пакет));
check(пакет.сделан === "true" && пакет.галочка === "1.00", "шаг «пакет» отмечен");

/*
  Отыгрыш: печать галочки, искры и зов следующего шага. Проверяем и то, что
  он живёт при сниженной анимации — иначе праздника просто не видно, — и то,
  что он одноразовый: при каждой прокрутке мимо всё начиналось бы заново.
*/
const празднование = await отыгрыш();
console.log("  ", JSON.stringify(празднование));
check(празднование.галочка.startsWith("u-step-stamp"), "галочка впечатывается");
check(
  parseFloat(празднование.галочка.split(" ")[1]) > 0.2,
  "печать не проглочена сниженной анимацией",
);
check(празднование.искр === 8, "искр восемь: " + празднование.искр);
check(празднование.искра.startsWith("u-step-spark"), "искры разлетаются");
check(празднование.зов, "следующий шаг позван");
check(празднование.стикерДаты.startsWith("u-step-nudge"), "и его стикер подпрыгивает");

await page.waitForTimeout(1500);
const остыло = await отыгрыш();
check(!остыло.праздник, "через секунду праздник закончился");
check(остыло.галочка.startsWith("none"), "и не повторяется");
await page.waitForTimeout(1500);
check(!(await отыгрыш()).зов, "зов тоже гаснет сам");

console.log("\nвыбрали дату:");
await page.evaluate(() => document.querySelector("#price").scrollIntoView({ block: "center" }));
await page.waitForTimeout(900);
await page.locator(".u-day:not(:disabled)").nth(6).click();
await page.waitForTimeout(700);
const дата = шаг("date")(await шаги());
console.log("  ", JSON.stringify(дата));
check(дата.сделан === "true" && дата.галочка === "1.00", "шаг «дата» отмечен");

console.log("\nотправили заявку:");
await page.evaluate(() => document.querySelector("#contact").scrollIntoView({ block: "center" }));
await page.waitForTimeout(900);
await page.fill("#name", "Ксюша");
await page.fill("#phone", "9951135767");
await page.click("#consent");
await page.click('#contact button[type="submit"]');
await page.waitForTimeout(900);
const заявка = шаг("sent")(await шаги());
console.log("  ", JSON.stringify(заявка));
check(заявка.сделан === "true" && заявка.галочка === "1.00", "шаг «заявка» отмечен");

const итог = await шаги();
check(итог.every((ш) => ш.сделан === "true"), "все четыре шага закрыты");

console.log("\nошибки:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

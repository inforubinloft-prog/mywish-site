/*
  Выбор зала во втором блоке.

  Проверяем три вещи: нарисованные состояния подставляются по действию
  (наведение, нажатие, выбран), выбор доезжает до «Итого» и формы, и
  снимается повторным нажатием по тому же залу.

  Отдельно — что подпись под заголовком не повторяет сделанный выбор: его
  видно на самом доме и в расчёте, а строка «Зал выбран» там уже была и от
  неё отказались.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

const errors = [];
const своя = (m) => { const u = m.location?.()?.url ?? ""; return !u || u.includes("localhost:3000"); };
page.on("console", (m) => m.type() === "error" && своя(m) && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e.message)));
/*
  Ролики Reels грузятся только по наведению и обрываются, когда проверка
  уходит дальше, — это не отказ сервера, а отменённая загрузка.
*/
page.on("requestfailed", (r) => {
  const url = r.url();
  if (!url.includes("localhost:3000") || url.endsWith(".mp4")) return;
  errors.push("не отдалось: " + url);
});

await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1600);
await page.evaluate(() => document.querySelector("#halls").scrollIntoView({ block: "center" }));
await page.waitForTimeout(2200);

const включено = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.hall-state[data-on="true"]')].map((i) =>
      i.currentSrc.split("/").pop(),
    ),
  );

const подпись = () =>
  page.evaluate(() => {
    const p = document.querySelector("#halls-instruction");
    return { текст: p.textContent.trim(), наведение: p.dataset.active };
  });

const итог = () =>
  page.evaluate(() =>
    document.querySelector('[data-node-id="914:1753"]').querySelectorAll("p")[2].textContent.trim(),
  );

/* Середина маски этажа: по краям она обрезана и курсор попадёт в соседа. */
const цель = (slug) =>
  page.evaluate((s) => {
    const el = document.querySelector(`[data-hall-option="${s}"]`);
    const r = el.getBoundingClientRect();
    const nums = [...getComputedStyle(el).clipPath.matchAll(/([\d.]+)%\s+([\d.]+)%/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    const cx = nums.reduce((a, p) => a + p[0], 0) / nums.length;
    const cy = nums.reduce((a, p) => a + p[1], 0) / nums.length;
    return { x: r.x + (r.width * cx) / 100, y: r.y + (r.height * cy) / 100 };
  }, slug);

console.log("состояния:");
check((await включено()).length === 0, "в покое ни одно состояние не включено");

const точка = await цель("black");
await page.mouse.move(точка.x, точка.y);
await page.waitForTimeout(500);
const наведение = await включено();
console.log("  наведение →", наведение.join(" "));
check(наведение.join() === "black--hover.webp", "под курсором кадр наведения");

await page.mouse.down();
await page.waitForTimeout(300);
const нажатие = await включено();
console.log("  нажатие   →", нажатие.join(" "));
check(нажатие.join() === "black--press.webp", "под нажатием кадр нажатия");

await page.mouse.up();
await page.waitForTimeout(400);
console.log("  отпустили →", (await включено()).join(" "));
check((await включено()).join() === "black--selected.webp", "после нажатия кадр выбора");

await page.mouse.move(200, 300);
await page.waitForTimeout(500);
check((await включено()).join() === "black--selected.webp", "выбор держится и без курсора");

console.log("\nподпись под заголовком:");
const п = await подпись();
console.log("  ", JSON.stringify(п));
check(!п.текст.includes("Зал «"), "сделанный выбор в подписи не дублируется");
check(п.наведение === "false", "без курсора подпись в исходном виде");

await page.mouse.move(точка.x, точка.y);
await page.waitForTimeout(450);
const п2 = await подпись();
console.log("  под курсором:", п2.текст.slice(0, 80));
check(
  п2.текст.includes("нажми ещё раз, чтобы отменить"),
  "на выбранном зале подпись подсказывает отмену",
);
await page.mouse.move(200, 300);
await page.waitForTimeout(300);

console.log("\nитог заказа:");
await page.evaluate(() =>
  document.querySelector('[data-node-id="914:1753"]').scrollIntoView({ block: "center" }),
);
await page.waitForTimeout(600);
const строки = await итог();
console.log("  ", строки.replace(/\s+/g, " ").slice(0, 120));
check(строки.includes("Зал «Блэк» — 93 м²"), "зал стоит строкой в «Итого»");
check(строки.includes("Пакет"), "пакет на месте");
check(строки.includes("Аренда") || строки.includes("Выбери дату"), "аренда на месте");
check(
  (await page.evaluate(() => document.querySelector("#hall")?.value)) === "Блэк",
  "зал доехал до формы",
);

console.log("\nотмена повторным нажатием:");
await page.evaluate(() => document.querySelector("#halls").scrollIntoView({ block: "center" }));
await page.waitForTimeout(700);
await page.locator('[data-hall-option="black"]').evaluate((el) => el.click());
await page.waitForTimeout(500);
check((await включено()).length === 0, "повторное нажатие снимает выбор");
check((await итог()).includes("Зал не выбран"), "в «Итого» снова приглашение выбрать");

await page.locator('[data-hall-option="white"]').evaluate((el) => el.click());
await page.waitForTimeout(400);
check((await включено()).join() === "white--selected.webp", "выбор другого зала работает");
await page.locator('[data-hall-option="white"]').evaluate((el) => el.click());
await page.waitForTimeout(400);
check((await включено()).length === 0, "и он тоже снимается повторным нажатием");

console.log("");
console.log("ошибки консоли:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

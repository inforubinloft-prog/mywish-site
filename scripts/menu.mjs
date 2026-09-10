/*
  Полное меню в модалке пакета.

  Страницы растрируются из PDF заказчика (scripts/food-menu.mjs). Проверяем,
  что все семь на месте, отдаются в полном размере и что лист скруглён тем же
  радиусом, что карточки на главной, — иначе он выглядит вставленным листом
  бумаги поверх модалки.
*/
import { chromium } from "playwright";
import fs from "node:fs";
import sharp from "sharp";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

console.log("файлы страниц:");
const dir = "public/packages/food/menu";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).sort();
check(files.length === 7, `семь страниц, обложка и шесть разворотов (${files.length})`);
let мелкие = 0;
let вес = 0;
for (const f of files) {
  const m = await sharp(`${dir}/${f}`).metadata();
  вес += fs.statSync(`${dir}/${f}`).size;
  if (m.width < 1400) мелкие++;
}
console.log("  общий вес:", (вес / 1048576).toFixed(1), "МБ");
check(мелкие === 0, `все страницы не меньше 1400px по ширине (мелких: ${мелкие})`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (u.includes("localhost:3000") && !u.endsWith(".mp4")) errors.push("не отдалось: " + u);
});
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1800);
await page.evaluate(() => document.querySelector("#packages").scrollIntoView({ block: "center" }));
await page.waitForTimeout(1000);

console.log("\nмодалка:");
await page.locator("#packages button", { hasText: /депозит/i }).first().click();
await page.waitForTimeout(800);
await page.locator(".u-food-tabs button", { hasText: "Меню" }).first().click();
await page.waitForTimeout(1400);

const лист = await page.evaluate(() => {
  const img = document.querySelector('.u-food-menu-page[data-position="active"] img');
  const r = img.getBoundingClientRect();
  return {
    адрес: decodeURIComponent(img.currentSrc),
    закругление: getComputedStyle(img).borderRadius,
    ширинаНаЭкране: Math.round(r.width),
    страниц: document.querySelectorAll(".u-food-menu-page").length,
  };
});
console.log("  ", JSON.stringify({ ...лист, адрес: лист.адрес.slice(0, 60) + "…" }));
check(лист.адрес.includes("page-01.webp"), "открывается первый разворот");
check(лист.закругление === "28px", `лист скруглён как карточки (${лист.закругление})`);
check(лист.страниц === 7, `в стопке все семь листов (${лист.страниц})`);

/* Листаем вперёд — должен смениться разворот. */
await page.locator('.u-food-menu-page[data-position="next"]').click();
await page.waitForTimeout(900);
const после = await page.evaluate(() =>
  decodeURIComponent(document.querySelector('.u-food-menu-page[data-position="active"] img').currentSrc),
);
check(после.includes("page-02.webp"), "стрелка вперёд листает на следующий разворот");

console.log("\nошибки консоли:", errors.length ? errors : "нет");
if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

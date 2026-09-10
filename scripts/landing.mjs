/*
  Посадка ключевых шагов: зал, пакет, дата, заявка.

  К блоку приходят тремя путями — по ссылке в меню, по чек-листу и
  подмагничиванием прокрутки, — и во всех трёх кадр должен быть один: заголовок
  ниже плавающей шапки, хвост блока (кнопка выбора, итог, форма) выше нижнего
  края экрана. Прежде посадка была разной у каждого блока: где-то заголовок
  уходил под шапку, где-то итог за нижний край.

  Проверяем на трёх ходовых размерах окна: масштаб страницы привязан и к
  ширине, и к высоте, поэтому одного размера мало.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

/** Чем заканчивается блок — до этого места он должен быть виден. */
const ХВОСТ = {
  halls: ".halls-actions",
  packages: ".u-package-card",
  price: '[data-node-id="914:1799"]',
  contact: "form",
};

const browser = await chromium.launch();

for (const [w, h] of [[1440, 950], [1366, 768], [1920, 1080]]) {
  console.log(`\n${w}×${h}:`);
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  for (const [id, хвост] of Object.entries(ХВОСТ)) {
    await page.goto(`http://localhost:3000/#${id}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1400);
    const r = await page.evaluate(
      ([sel, хвостSel]) => {
        const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
        const s = document.querySelector("#" + sel);
        const заголовок = s.querySelector(".u-heading").getBoundingClientRect();
        const низ = Math.max(
          ...[...s.querySelectorAll(хвостSel)].map((el) => el.getBoundingClientRect().bottom),
        );
        return {
          верх: Math.round(заголовок.top),
          хвост: Math.round(низ),
          окно: window.innerHeight,
          /* Низ логотипа плавающей шапки — 89 макетных px, плюс воздух. */
          шапка: Math.round(96 * scale),
        };
      },
      [id, хвост],
    );
    console.log(
      `  ${id.padEnd(9)} заголовок ${String(r.верх).padStart(4)} (шапка до ${r.шапка}), хвост ${String(r.хвост).padStart(4)} из ${r.окно}`,
    );
    check(r.верх >= r.шапка, `${id}: заголовок ниже шапки`);
    check(r.хвост <= r.окно, `${id}: блок виден до конца`);
  }
  await page.close();
}

console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

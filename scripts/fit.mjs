// Влезают ли секции в окно целиком, от заголовка до нижнего края.
import { chromium } from "playwright";
const KEY = ["halls", "packages", "price", "contact", "how", "where", "faq", "manager"];
const browser = await chromium.launch();
const sizes = [
  [1024, 620, 'ноутбук 13"'], [1280, 720, 'ноутбук 14"'], [1440, 780, 'ноутбук 15"'],
  [1440, 900, "макет"], [1600, 860, 'ноутбук 16"'], [1920, 945, 'монитор 24"'],
  [2560, 1305, 'монитор 27"'], [3840, 2025, "монитор 4K"],
];
console.log("окно".padEnd(12), "тип".padEnd(15), "масшт".padStart(6), "ширина".padStart(7), "  ключевые секции в окне");
for (const [w, h, label] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.querySelectorAll("img[loading=lazy]").forEach(i => i.loading = "eager"); });
  await page.waitForTimeout(700);
  const r = await page.evaluate((KEY) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const st = document.querySelector("main > .stage").getBoundingClientRect();
    const bad = [];
    let worst = 0;
    document.querySelectorAll("[data-section]").forEach((s) => {
      if (!KEY.includes(s.dataset.section)) return;
      const hgt = s.getBoundingClientRect().height;
      if (hgt > innerHeight) bad.push(`${s.dataset.section} ${Math.round(hgt)}>${innerHeight}`);
      worst = Math.max(worst, hgt);
    });
    return { rem, доля: Math.round(100 * st.width / innerWidth), bad, worst: Math.round(worst), окно: innerHeight };
  }, KEY);
  console.log(
    `${w}×${h}`.padEnd(12), label.padEnd(15),
    (r.rem / 16).toFixed(2).padStart(6), `${r.доля}%`.padStart(7),
    "  ", r.bad.length ? "НЕ ВЛЕЗЛИ: " + r.bad.join(", ") : `все влезают (самая высокая ${r.worst} из ${r.окно})`,
  );
  await page.close();
}
await browser.close();

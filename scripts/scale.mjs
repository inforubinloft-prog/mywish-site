// Масштаб сцены и переполнение первого экрана на разных окнах.
import { chromium } from "playwright";
const browser = await chromium.launch();
const sizes = [[1024, 700], [1280, 800], [1440, 900], [1440, 700], [1600, 900], [1920, 1080], [2560, 1440], [3440, 1440], [3840, 2160], [5120, 1440]];
console.log("окно".padEnd(12), "rem".padStart(6), "масштаб".padStart(8), "сцена".padStart(6), "доля".padStart(6), " гор.скролл  первый экран");
for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const st = document.querySelector("main > .stage").getBoundingClientRect();
    const hero = document.querySelector("#hero");
    const hb = hero.getBoundingClientRect();
    // самое нижнее, что реально нарисовано в первом экране
    let bottom = 0, top = 1e9;
    hero.querySelectorAll(".stage *").forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.width && b.height && getComputedStyle(el).visibility !== "hidden") {
        bottom = Math.max(bottom, b.bottom); top = Math.min(top, b.top);
      }
    });
    return {
      rem, сцена: Math.round(st.width), доля: Math.round(100 * st.width / innerWidth),
      скролл: document.documentElement.scrollWidth > innerWidth + 1,
      вылез: Math.round(Math.max(0, bottom - hb.bottom) + Math.max(0, hb.top - top)),
    };
  });
  console.log(
    `${w}×${h}`.padEnd(12),
    r.rem.toFixed(1).padStart(6),
    (r.rem / 16).toFixed(2).padStart(8),
    String(r.сцена).padStart(6),
    `${r.доля}%`.padStart(6),
    (r.скролл ? "  ЕСТЬ" : "  нет ").padEnd(12),
    r.вылез > 2 ? `ВЫЛЕЗ на ${r.вылез}px` : "влезает",
  );
  await page.close();
}
await browser.close();

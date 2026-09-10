// Проверка масштабирования на разных мониторах.
import { chromium } from "playwright";

const WIDTHS = [1024, 1280, 1440, 1600, 1920, 2560];
const browser = await chromium.launch();

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 80)));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url().split("/").pop()}`));
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const m = await page.evaluate(() => {
    const stage = document.querySelector(".stage");
    const hero = document.querySelector("#hero");
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return {
      root: Math.round(root * 100) / 100,
      scale: Math.round((root / 16) * 1000) / 1000,
      stageW: Math.round(stage.getBoundingClientRect().width),
      heroH: Math.round(hero.getBoundingClientRect().height),
      docW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      pageH: Math.round(document.body.scrollHeight),
    };
  });
  const hScroll = m.docW > m.clientW + 1;
  console.log(
    String(w).padStart(5) + "px",
    "| масштаб " + String(m.scale).padEnd(6),
    "| сцена " + String(m.stageW).padStart(4),
    "| hero " + String(m.heroH).padStart(4),
    "| высота " + String(m.pageH).padStart(6),
    "| гор. скролл: " + (hScroll ? "ЕСТЬ (" + (m.docW - m.clientW) + "px)" : "нет"),
    errors.length ? "| ошибки: " + errors.slice(0, 2).join(", ") : "",
  );
  await page.close();
}
await browser.close();

// Снимок страницы для сверки с макетом.
// node scripts/shot.mjs <out.png> [width] [height] [clipY] [clipH]
import { chromium } from "playwright";

const [, , out = "docs/shots/page.png", w = "1440", h = "956", clipY, clipH] = process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 1,
});
await page.goto("http://localhost:3000", { waitUntil: "load" });

// прокручиваем страницу, чтобы сработала ленивая загрузка
await page.evaluate(async () => {
  const step = window.innerHeight;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});

// ждём шрифты и все картинки
await page.evaluate(() => document.fonts.ready);
await page.evaluate(
  () =>
    new Promise((resolve) => {
      const pending = [...document.images].filter((i) => !i.complete);
      if (!pending.length) return resolve();
      let left = pending.length;
      const done = () => --left === 0 && resolve();
      pending.forEach((i) => {
        i.addEventListener("load", done, { once: true });
        i.addEventListener("error", done, { once: true });
      });
      setTimeout(resolve, 15000);
    }),
);

// видео фиксируем на первом кадре — снимки должны быть воспроизводимыми
await page.evaluate(() => {
  document.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.currentTime = 0;
  });
});
await page.waitForTimeout(500);

const opts = { path: out };
if (clipY !== undefined) {
  opts.fullPage = true;
  opts.clip = { x: 0, y: Number(clipY), width: Number(w), height: Number(clipH) };
}
await page.screenshot(opts);
await browser.close();
console.log("→", out);

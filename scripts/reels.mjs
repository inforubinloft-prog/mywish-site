// Reels: постеры, воспроизведение по наведению и отклик кнопки.
//
// Гоняем в режиме заказчика — «уменьшить анимацию» включено.
// node scripts/reels.mjs
import { chromium } from "playwright";

let bad = 0;
const check = (cond, text) => { if (!cond) bad++; console.log(`  ${cond ? "ok  " : "ПЛОХО"} ${text}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const errors = [];
const missing = [];
/*
  Считаем своими только ошибки со страницы. Виджет Яндекс-карты живёт в чужом
  iframe и тянет за собой рекламный cookie-sync — десяток запросов к биржам,
  часть которых всегда отваливается по сертификату или редиректам. К нашему
  коду это отношения не имеет, и молчать об этом виджет не умеет.
*/
const своя = (m) => {
  const url = m.location?.()?.url ?? "";
  return !url || url.includes("localhost:3000");
};
page.on("console", (m) => m.type() === "error" && своя(m) && errors.push(m.text()));
page.on("response", (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url()}`));
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => document.querySelector("#reels").scrollIntoView({ block: "center" }));
await page.waitForTimeout(700);

// ── постеры и разметка ────────────────────────────────────────
const cards = await page.evaluate(() =>
  [...document.querySelectorAll("#reels .u-reel")].map((b) => {
    const v = b.querySelector("video");
    const img = b.querySelector("img");
    const r = b.getBoundingClientRect();
    return {
      узел: b.dataset.nodeId,
      заставка: img?.getAttribute("src"),
      заставкаГотова: !!img?.complete && img.naturalWidth > 0,
      источники: [...v.querySelectorAll("source")].map((s) => s.getAttribute("src")),
      preload: v.preload,
      muted: v.muted,
      loop: v.loop,
      прозрачность: getComputedStyle(v).opacity,
      ширина: Math.round(r.width),
      высота: Math.round(r.height),
    };
  }),
);
console.log("карточки:");
for (const c of cards) console.log(`  ${c.узел}  ${c.ширина}×${c.высота}  заставка ${c.заставка}\n        ${c.источники.join("  ")}`);
check(cards.length === 3, `три карточки (сейчас ${cards.length})`);
check(cards.every((c) => c.muted && c.loop && c.preload === "none"), "все ролики без звука, зациклены, preload=none");

// заставка — ровно кадр из макета, а не кадр из ролика
check(
  cards.every((c) => /^\/figma\/reels\/n\d+\.webp$/.test(c.заставка ?? "")),
  "заставка каждой карточки — кадр из макета",
);
check(
  cards.every((c) => c.узел === `914:${c.заставка.match(/n(\d+)/)[1]}`),
  "кадр совпадает с нодой своей карточки",
);
check(cards.every((c) => c.заставкаГотова), "все заставки загрузились");
check(
  cards.every((c) => c.прозрачность === "0"),
  "в покое слой с роликом прозрачен — видна заставка",
);

// ── наведение: цвет кнопки и воспроизведение ──────────────────
const кнопка = () => page.evaluate(() => {
  const p = document.querySelector("#reels .u-reel .u-reel-play");
  const cs = getComputedStyle(p);
  return { видимость: cs.opacity, длительность: cs.transitionDuration };
});
const до = await кнопка();
await page.hover("#reels .u-reel");
await page.waitForTimeout(500);
const после = await кнопка();
console.log(`кнопка: видимость ${до.видимость} → ${после.видимость}`);
check(до.видимость === "1", "в покое кнопка воспроизведения видна");
check(Number(после.видимость) === 0, "под курсором кнопка уходит и не загораживает ролик");
check(!до.длительность.startsWith("0.01"), `при сниженной анимации переход остаётся плавным (${до.длительность})`);

// ролик пошёл
await page.waitForTimeout(1500);
const игра = await page.evaluate(() => {
  const v = document.querySelector("#reels .u-reel video");
  return { пауза: v.paused, время: +v.currentTime.toFixed(2), готовность: v.readyState, прозрачность: getComputedStyle(v).opacity };
});
console.log("после 2с наведения:", JSON.stringify(игра));
check(!игра.пауза && игра.время > 0, `ролик играет (${игра.время}с)`);
check(игра.прозрачность === "1", `слой с роликом проявился (прозрачность ${игра.прозрачность})`);

// увели курсор — встал и отмотался
await page.mouse.move(10, 10);
await page.waitForTimeout(400);
const стоп = await page.evaluate(() => {
  const v = document.querySelector("#reels .u-reel video");
  return { пауза: v.paused, время: +v.currentTime.toFixed(2), прозрачность: getComputedStyle(v).opacity };
});
console.log("после ухода курсора:", JSON.stringify(стоп));
check(стоп.пауза && стоп.время === 0, "на уходе курсора ролик встал и отмотался в начало");
check(стоп.прозрачность === "0", "слой снова прозрачен — вернулась заставка из макета");

// соседние карточки не запускались
const прочие = await page.evaluate(() =>
  [...document.querySelectorAll("#reels video")].slice(1).map((v) => v.paused),
);
check(прочие.every(Boolean), "соседние карточки не запускались");

console.log("\nошибки консоли:", errors.length ? errors : "нет");
console.log("не отдалось сервером:", missing.length ? missing : "нет");
if (errors.length || missing.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

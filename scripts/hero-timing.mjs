// Тайминги первого экрана: когда выезжает шапка и когда раскрывается левый блок.
//
// Отсчёт идёт от момента, когда пошло видео, поэтому и здесь ждём события
// playing, а не загрузки страницы. Гоняем в обоих режимах анимации.
//
// node scripts/hero-timing.mjs
import { chromium } from "playwright";

const ОЖИДАНИЕ = { шапка: 360, раскрытие: 4080 };
const ДОПУСК = 400;

let bad = 0;
const check = (cond, text) => {
  if (!cond) bad++;
  console.log(`  ${cond ? "ok  " : "ПЛОХО"} ${text}`);
};

const browser = await chromium.launch();

for (const mode of ["reduce", "no-preference"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: mode });
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });

  // засекаем от старта видео и ловим оба момента в одном проходе
  const timeline = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const intro = document.querySelector(".hero-video");
        const gates = () => document.querySelectorAll(".hero-gate");
        const seam = () => document.querySelector(".hero-seam");
        const out = {};
        let t0 = null;

        const finish = () => resolve(out);
        const tick = () => {
          if (t0 === null) return requestAnimationFrame(tick);
          const now = performance.now() - t0;
          const g = gates();
          if (out.шапка === undefined && g[0]?.dataset.shown === "true") out.шапка = Math.round(now);
          if (out.раскрытие === undefined && g[1]?.dataset.shown === "true") out.раскрытие = Math.round(now);
          if (out.растворение === undefined && seam()?.dataset.shown === "true")
            out.растворение = Math.round(now);
          if (out.шапка !== undefined && out.раскрытие !== undefined && out.растворение !== undefined)
            return finish();
          if (now > 15000) return finish();
          requestAnimationFrame(tick);
        };

        const start = () => {
          if (t0 === null) t0 = performance.now();
        };
        intro?.addEventListener("playing", start, { once: true });
        /* Если видео не пошло — сценарий стартует по запасному таймеру на 600мс. */
        setTimeout(start, 600);
        requestAnimationFrame(tick);
      }),
  );

  console.log(`\nрежим ${mode}:`);
  console.log(`  шапка         ${timeline.шапка}мс   (ждём ${ОЖИДАНИЕ.шапка})`);
  console.log(`  раскрытие     ${timeline.раскрытие}мс  (ждём ${ОЖИДАНИЕ.раскрытие})`);
  console.log(`  растворение   ${timeline.растворение}мс  (вместе с раскрытием)`);

  check(Math.abs(timeline.шапка - ОЖИДАНИЕ.шапка) < ДОПУСК, `шапка выезжает почти сразу`);
  check(Math.abs(timeline.раскрытие - ОЖИДАНИЕ.раскрытие) < ДОПУСК, `левый блок раскрывается на 4.08с`);
  check(timeline.растворение === timeline.раскрытие, `растворение внизу приходит тем же кадром, что заливка`);

  // длительности не съедены общим правилом доступности
  const dur = await page.evaluate(() => ({
    заливка: getComputedStyle(document.querySelector(".hero-veil")).transitionDuration,
    растворение: getComputedStyle(document.querySelector(".hero-seam")).transitionDuration,
    высотаРастворения: Math.round(
      document.querySelector(".hero-seam").getBoundingClientRect().height /
        (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16),
    ),
  }));
  console.log(`  заливка ${dur.заливка}, растворение ${dur.растворение}, высота полосы ${dur.высотаРастворения} макетных px`);
  check(dur.растворение === "0.38s", `растворение плавное (${dur.растворение})`);
  check(dur.высотаРастворения === 140, `полоса стала ниже: ${dur.высотаРастворения} вместо 220`);

  await page.close();
}

console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

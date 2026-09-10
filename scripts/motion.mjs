// Проверка сценария в том же режиме, что у заказчика: сниженная анимация включена.
import { chromium } from "playwright";

const browser = await chromium.launch();
for (const mode of ["reduce", "no-preference"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: mode });
  await page.goto("http://localhost:3000", { waitUntil: "load" });

  /*
    Замер выезда шапки запускаем сразу и ждём его в самом конце: панель теперь
    приходит на 0.36с и укладывается за секунду, а проверка наезда ниже держит
    паузу в 2.5с — если мерить после неё, попадёшь в хвост, где всё уже стоит.
  */
  const dropPromise = page.evaluate(() => new Promise((resolve) => {
    let t0 = null;
    const tick = () => {
      const g = document.querySelectorAll(".hero-gate")[0];
      if (g?.dataset.shown === "true" && t0 === null) t0 = performance.now();
      if (t0 !== null && performance.now() - t0 >= 150) {
        return resolve([...document.querySelectorAll(".hero-drop")].map((e) => {
          const t = getComputedStyle(e).transform;
          return "y=" + (t === "none" ? 0 : Math.round(parseFloat(t.split(",").pop())));
        }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));

  // наезд
  await page.waitForFunction(() => document.querySelector(".hero-zoom")?.dataset.shown === "true", null, { timeout: 8000 });
  const z1 = await page.evaluate(() => getComputedStyle(document.querySelector(".hero-zoom")).transform);
  await page.waitForTimeout(2500);
  const z2 = await page.evaluate(() => getComputedStyle(document.querySelector(".hero-zoom")).transform);

  const drop = await dropPromise;

  // раскрытие
  await page.waitForFunction(() => document.querySelectorAll(".hero-gate")[1]?.dataset.shown === "true", null, { timeout: 15000 });
  await page.waitForTimeout(180);
  const mid = await page.evaluate(() => ({
    вуаль: getComputedStyle(document.querySelector(".hero-veil")).clipPath.slice(0, 24),
    напечатано: [...document.querySelectorAll(".hero-type")].map((t) => [...t.querySelectorAll("span[data-ch]")].filter((s) => getComputedStyle(s).opacity !== "0").length),
  }));

  console.log(`режим ${mode}:`);
  console.log("   наезд:", z1.slice(0, 22), "→", z2.slice(0, 22));
  console.log("   шапка через 150мс после включения:", drop.join(" "));
  console.log("   через 180мс после хлопка:", JSON.stringify(mid));
  await page.close();
}
await browser.close();

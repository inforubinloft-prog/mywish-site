import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 956 } });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.waitForTimeout(1500);

const state = async (label) => {
  const s = await page.evaluate(() => {
    const [loop, intro] = [...document.querySelectorAll("#hero video")];
    return {
      intro: { t: +intro.currentTime.toFixed(1), dur: +intro.duration.toFixed(1), paused: intro.paused, opacity: getComputedStyle(intro).opacity },
      loop: { t: +loop.currentTime.toFixed(1), paused: loop.paused, loops: loop.loop },
    };
  });
  console.log(label.padEnd(22), "интро", s.intro.t + "/" + s.intro.dur, "opacity", s.intro.opacity, "| луп", s.loop.t, s.loop.paused ? "пауза" : "играет", s.loop.loops ? "(зациклен)" : "");
};

await state("старт");
// перематываем интро к концу
await page.evaluate(() => {
  const intro = [...document.querySelectorAll("#hero video")][1];
  intro.currentTime = Math.max(0, intro.duration - 0.4);
});
await page.waitForTimeout(2000);
await state("после конца интро");
await page.waitForTimeout(1500);
await state("через 1.5с");
await browser.close();

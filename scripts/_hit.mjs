import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector("#halls").scrollIntoView({ block: "center" }));
await page.waitForTimeout(2000);

/* Середина видимой части этажа: берём центр многоугольника его маски. */
const точки = await page.evaluate(() => {
  const out = [];
  for (const b of document.querySelectorAll("[data-hall-option]")) {
    const r = b.getBoundingClientRect();
    const clip = getComputedStyle(b).clipPath;
    const nums = [...clip.matchAll(/([\d.]+)%\s+([\d.]+)%/g)].map((m) => [+m[1], +m[2]]);
    const cx = nums.reduce((a, p) => a + p[0], 0) / nums.length;
    const cy = nums.reduce((a, p) => a + p[1], 0) / nums.length;
    out.push({ slug: b.dataset.hallOption, x: r.x + (r.width * cx) / 100, y: r.y + (r.height * cy) / 100 });
  }
  return out;
});

for (const т of точки) {
  await page.mouse.move(т.x, т.y);
  await page.waitForTimeout(350);
  const [под, вкл] = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return [
      el?.dataset?.hallOption ?? el?.className ?? el?.tagName,
      [...document.querySelectorAll('.hall-state[data-on="true"]')].map((i) => i.currentSrc.split("/").pop()),
    ];
  }, [т.x, т.y]);
  const ок = под === т.slug && вкл.join() === `${т.slug}--hover.webp`;
  console.log(`  ${ок ? "ok  " : "ПЛОХО"} ${т.slug.padEnd(12)} курсор попал в: ${String(под).padEnd(14)} включилось: ${вкл.join(" ") || "ничего"}`);
}
await browser.close();

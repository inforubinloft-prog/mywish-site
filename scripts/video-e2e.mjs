// Полный прогон: интро играет до конца, затем передаёт эстафету лупу.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 } });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.waitForTimeout(1000);

const snap = async (label) => {
  const s = await page.evaluate(() => {
    const [loop, intro] = [...document.querySelectorAll("#hero video")];
    return {
      i: +intro.currentTime.toFixed(1),
      idur: +intro.duration.toFixed(1),
      iend: intro.ended,
      iop: getComputedStyle(intro).opacity,
      l: +loop.currentTime.toFixed(1),
      lp: loop.paused,
    };
  });
  console.log(
    label.padEnd(20),
    `интро ${s.i}/${s.idur}${s.iend ? " (конец)" : ""} opacity ${s.iop}`,
    `| луп ${s.l} ${s.lp ? "пауза" : "играет"}`,
  );
  return s;
};

await snap("1 c");
await page.waitForTimeout(9000);
await snap("10 c");
await page.waitForTimeout(9000);
await snap("19 c");
await page.waitForTimeout(7000);
await snap("26 c (после интро)");
await page.waitForTimeout(4000);
await snap("30 c");
await browser.close();

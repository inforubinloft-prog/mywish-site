// Проверка без флагов автозапуска — как в обычном браузере.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 956 } });
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 120)));
page.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 120)));
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.waitForTimeout(2500);

const s = await page.evaluate(() => {
  const vs = [...document.querySelectorAll("#hero video")];
  return vs.map((v, i) => ({
    i,
    src: v.currentSrc.split("/").pop() || "(нет)",
    paused: v.paused,
    muted: v.muted,
    hasMutedAttr: v.hasAttribute("muted"),
    autoplayAttr: v.hasAttribute("autoplay"),
    t: +v.currentTime.toFixed(2),
    readyState: v.readyState,
    networkState: v.networkState,
    error: v.error ? v.error.code + " " + v.error.message : null,
  }));
});
console.log(JSON.stringify(s, null, 1));
if (errs.length) console.log("ошибки:", errs.join("\n"));
await browser.close();

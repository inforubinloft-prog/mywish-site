// Высота каждого ответа в раскрытом виде и запас до подвала.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.locator("#faq").scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
for (let i = 0; i < 8; i++) {
  await page.locator("#faq details").nth(i).locator("summary").click();
  await page.waitForTimeout(120);
  const r = await page.evaluate((i) => {
    const d = document.querySelectorAll("#faq details")[i];
    const list = d.parentElement.getBoundingClientRect();
    const footer = document.querySelector("footer").getBoundingClientRect();
    return { h: d.getBoundingClientRect().height, список: list.height, запас: footer.top - list.bottom, вопрос: d.querySelector("summary span:nth-child(2)").textContent };
  }, i);
  console.log(
    String(i + 1).padStart(2, "0"),
    String(Math.round(r.h / rem)).padStart(4),
    "| список", String(Math.round(r.список / rem)).padStart(4),
    "| запас до подвала", String(Math.round(r.запас / rem)).padStart(4),
    "|", r.вопрос.slice(0, 40),
  );
}
await browser.close();

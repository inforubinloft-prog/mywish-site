// Подвал: логотип, ссылки адресов, отклик иконок, баннер и модалки документов.
import { chromium } from "playwright";
const OUT = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.locator("footer").scrollIntoViewIfNeeded();
await page.waitForTimeout(900);

console.log("логотип:", await page.evaluate(() => {
  const i = document.querySelector('footer img[src*="footer-logo"]');
  const b = i.getBoundingClientRect();
  return i ? `${i.getAttribute("alt")} · ${Math.round(b.width)}×${Math.round(b.height)} · загружен ${i.complete && i.naturalWidth > 0}` : "нет";
}));

console.log("адреса:", await page.evaluate(() =>
  [...document.querySelectorAll('footer a[href*="maps/org"]')].map((a) => a.textContent.replace("Яндекс Карты", "").trim() + " → " + a.href.split("/").at(-2)).join(" | ")));

// отклик иконок
const icon = "footer .u-msgr";
const before = await page.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return c.borderColor + " " + c.translate; }, icon);
await page.locator(icon).first().hover();
await page.waitForTimeout(300);
const after = await page.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return c.borderColor + " " + c.translate; }, icon);
console.log("иконка мессенджера:", before, "→", after);

// баннер
const band = "aside.u-cta-band";
const readBand = () => page.evaluate((s) => {
  const el = document.querySelector(s);
  return {
    плашка: getComputedStyle(el).backgroundColor,
    заголовок: getComputedStyle(el.querySelector(".u-heading")).color,
    акцент: getComputedStyle(el.querySelector(".u-heading em")).color,
    кнопка: getComputedStyle(el.querySelector("a")).backgroundColor + " / " + getComputedStyle(el.querySelector("a")).color,
  };
}, band);
const b0 = await readBand();
await page.locator(band).hover();
await page.waitForTimeout(350);
const b1 = await readBand();
for (const k of Object.keys(b0)) console.log(("баннер · " + k).padEnd(22), b0[k], "→", b1[k]);
await page.mouse.move(0, 0);
await page.waitForTimeout(300);

// модалки
for (const label of ["Реквизиты организации", "Реквизиты", "Конфиденциальность", "Согласие", "Cookie"]) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(350);
  const r = await page.evaluate(() => {
    // Модалок на странице две — в подвале и в форме. Берём открытую.
    const d = [...document.querySelectorAll("dialog.u-legal")].find((x) => x.open);
    if (!d) return { открыт: false, разделов: 0 };
    return { открыт: d.open, заголовок: d.querySelector("h2")?.textContent, разделов: d.querySelectorAll("section").length, символов: d.querySelector(".u-legal-body")?.innerText.length };
  });
  console.log(`«${label}»`.padEnd(26), r.открыт ? "открыт" : "НЕ ОТКРЫЛСЯ", "|", r.заголовок, "| разделов", r.разделов, "| символов", r.символов);
  if (label === "Конфиденциальность") await page.screenshot({ path: `${OUT}/legal.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const closed = await page.evaluate(() => ![...document.querySelectorAll("dialog.u-legal")].some((x) => x.open));
  if (!closed) console.log("   ! Escape не закрыл");
}
await browser.close();

// Проверка формы: маска телефона, списки, обязательные поля.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.locator("#contact").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

// маска телефона
const cases = [["9161234567", "полный номер"], ["89161234567", "с восьмёркой"], ["+7 916 12", "частичный"], ["4951234567", "городской — цифры до девятки отбрасываются"], ["916123456789", "лишние цифры"]];
for (const [input, title] of cases) {
  await page.fill("#phone", "");
  await page.type("#phone", input, { delay: 5 });
  console.log(`${title.padEnd(42)} «${input}» → «${await page.inputValue("#phone")}»`);
}
// стирание
await page.fill("#phone", "");
await page.type("#phone", "9161234567", { delay: 5 });
for (let i = 0; i < 3; i++) await page.press("#phone", "Backspace");
console.log("после трёх Backspace:".padEnd(42), `«${await page.inputValue("#phone")}»`);

// списки
const halls = await page.$$eval("#hall option", (o) => o.map((x) => x.textContent));
const guests = await page.$$eval("#guests option", (o) => o.map((x) => x.textContent));
console.log(`\nзалы (${halls.length - 1}): ${halls.slice(1).join(", ")}`);
console.log(`гости (${guests.length - 1}): от ${guests[1]} до ${guests.at(-1)}`);

// обязательные поля
await page.fill("#phone", "");
await page.fill("#name", "");
await page.click('#contact button[type="submit"]');
await page.waitForTimeout(150);
const state = await page.evaluate(() => {
  const n = document.querySelector("#name"), p = document.querySelector("#phone");
  return {
    имя: { тряска: n.classList.contains("u-shake"), обводка: getComputedStyle(n).borderColor, invalid: n.getAttribute("aria-invalid") },
    телефон: { тряска: p.classList.contains("u-shake"), обводка: getComputedStyle(p).borderColor, invalid: p.getAttribute("aria-invalid") },
    фокус: document.activeElement.id,
    подпись: document.querySelector('#contact form > p:last-child').textContent.trim(),
    анимация: getComputedStyle(n).animationDuration,
  };
});
console.log("\nпустая отправка:", JSON.stringify(state, null, 1));

// заполнили поля, но согласие не отмечено — заявка не уходит
await page.fill("#name", "Лада");
await page.type("#phone", "9161234567", { delay: 5 });
await page.click('#contact button[type="submit"]');
await page.waitForTimeout(150);
const noConsent = await page.evaluate(() => {
  const box = document.querySelector("#consent");
  return {
    отмечено: box.checked,
    invalid: box.getAttribute("aria-invalid"),
    тряска: box.closest("div").classList.contains("u-shake"),
    фокус: document.activeElement.id,
    подпись: document.querySelector('#contact form > p:last-child').textContent.trim(),
  };
});
console.log("\nбез согласия:", JSON.stringify(noConsent, null, 1));

// ссылки в расшифровке открывают документы тем же окном, что и в подвале
const links = await page.$$eval("#contact .u-legal-link", (b) => b.map((x) => x.textContent.trim()));
console.log("ссылки в расшифровке:", links.join(" · "));
await page.click("#contact .u-legal-link");
await page.waitForTimeout(300);
const doc = await page.evaluate(() => {
  const d = [...document.querySelectorAll("dialog.u-legal")].find((x) => x.open);
  return d ? { заголовок: d.querySelector(".u-legal-title").textContent.trim(), редакция: d.querySelector(".u-legal-version")?.textContent.trim() } : null;
});
console.log("открылся документ:", JSON.stringify(doc));
await page.keyboard.press("Escape");
await page.waitForTimeout(250);

// отметили согласие — заявка уходит
await page.click("#consent");
await page.click('#contact button[type="submit"]');
await page.waitForTimeout(150);
console.log("с согласием:", await page.evaluate(() => document.querySelector('#contact form > p:last-child').textContent.trim()));

/*
  Одно и то же число в двух местах страницы: итог калькулятора и сводка над
  кнопкой отправки. Считает его общий расчёт (totalOf в pricing.ts) — здесь
  проверяем, что оба места берут именно его, а не считают по-своему:
  разойтись они могли бы на декабрьском тарифе.
*/
const итоги = await page.evaluate(() => ({
  калькулятор: document
    .querySelector('[data-node-id="914:1753"]')
    .querySelectorAll("p")[1]
    .textContent.trim(),
  форма: document.querySelector(".u-form-total")?.textContent.replace(/s+/g, " ").trim(),
}));
const цифры = (t) => (t ?? "").replace(/[^0-9]/g, "");
console.log(
  "сумма: калькулятор " + итоги.калькулятор + " | форма " + итоги.форма +
    (цифры(итоги.форма) === цифры(итоги.калькулятор) ? "  — сходится" : "  — РАСХОДЯТСЯ"),
);

await browser.close();

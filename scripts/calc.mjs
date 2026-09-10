// Проверка калькулятора: выбор даты, пакета, часов и перенос выбора из карточек.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const s = document.querySelector("#price");
  const total = s.querySelector('[data-node-id="914:1753"] p:nth-child(2)').textContent.trim();
  const detail = s.querySelector('[data-node-id="914:1753"] p:last-child').innerText.replace(/\n/g, " | ");
  const month = s.querySelector('[data-node-id="914:1564"] span.font-display').textContent.trim();
  const pkg = [...s.querySelectorAll('[data-node-id="914:1777"] button')].find(b => b.getAttribute("aria-pressed") === "true");
  const hrs = [...s.querySelectorAll('[data-node-id="914:1761"] button')].find(b => b.getAttribute("aria-pressed") === "true");
  const day = [...s.querySelectorAll('[data-node-id="914:1564"] .u-day')].find(b => b.getAttribute("aria-pressed") === "true");
  return { month, день: day ? day.textContent.trim().split(/\s+/)[0] : "—", пакет: pkg ? pkg.querySelectorAll("span")[1].textContent : "—", часы: hrs ? hrs.textContent.trim() : "—", итого: total, расшифровка: detail };
});

const show = (t, r) => console.log(`${t}\n  месяц ${r.month} | день ${r.день} | ${r.пакет} | ${r.часы}\n  ИТОГО ${r.итого}\n  ${r.расшифровка}\n`);

show("старт:", await read());

// прошедшие дни не нажимаются
const past = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#price .u-day')].find(x => x.disabled);
  return b ? b.textContent.trim().split(/\s+/)[0] : null;
});
console.log("первый прошедший день заблокирован:", past ?? "прошедших нет (месяц начался сегодня)");

// выбираем субботу — самый дорогой день месяца
await page.evaluate(() => {
  const days = [...document.querySelectorAll('#price .u-day')].filter((x) => !x.disabled);
  const цена = (el) => Number(el.querySelectorAll('span')[1].textContent.replace(/[^0-9]/g, ''));
  days.sort((a, b) => цена(b) - цена(a))[0].click();
});
await page.waitForTimeout(200);
show("выбрали субботу:", await read());

// 8 часов
await page.evaluate(() => [...document.querySelectorAll('[data-node-id="914:1761"] button')].at(-1).click());
await page.waitForTimeout(200);
show("8 часов:", await read());

// пакет «Хэппи» в самом калькуляторе
await page.evaluate(() => document.querySelector('[data-node-id="914:1777"] button').click());
await page.waitForTimeout(200);
show("пакет Хэппи:", await read());

// «выбрать» на карточке «Вау» — выбор должен доехать до калькулятора
await page.evaluate(() => document.querySelector('#packages article:nth-of-type(3) a.u-chip').click());
await page.waitForTimeout(300);
show("нажали ВЫБРАТЬ на «Вау»:", await read());
console.log("адрес после клика:", new URL(page.url()).hash);

// листаем месяцы
for (let i = 0; i < 12; i++) await page.click('#price button[aria-label="Следующий месяц"]').catch(() => {});
await page.waitForTimeout(200);
const last = await read();
console.log("последний доступный месяц:", last.month);
const nextDisabled = await page.evaluate(() => document.querySelector('#price button[aria-label="Следующий месяц"]').disabled);
const prevAt0 = await page.evaluate(() => { document.querySelector('#price button[aria-label="Предыдущий месяц"]'); return true; });
console.log("кнопка «вперёд» на пределе заблокирована:", nextDisabled);
for (let i = 0; i < 12; i++) await page.click('#price button[aria-label="Предыдущий месяц"]').catch(() => {});
await page.waitForTimeout(200);
console.log("вернулись в:", (await read()).month, "| «назад» заблокирована:", await page.evaluate(() => document.querySelector('#price button[aria-label="Предыдущий месяц"]').disabled));

// геометрия подписи под калькулятором
const note = await page.evaluate(() => {
  const s = document.querySelector("#price").getBoundingClientRect();
  const p = document.querySelector('[data-node-id="914:1799"]');
  const b = p.getBoundingClientRect();
  const cal = document.querySelector('[data-node-id="914:1564"]').getBoundingClientRect();
  const lh = parseFloat(getComputedStyle(p).lineHeight);
  const r = document.createRange(); r.selectNodeContents(p);
  const t = r.getBoundingClientRect();
  return { правыйКрайТекста: Math.round(t.right - s.x), правыйКрайКалендаря: Math.round(cal.right - s.x), строк: Math.round(t.height / lh), шире: Math.round(t.width - b.width) };
});
console.log("подпись:", JSON.stringify(note));
await browser.close();

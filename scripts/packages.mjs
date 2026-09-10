/*
  Выбор пакета в шестом блоке.

  Три карточки — это переключатель. Проверяем, что он ведёт себя как
  переключатель: под курсором карточка выходит вперёд и обводится, соседние
  тускнеют и теряют Руби, а после нажатия это состояние закрепляется за
  выбранной, даже когда курсор ушёл.
*/
import { chromium } from "playwright";

let bad = 0;
const check = (c, t) => { if (!c) bad++; console.log(`  ${c ? "ok  " : "ПЛОХО"} ${t}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const errors = [];
const своя = (m) => { const u = m.location?.()?.url ?? ""; return !u || u.includes("localhost:3000"); };
page.on("console", (m) => m.type() === "error" && своя(m) && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e.message)));

await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1600);
await page.evaluate(() => document.querySelector("#packages").scrollIntoView({ block: "center" }));
await page.waitForTimeout(1200);

const снимок = () =>
  page.evaluate(() =>
    [...document.querySelectorAll(".u-package-card")].map((c) => {
      const cs = getComputedStyle(c);
      const руби = c.querySelector(".u-package-mascot");
      return {
        пакет: c.dataset.package,
        фильтр: cs.filter,
        подъём: cs.translate,
        обводка: cs.outlineWidth + " " + cs.outlineColor,
        руби: Number(getComputedStyle(руби).opacity).toFixed(2),
      };
    }),
  );

console.log("в покое:");
const покой = await снимок();
for (const c of покой) console.log(`  ${c.пакет.padEnd(6)} фильтр ${c.фильтр.padEnd(24)} руби ${c.руби} обводка ${c.обводка}`);
check(покой.every((c) => c.фильтр === "none"), "без курсора все три в полную силу");
check(покой.every((c) => c.руби === "1.00"), "Руби на месте во всех трёх");
check(покой.every((c) => c.обводка.startsWith("0px")), "обводки ни у кого нет");

console.log("\nпод курсором «Экстра»:");
await page.hover('.u-package-card[data-package="extra"]');
await page.waitForTimeout(700);
const наведение = await снимок();
for (const c of наведение) console.log(`  ${c.пакет.padEnd(6)} фильтр ${c.фильтр.padEnd(24)} руби ${c.руби} подъём ${c.подъём} обводка ${c.обводка}`);
const под = наведение.find((c) => c.пакет === "extra");
const соседи = наведение.filter((c) => c.пакет !== "extra");
check(под.фильтр === "none", "карточка под курсором не приглушена");
check(под.подъём !== "none" && под.подъём !== "0px", `она приподнимается (${под.подъём})`);
check(под.обводка.includes("rgb(219, 64, 79)") && !под.обводка.startsWith("0px"), `у неё появилась обводка (${под.обводка})`);
check(соседи.every((c) => c.фильтр !== "none"), "соседние приглушены фильтром");
check(соседи.every((c) => Number(c.руби) === 0), "Руби из соседних убран полностью");

console.log("\nпосле нажатия по карточке «Вау» (мимо кнопки):");
await page.locator('.u-package-card[data-package="wow"] h3').click();
await page.waitForTimeout(600);
await page.mouse.move(20, 400);
await page.waitForTimeout(800);
const выбран = await снимок();
for (const c of выбран) console.log(`  ${c.пакет.padEnd(6)} фильтр ${c.фильтр.padEnd(24)} руби ${c.руби} обводка ${c.обводка}`);
const свой = выбран.find((c) => c.пакет === "wow");
const прочие = выбран.filter((c) => c.пакет !== "wow");
check(свой.фильтр === "none", "выбранная карточка в полную силу");
check(свой.обводка.includes("rgb(219, 64, 79)"), "обводка закрепилась за выбранной");
check(прочие.every((c) => c.фильтр !== "none"), "остальные две держат тусклое состояние без курсора");
check(прочие.every((c) => Number(c.руби) === 0), "и остаются без Руби");

const состояние = await page.evaluate(() => ({
  признак: document.getElementById("packages").dataset.picked,
  кнопка: document.querySelector('.u-package-card[data-package="wow"] .u-chip').textContent.trim(),
  вРасчёте: document.querySelector('[data-node-id="914:1753"]').querySelectorAll("p")[2].textContent,
  адрес: location.hash,
}));
console.log("  ", JSON.stringify(состояние).slice(0, 160));
check(состояние.признак === "wow", "секция знает выбранный пакет");
check(состояние.кнопка === "ВЫБРАН", `надпись на кнопке сменилась (${состояние.кнопка})`);
check(состояние.вРасчёте.includes("«Вау»"), "выбор доехал до расчёта");
check(состояние.адрес === "#price", "нажатие уводит к расчёту");

console.log("\nнаведение важнее выбора:");
await page.hover('.u-package-card[data-package="happy"]');
await page.waitForTimeout(700);
const поверх = await снимок();
check(
  поверх.find((c) => c.пакет === "happy").фильтр === "none" &&
    поверх.find((c) => c.пакет === "wow").фильтр !== "none",
  "под курсором показывается наведённая, а не выбранная раньше",
);

console.log("\nошибки консоли:", errors.length ? errors : "нет");
console.log("");
console.log("отмена повторным нажатием:");
await page.mouse.move(20, 400);
await page.waitForTimeout(400);
await page.locator('.u-package-card[data-package="wow"] .u-chip').click();
await page.waitForTimeout(700);
await page.mouse.move(20, 400);
await page.waitForTimeout(700);
const снято = await снимок();
const состояние2 = await page.evaluate(() => ({
  признак: document.getElementById("packages").dataset.picked,
  кнопка: document.querySelector('.u-package-card[data-package="wow"] .u-chip').textContent.trim(),
}));
console.log("  ", JSON.stringify(состояние2));
check(состояние2.признак === "", "признак выбора снят с секции");
check(состояние2.кнопка === "ВЫБРАТЬ", "надпись на кнопке вернулась");
check(снято.every((c) => c.фильтр === "none"), "все три снова в полную силу");
check(снято.every((c) => c.руби === "1.00"), "Руби вернулся во все три");
check(снято.every((c) => c.обводка.startsWith("0px")), "обводки не осталось");

/*
  Блок должен помещаться на экран целиком — от заголовка до нижнего края
  карточек. Проверяем на четырёх ходовых размерах окна: масштаб страницы
  привязан и к ширине, и к высоте, поэтому одного размера мало.
*/
console.log("");
console.log("блок помещается на экран:");
for (const [w, h] of [[1440, 950], [1536, 864], [1920, 1080], [1366, 768]]) {
  const лист = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  await лист.goto("http://localhost:3000/#packages", { waitUntil: "load" });
  await лист.evaluate(() => document.fonts.ready);
  await лист.waitForTimeout(1400);
  const запас = await лист.evaluate(() => {
    const s = document.querySelector("#packages");
    const верх = s.querySelector(".u-heading").getBoundingClientRect().top;
    const низ = Math.max(
      ...[...s.querySelectorAll(".u-package-card")].map((c) => c.getBoundingClientRect().bottom),
    );
    return { сверху: Math.round(верх), снизу: Math.round(window.innerHeight - низ) };
  });
  console.log(`  ${w}×${h}: сверху ${запас.сверху}px, снизу ${запас.снизу}px`);
  check(запас.сверху >= 0 && запас.снизу >= 0, `${w}×${h} — блок целиком в кадре`);
  await лист.close();
}

if (errors.length) bad++;
console.log(bad ? `\nпровалов: ${bad}` : "\nвсё сошлось");
await browser.close();
process.exit(bad ? 1 : 0);

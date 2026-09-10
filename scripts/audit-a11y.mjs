// Доступность и семантика: контраст, заголовки, ориентиры, подписи, клавиатура.
//
// Меряет на живой странице, а не читает код: контраст зависит от того, что
// реально оказалось под текстом, а порядок обхода — от разметки после гидрации.
//
// node scripts/audit-a11y.mjs [путь]
import { chromium } from "playwright";

const PATHS = process.argv[2] ? [process.argv[2]] : ["/", "/halls"];

/** Относительная яркость по WCAG 2.1. */
const lum = ([r, g, b]) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const browser = await chromium.launch();

for (const route of PATHS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await page.goto("http://localhost:3000" + route, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  console.log(`\n${"=".repeat(66)}\n${route}\n${"=".repeat(66)}`);

  // ── контраст текста ────────────────────────────────────────
  const texts = await page.evaluate(() => {
    const parse = (c) => {
      const m = c.match(/[\d.]+/g);
      if (!m) return null;
      return { rgb: [+m[0], +m[1], +m[2]], a: m[3] === undefined ? 1 : +m[3] };
    };
    /**
     * Фон под элементом.
     *
     * Идём вверх и складываем слои: полупрозрачную подложку нельзя просто
     * пропустить — плашка счётчика на карточке зала это тёмно-синий под 62 %,
     * и если взять слой над ней, получится белый текст на белом и ложная
     * тревога 1.1. Собираем стопку и смешиваем сверху вниз.
     */
    const backdrop = (el) => {
      const stack = [];
      let node = el;
      while (node && node !== document.documentElement) {
        const cs = getComputedStyle(node);
        /* Видео и картинка под текстом — фон подвижный, считать нечего. */
        if (cs.backgroundImage !== "none" && !cs.backgroundImage.includes("gradient"))
          return { rgb: null, надЧем: "картинка" };
        const bg = parse(cs.backgroundColor);
        if (bg && bg.a > 0) {
          stack.push(bg);
          if (bg.a >= 0.999) break;
        }
        node = node.parentElement;
      }
      /* Снизу вверх: под всей стопкой — белый лист. */
      let base = [255, 255, 255];
      for (const layer of stack.reverse())
        base = layer.rgb.map((v, i) => Math.round(v * layer.a + base[i] * (1 - layer.a)));
      return { rgb: base, надЧем: stack.length ? "слоёв " + stack.length : "страница" };
    };

    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim();
      if (t.length < 2) continue;
      const el = n.parentElement;
      if (!el || seen.has(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      /* Внутри видеогероя фон подвижный — контраст там считается отдельно. */
      const overVideo = !!el.closest(".halls-hero, .hero-halls-sticky");
      seen.add(el);
      const fg = parse(cs.color);
      const bg = backdrop(el);
      const size = parseFloat(cs.fontSize);
      const weight = +cs.fontWeight || 400;
      out.push({
        текст: t.slice(0, 42),
        селектор: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""),
        fg: fg?.rgb ?? null,
        fgA: fg?.a ?? 1,
        bg: bg.rgb,
        надЧем: bg.надЧем,
        крупный: size >= 24 || (weight >= 700 && size >= 18.66),
        size: Math.round(size),
        наВидео: overVideo,
      });
    }
    return out;
  });

  const bad = [];
  for (const t of texts) {
    if (!t.fg || !t.bg || t.наВидео) continue;
    /* Полупрозрачный текст сначала смешиваем с фоном — иначе контраст завышен. */
    const fg = t.fgA >= 1 ? t.fg : t.fg.map((v, i) => Math.round(v * t.fgA + t.bg[i] * (1 - t.fgA)));
    const r = ratio(fg, t.bg);
    const need = t.крупный ? 3 : 4.5;
    if (r < need) bad.push({ ...t, r: r.toFixed(2), need });
  }
  console.log(`\nконтраст: проверено ${texts.filter((t) => t.fg && t.bg && !t.наВидео).length} текстовых блоков`);
  if (!bad.length) console.log("  всё выше порога WCAG AA");
  for (const b of bad.slice(0, 14))
    console.log(`  ${b.r} (нужно ${b.need})  ${b.size}px  ${b.селектор.padEnd(26)} «${b.текст}»`);
  if (bad.length > 14) console.log(`  …и ещё ${bad.length - 14}`);
  const overVideo = texts.filter((t) => t.наВидео).length;
  if (overVideo) console.log(`  ${overVideo} блоков лежат на видео — контраст там считать нечем, смотреть глазами`);

  // ── структура ──────────────────────────────────────────────
  const structure = await page.evaluate(() => {
    const heads = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
      ур: +h.tagName[1],
      текст: h.textContent.replace(/\s+/g, " ").trim().slice(0, 46),
    }));
    const imgs = [...document.querySelectorAll("img")];
    return {
      заголовки: heads,
      h1: heads.filter((h) => h.ур === 1).length,
      ориентиры: {
        main: document.querySelectorAll("main").length,
        nav: document.querySelectorAll("nav").length,
        header: document.querySelectorAll("header").length,
        footer: document.querySelectorAll("footer").length,
      },
      картинок: imgs.length,
      безAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
      пустойAlt: imgs.filter((i) => i.getAttribute("alt") === "").length,
      безРазмеров: imgs.filter((i) => !i.getAttribute("width") && !i.style.width && !i.closest("[style*=width]")).length,
      lang: document.documentElement.lang,
      пропустить: !!document.querySelector('a[href^="#"][class*="skip"], a[href="#main"], .u-visually-hidden a'),
      поля: [...document.querySelectorAll("input,select,textarea")].map((f) => ({
        id: f.id,
        тип: f.type || f.tagName.toLowerCase(),
        подпись: !!(f.labels?.length || f.getAttribute("aria-label") || f.getAttribute("aria-labelledby")),
        обязательное: f.required,
      })),
    };
  });

  console.log("\nструктура:");
  console.log("  язык страницы:", structure.lang || "НЕ ЗАДАН");
  console.log("  ориентиры:", JSON.stringify(structure.ориентиры));
  console.log(`  h1 на странице: ${structure.h1}${structure.h1 === 1 ? "" : "  ← должен быть ровно один"}`);
  let prev = 0;
  const jumps = [];
  for (const h of structure.заголовки) {
    if (prev && h.ур > prev + 1) jumps.push(`${prev}→${h.ур} «${h.текст}»`);
    prev = h.ур;
  }
  console.log("  порядок заголовков:", structure.заголовки.map((h) => "h" + h.ур).join(" "));
  if (jumps.length) console.log("  ПРОПУСКИ УРОВНЯ:", jumps.join(" | "));
  console.log(`  картинок ${structure.картинок}: без alt ${structure.безAlt}, декоративных (alt="") ${structure.пустойAlt}`);
  console.log(`  без явных размеров (риск скачка вёрстки): ${structure.безРазмеров}`);
  console.log("  ссылка «к содержимому»:", structure.пропустить ? "есть" : "НЕТ");
  const noLabel = structure.поля.filter((f) => !f.подпись);
  console.log(`  полей формы ${structure.поля.length}, без подписи: ${noLabel.length}${noLabel.length ? " — " + noLabel.map((f) => f.id || f.тип).join(", ") : ""}`);

  // ── клавиатура ─────────────────────────────────────────────
  const kb = await page.evaluate(() => {
    const focusable = [...document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return cs.visibility !== "hidden" && cs.display !== "none" && (r.width || r.height);
    });
    const positive = focusable.filter((el) => +(el.getAttribute("tabindex") || 0) > 0);
    const small = focusable
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
      .map(({ el, r }) => ({
        что: (el.getAttribute("aria-label") || el.textContent.trim().slice(0, 26) || el.tagName).slice(0, 30),
        размер: `${Math.round(r.width)}×${Math.round(r.height)}`,
      }));
    return { всего: focusable.length, положительныйTabindex: positive.length, мелкие: small };
  });
  console.log("\nклавиатура и попадание:");
  console.log(`  фокусируемых элементов: ${kb.всего}, с положительным tabindex: ${kb.положительныйTabindex}`);
  console.log(`  мельче 44×44 (порог WCAG 2.5.8): ${kb.мелкие.length}`);
  for (const s of kb.мелкие.slice(0, 10)) console.log(`    ${s.размер.padEnd(9)} ${s.что}`);
  if (kb.мелкие.length > 10) console.log(`    …и ещё ${kb.мелкие.length - 10}`);

  await page.close();
}

await browser.close();

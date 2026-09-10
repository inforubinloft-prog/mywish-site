// Вес страницы, адаптив и метаданные.
//
// node scripts/audit-perf.mjs
import { chromium } from "playwright";

const ROUTES = ["/", "/halls"];
const WIDTHS = [360, 414, 768, 1024, 1280, 1440, 1920];

const kb = (n) => (n / 1024).toFixed(0) + " КБ";
const mb = (n) => (n / 1048576).toFixed(2) + " МБ";

const browser = await chromium.launch();

// ── вес и запросы ─────────────────────────────────────────────
for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const hits = [];
  page.on("response", async (r) => {
    const type = r.request().resourceType();
    let size = 0;
    try {
      size = Number((await r.headerValue("content-length")) || 0);
      if (!size) size = (await r.body()).length;
    } catch {
      /* поток мог закрыться — не страшно, такие пропускаем */
    }
    hits.push({ url: r.url().replace("http://localhost:3000", ""), type, size, status: r.status() });
  });

  await page.goto("http://localhost:3000" + route, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3500);

  const byType = {};
  for (const h of hits) byType[h.type] = (byType[h.type] || 0) + h.size;
  const total = hits.reduce((a, h) => a + h.size, 0);

  console.log(`\n${"=".repeat(66)}\n${route} — что грузится до первого действия\n${"=".repeat(66)}`);
  console.log(`  запросов ${hits.length}, всего ${mb(total)}`);
  for (const [t, s] of Object.entries(byType).sort((a, b) => b[1] - a[1]))
    console.log(`    ${t.padEnd(12)} ${mb(s).padStart(9)}`);
  console.log("  самое тяжёлое:");
  for (const h of hits.sort((a, b) => b.size - a.size).slice(0, 6))
    console.log(`    ${kb(h.size).padStart(8)}  ${h.url.slice(0, 62)}`);

  /* Реальные показатели отрисовки. */
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)]));
    const lcp = performance.getEntriesByType("largest-contentful-paint").at(-1);
    return {
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      firstPaint: paints["first-contentful-paint"] ?? null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      сдвигМакета: performance
        .getEntriesByType("layout-shift")
        .filter((e) => !e.hadRecentInput)
        .reduce((a, e) => a + e.value, 0)
        .toFixed(4),
    };
  });
  console.log("  отрисовка:", JSON.stringify(perf));

  await page.close();
}

// ── адаптив ───────────────────────────────────────────────────
console.log(`\n${"=".repeat(66)}\nадаптив: что происходит на узких экранах\n${"=".repeat(66)}`);
for (const route of ROUTES) {
  console.log(`\n  ${route}`);
  console.log(
    "    ширина  масштаб  сцена  переполнение  мельче 44px  текст <12px",
  );
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
    await page.goto("http://localhost:3000" + route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const focusable = [...document.querySelectorAll('a[href],button:not([disabled]),input,select,textarea')].filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width && b.height;
      });
      const small = focusable.filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width < 44 || b.height < 44;
      }).length;
      let tiny = 0;
      for (const el of document.querySelectorAll("p,span,a,li,h1,h2,h3,label,button")) {
        const t = el.textContent?.trim();
        if (!t || el.children.length) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        if (parseFloat(cs.fontSize) < 12) tiny++;
      }
      return { scale: scale.toFixed(3), overflow, small, tiny, focusable: focusable.length };
    });
    console.log(
      `    ${String(w).padStart(5)}   ${r.scale}   ${(r.scale * 1440).toFixed(0).padStart(5)}  ${
        r.overflow > 0 ? String(r.overflow).padStart(8) + "px" : "       нет"
      }   ${String(r.small + "/" + r.focusable).padStart(10)}   ${String(r.tiny).padStart(10)}`,
    );
    await page.close();
  }
}

// ── метаданные ────────────────────────────────────────────────
console.log(`\n${"=".repeat(66)}\nметаданные и поисковая выдача\n${"=".repeat(66)}`);
for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000" + route, { waitUntil: "load" });
  const meta = await page.evaluate(() => {
    const get = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) ?? null;
    return {
      title: document.title,
      описание: get('meta[name="description"]'),
      canonical: get('link[rel="canonical"]', "href"),
      og: {
        title: get('meta[property="og:title"]'),
        image: get('meta[property="og:image"]'),
        type: get('meta[property="og:type"]'),
        url: get('meta[property="og:url"]'),
      },
      иконка: get('link[rel~="icon"]', "href"),
      разметкаОрганизации: [...document.querySelectorAll('script[type="application/ld+json"]')].length,
      robots: get('meta[name="robots"]'),
    };
  });
  console.log(`\n  ${route}`);
  console.log("    title:", meta.title, `(${meta.title.length} симв.)`);
  console.log("    description:", meta.описание ? `${meta.описание.length} симв.` : "НЕТ");
  console.log("    canonical:", meta.canonical ?? "НЕТ");
  console.log("    Open Graph:", JSON.stringify(meta.og));
  console.log("    иконка сайта:", meta.иконка ?? "НЕТ");
  console.log("    структурированные данные (JSON-LD):", meta.разметкаОрганизации || "НЕТ");
  await page.close();
}

const extra = await (async () => {
  const out = {};
  for (const f of ["/robots.txt", "/sitemap.xml", "/favicon.ico"]) {
    const res = await fetch("http://localhost:3000" + f).catch(() => null);
    out[f] = res ? res.status : "нет ответа";
  }
  return out;
})();
console.log("\n  служебные файлы:", JSON.stringify(extra));

await browser.close();

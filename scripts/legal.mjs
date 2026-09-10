// Разбор юридических страниц черновой версии сайта в структуру для модалок.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
const PAGES = [
  ["requisites", "Реквизиты"],
  ["privacy", "Конфиденциальность"],
  ["consent", "Согласие"],
  ["cookies", "Cookie"],
];

const strip = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, (m) => String.fromCharCode(+m.slice(2, -1)))
    .replace(/\s+/g, " ")
    .trim();

const all = (html, tag) =>
  [
    ...html.matchAll(
      new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]*?)</" + tag + ">", "gi"),
    ),
  ].map((m) => m[1]);

const out = {};
for (const [slug, label] of PAGES) {
  const html = readFileSync(`${SRC}/${slug}.html`, "utf8");
  const main = html.match(/<main[\s\S]*?<\/main>/i)[0];

  const title = strip(all(main, "h1")[0] ?? label);
  const head = main.slice(0, main.search(/<section/i));
  const paras = all(head, "p").map(strip).filter(Boolean);
  const kicker = paras[0] ?? "";
  const lede = paras.slice(1).join(" ");

  const sections = [];
  for (const sec of all(main, "section")) {
    const h = strip(all(sec, "h2")[0] ?? "");
    const blocks = [];
    // порядок блоков внутри секции важен, поэтому идём по разметке подряд
    const re = /<(p|ul|ol|dl)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = re.exec(sec))) {
      const [, tag, inner] = m;
      if (tag === "p") {
        const t = strip(inner);
        if (t) blocks.push({ p: t });
      } else if (tag === "ul" || tag === "ol") {
        const items = all(inner, "li").map(strip).filter(Boolean);
        if (items.length) blocks.push({ ul: items });
      } else {
        const dt = all(inner, "dt").map(strip);
        const dd = all(inner, "dd").map(strip);
        const rows = dt.map((t, i) => [t, dd[i] ?? ""]).filter(([t]) => t);
        if (rows.length) blocks.push({ dl: rows });
      }
    }
    if (h || blocks.length) sections.push({ h, blocks });
  }
  out[slug] = { label, kicker, title, lede, sections };
}

const body = `/**
 * Юридические документы. Тексты взяты со страниц черновой версии сайта
 * (mwsh.ru/requisites, /privacy, /consent, /cookies) и разобраны скриптом
 * scripts/legal.mjs — руками ничего не переписывалось, чтобы формулировки
 * остались ровно теми же.
 */

export type LegalBlock =
  | { p: string }
  | { ul: string[] }
  | { dl: [string, string][] };

export type LegalDoc = {
  label: string;
  kicker: string;
  title: string;
  lede: string;
  sections: { h: string; blocks: LegalBlock[] }[];
};

export type LegalId = ${PAGES.map(([s]) => `"${s}"`).join(" | ")};

export const LEGAL: Record<LegalId, LegalDoc> = ${JSON.stringify(out, null, 2)};

export const LEGAL_ORDER: LegalId[] = [${PAGES.map(([s]) => `"${s}"`).join(", ")}];
`;

writeFileSync("src/lib/legal.ts", body);
for (const [slug] of PAGES) {
  const d = out[slug];
  const blocks = d.sections.reduce((n, s) => n + s.blocks.length, 0);
  console.log(`${slug.padEnd(11)} «${d.title}» — разделов ${String(d.sections.length).padStart(2)}, блоков ${blocks}`);
}

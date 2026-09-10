import SectionHeading from "./SectionHeading";
import { box } from "@/lib/px";

/**
 * Секция 3 «как выглядит праздник» — Figma 914:1184 … 914:1181.
 * Сцена: макет 1976…3101 → 1020 на странице.
 * Сетка: колонки 130 / 330 / 730 / 1130, зазор 20, ряды на 166 / 452 / 871.
 *
 * Плитки выгружены из Figma отрендеренными нодами (масштаб 2×): кроп и радиус
 * запечены в файл, поэтому кадрирование совпадает с макетом до пикселя.
 *
 * Каждая плитка обёрнута в рамку .u-photo: на наведении увеличивается кадр
 * внутри, а не сама плитка, — сетка от этого не шевелится.
 */

type Photo = { node: string; at: [number, number, number, number]; alt: string };

const PHOTOS: Photo[] = [
  { node: "1179", at: [130, 166, 180, 254], alt: "Гостья на празднике" },
  { node: "1174", at: [330, 166, 380, 254], alt: "Компания подруг с бокалами" },
  { node: "1176", at: [730, 166, 380, 254], alt: "Праздничный стол и гости" },
  { node: "1180", at: [1130, 166, 180, 254], alt: "Неоновая надпись в зале" },
  { node: "1172", at: [130, 452, 278, 387], alt: "Подруги в розовом декоре" },
  { node: "1170", at: [430, 452, 580, 387], alt: "Девушки у неоновой вывески Barbie" },
  { node: "1171", at: [1030, 452, 280, 387], alt: "Шары-цифры 30 на празднике" },
  { node: "1178", at: [130, 871, 180, 254], alt: "Гостья в красном платье" },
  { node: "1175", at: [330, 871, 380, 254], alt: "Танцы на празднике" },
  { node: "1177", at: [730, 871, 380, 254], alt: "Подруги на диване" },
  { node: "1181", at: [1130, 871, 180, 254], alt: "Гостья с бокалом" },
];

export default function Gallery() {
  return (
    <section id="gallery" data-section="gallery" style={box(0, 1020, 1440, 1125)}>
      <SectionHeading size="l" node="914:1184" at={[544, 0, 352, 100]} accent=" праздник">
        Как выглядит
      </SectionHeading>

      {PHOTOS.map((p) => (
        <figure key={p.node} className="u-photo" style={box(...p.at)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/figma/gallery/n${p.node}.webp`}
            alt={p.alt}
            data-node-id={`914:${p.node}`}
            loading="lazy"
            decoding="async"
            className="max-w-none"
          />
        </figure>
      ))}
    </section>
  );
}

import type { ReactNode } from "react";
import { box } from "@/lib/px";

type Props = {
  /** «xl» — 78/70 (секции 2, 6, 7, 8), «l» — 60/50 (секции 3, 4, 5, 9, 10), «m» — 45/45 (FAQ). */
  size?: "xl" | "l" | "m";
  /** Первая строка — тёмная. */
  children: ReactNode;
  /** Вторая строка — акцентная, #DB404F. Пусто — заголовок в одну строку. */
  accent?: ReactNode;
  /** Координаты блока в макете. */
  at: [x: number, y: number, w: number, h: number];
  node?: string;
  className?: string;
};

const SIZES = {
  xl: "text-d-xl",
  l: "text-d-l",
  m: "text-d-m",
} as const;

/**
 * Заголовок секции: две строки по центру, вторая — акцентным цветом.
 * Fira Sans Extra Condensed Black, трекинг 4% — единый стиль на весь сайт.
 */
export default function SectionHeading({
  size = "xl",
  children,
  accent,
  at,
  node,
  className = "",
}: Props) {
  return (
    <h2
      data-node-id={node}
      style={box(at[0], at[1], at[2], at[3])}
      className={`u-heading ${SIZES[size]} ${className}`}
    >
      {children}
      {accent ? (
        <>
          <br />
          <em>{accent}</em>
        </>
      ) : null}
    </h2>
  );
}

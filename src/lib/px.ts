/**
 * Перевод координат макета в единицы вёрстки.
 *
 * Вся страница масштабируется через корневой font-size: 1rem = 16px при ширине
 * окна 1440px (см. globals.css). Поэтому величина из Figma переводится в rem
 * делением на 16 — и дальше сама тянется за окном.
 */

/** Пиксель макета → rem. */
export const px = (n: number) => `${n / 16}rem`;

/**
 * Абсолютная коробка по координатам Figma.
 * Значения передаются ровно как в макете: box(41, 189, 551, 646).
 */
export const box = (x: number, y: number, w?: number, h?: number): React.CSSProperties => ({
  position: "absolute",
  left: px(x),
  top: px(y),
  ...(w !== undefined ? { width: px(w) } : null),
  ...(h !== undefined ? { height: px(h) } : null),
});

/** Высота блока в единицах макета. */
export const size = (w: number, h: number): React.CSSProperties => ({
  width: px(w),
  height: px(h),
});

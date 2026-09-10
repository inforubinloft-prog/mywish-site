"use client";

import { useEffect, useState } from "react";
import { useOrder } from "@/lib/order";
import { box } from "@/lib/px";
import type { PackageId } from "@/lib/pricing";

/**
 * Подпись под заголовком блока пакетов — подсказка, а не украшение.
 *
 * Тот же приём, что во втором блоке с залами: пока курсор ни на чём, строка
 * объясняет правило целиком; как только человек навёл на карточку, она
 * рассказывает про эту карточку и говорит, что будет по нажатию. Сделанный
 * выбор строка не повторяет — он виден на самой карточке.
 *
 * Наведение слушает секция, а не карточки: карточки серверные, и вешать на
 * каждую обработчик означало бы сделать клиентскими все три. Здесь же нужен
 * один признак — что под курсором, — и держать его удобнее в одном месте.
 */

const REST = "Аренда зала + пакет = вся стоимость. Никаких скрытых доплат.";

/** Названия и цены дублируются из разметки: серверные карточки их не отдают. */
const TITLES: Record<PackageId, { title: string; price: string }> = {
  happy: { title: "«Хэппи»", price: "19 700 ₽" },
  extra: { title: "«Экстра»", price: "32 500 ₽" },
  wow: { title: "«Вау»", price: "100 500 ₽" },
};

export default function PackagesLede() {
  const order = useOrder();
  const [hover, setHover] = useState<PackageId | null>(null);

  useEffect(() => {
    const section = document.getElementById("packages");
    if (!section) return;

    const карточка = (event: Event) => {
      const target = event.target as HTMLElement | null;
      return (target?.closest(".u-package-card") as HTMLElement | null)?.dataset
        .package as PackageId | undefined;
    };

    const onOver = (event: PointerEvent) => {
      /* Касание — не наведение: там подсказка мигнула бы и исчезла. */
      if (event.pointerType === "touch") return;
      setHover(карточка(event) ?? null);
    };
    const onLeave = () => setHover(null);

    section.addEventListener("pointerover", onOver);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointerover", onOver);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const picked = order.pkgTouched ? order.pkg : null;
  let text = REST;
  if (hover) {
    const { title, price } = TITLES[hover];
    text =
      title +
      " · " +
      price +
      " + аренда зала — " +
      (hover === picked ? "нажми ещё раз, чтобы отменить" : "нажми, чтобы выбрать");
  }

  return (
    <p
      className="u-lede u-step-hint"
      data-node-id="914:1309"
      data-active={Boolean(hover)}
      style={box(220, 188, 1000, 28)}
    >
      {text}
    </p>
  );
}

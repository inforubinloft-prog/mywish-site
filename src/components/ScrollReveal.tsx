"use client";

import { useEffect } from "react";

/**
 * Появление блоков при прокрутке.
 *
 * Разметку не трогаем: страница собрана из абсолютных координат макета, и
 * оборачивать каждый блок было бы дороже, чем размечать его отсюда. Компонент
 * сам находит содержательные блоки внутри секций, вешает на них признак и
 * ведёт наблюдатель.
 *
 * Что считается блоком: прямой ребёнок секции. Для «выбери зал» — дети двух её
 * слоёв: сама секция состоит из них, и появление слоями выглядело бы как один
 * общий наплыв. Служебные стикеры (aria-hidden) пропускаем — они украшают
 * заголовок и должны появляться вместе с ним, а не отдельной ступенью.
 *
 * Прячет блоки CSS, а не скрипт: правило висит на [data-reveal] с самой
 * загрузки, поэтому мигания «показали — спрятали» не бывает. Если скрипт не
 * выполнится, спасает <noscript> в globals.css — там всё возвращается на место.
 *
 * Анимация без forwards, с backwards: пока идёт задержка, блок держит нулевой
 * кадр, а после конца отпускает свойства обратно. Это важно — иначе застывший
 * translate перебивал бы подъём на наведении у карточек и кнопок.
 */

/** Шаг лестницы внутри секции и её потолок: дальше ступени не растут. */
const STEP = 70;
const MAX_STEPS = 5;

/** Появление начинается, когда блок вошёл в кадр примерно на восьмую часть. */
const OBSERVER = { threshold: 0.12, rootMargin: "0px 0px -6% 0px" };

/** Слои, которыми набрана секция «выбери зал»: раскрываем их содержимое. */
const LAYERS = ":scope > .halls-interface-layer, :scope > .halls-houses-layer";

export default function ScrollReveal() {
  useEffect(() => {
    const roots: Element[] = [
      ...document.querySelectorAll("[data-section]"),
      ...document.querySelectorAll(".u-cta-band"),
    ];
    if (!roots.length) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealed = "";
        observer.unobserve(entry.target);
      }
    }, OBSERVER);

    const marked: HTMLElement[] = [];

    for (const root of roots) {
      const layers = root.querySelectorAll<HTMLElement>(LAYERS);
      const pool = layers.length
        ? [...layers].flatMap((layer) => [...layer.children])
        : [...root.children];

      let step = 0;
      /* Очередь, чтобы разворачивать display: contents на месте. */
      const queue = [...pool];
      while (queue.length) {
        const node = queue.shift();
        if (!(node instanceof HTMLElement)) continue;
        /* Стикеры и линейки — часть соседнего блока, своей ступени им не надо. */
        if (node.getAttribute("aria-hidden") === "true" || node.ariaHidden === "true")
          continue;
        /*
          Модалка документов лежит прямым ребёнком секции формы. Закрытый
          <dialog> — display: none, в кадр он не попадает никогда, значит
          наблюдатель его не покажет: спрятав его, мы открыли бы потом пустое
          окно. Скрытые блоки пропускаем по той же причине.
        */
        if (node.tagName === "DIALOG" || node.hidden) continue;
        /*
          Подпись для скринридера обрезана clip-path: наблюдатель считает её
          площадь нулевой и о появлении не сообщит никогда. Спрятав её, мы
          заглушили бы объявление «выбран зал» — а показывать там нечего.
        */
        if (node.classList.contains("u-visually-hidden")) continue;

        const display = getComputedStyle(node).display;
        if (display === "none") continue;
        /*
          display: contents — у элемента нет собственной коробки, значит
          наблюдатель никогда не сообщит о его появлении, и спрятанным он
          останется навсегда. Такие разворачиваем и берём их содержимое.
        */
        if (display === "contents") {
          queue.unshift(...node.children);
          continue;
        }

        node.dataset.reveal = "";
        node.style.setProperty(
          "--reveal-delay",
          `${Math.min(step, MAX_STEPS) * STEP}ms`,
        );
        marked.push(node);
        observer.observe(node);
        step++;
      }
    }

    return () => {
      observer.disconnect();
      /*
        При размонтировании снимаем признак: иначе блок остался бы спрятанным
        правилом CSS, а показать его было бы уже некому.
      */
      for (const node of marked) {
        delete node.dataset.reveal;
        node.style.removeProperty("--reveal-delay");
      }
    };
  }, []);

  return null;
}

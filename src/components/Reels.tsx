"use client";

import { useRef, useState } from "react";
import SectionHeading from "./SectionHeading";
import { box } from "@/lib/px";

/**
 * Секция 4 «REELS после праздника» — Figma 914:1183 … 914:1166.
 * Сцена: макет 3197…4064 → 2241 на странице.
 * Три вертикальных ролика 380×676, зазор 20, кнопка play по центру кадра.
 *
 * Заставка карточки — кадр из макета, тот же, что стоял здесь раньше. При
 * наведении поверх него проигрывается настоящий ролик.
 *
 * Ролик лежит отдельным слоем над картинкой и проявляется, а не подменяет её
 * через атрибут poster. Poster показывается только до первого запуска: стоит
 * ролику отыграть и встать на паузу, браузер оставит на экране его собственный
 * первый кадр — и заставка молча сменилась бы на кадр из видео. Слой поверх
 * этого не допускает: в покое всегда виден ровно макетный кадр.
 *
 * Проявление ждёт события playing, а не самого вызова play(): ролик грузится
 * только по наведению, и слой, показанный раньше времени, дал бы чёрный кадр.
 *
 * Ролик играет целиком, с начала и до конца, пока курсор на карточке, и потом
 * заходит на второй круг. Раньше здесь крутились шестисекундные отрезки,
 * вырезанные из середины: они грузились быстрее, но показывали не тот Reels,
 * который человек получит после праздника, а случайный его кусок.
 *
 * Поэтому же кнопка воспроизведения прячется под курсором: пока ролик стоит,
 * она объясняет, что здесь видео, а когда пошёл — только загораживает кадр.
 */

type Card = {
  /** Нода карточки в макете. */
  node: string;
  /** Имя ролика в public/video/reels — заставка при этом своя, из макета. */
  file: string;
  x: number;
  /** Описание заставки: alt относится к кадру из макета, а не к ролику. */
  alt: string;
};

const CARDS: Card[] = [
  {
    node: "1159",
    file: "black",
    x: 130,
    alt: "Reels с праздника — конфетти и танцы",
  },
  {
    node: "1163",
    file: "flamingo",
    x: 530,
    alt: "Reels с праздника — неоновая надпись",
  },
  {
    node: "1167",
    file: "white",
    x: 930,
    alt: "Reels с праздника — гостья с шарами",
  },
];

function ReelCard({ node, file, x, alt }: Card) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  /*
    preload="none": три ролика по мегабайту не должны висеть на странице, пока
    их никто не смотрит. Загрузка начинается с первого наведения, поэтому
    play() может не успеть — обещание отклоняется, и это нормально.
  */
  const play = () => {
    const video = ref.current;
    if (!video) return;
    /* Всегда с первого кадра: вернулись к карточке — смотрим сначала. */
    video.currentTime = 0;
    video.play().catch(() => {});
  };

  /** На уходе курсора отматываем в начало: следующее наведение начнёт заново. */
  const stop = () => {
    const video = ref.current;
    if (!video) return;
    setPlaying(false);
    video.pause();
    video.currentTime = 0;
  };

  return (
    <button
      type="button"
      data-node-id={`914:${node}`}
      className="u-reel group block cursor-pointer overflow-hidden rounded-card"
      style={box(x, 191, 380, 676)}
      aria-label={`Смотреть ${alt}`}
      onMouseEnter={play}
      onMouseLeave={stop}
      /* Клавиатура доходит до карточки табом — отрезок должен играть и там. */
      onFocus={play}
      onBlur={stop}
      /*
        Касанием наведения не бывает, поэтому на тапе ролик включается кликом.
        Повторный тап останавливает — иначе на телефоне его нечем выключить.
      */
      onClick={() => (ref.current?.paused ? play() : stop())}
    >
      {/* Заставка — кадр из макета 914:{node}. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/figma/reels/n${node}.webp`}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="u-reel-media size-full max-w-none object-cover"
      />

      <video
        ref={ref}
        className="u-reel-video absolute inset-0 size-full max-w-none object-cover"
        data-playing={playing}
        preload="none"
        muted
        loop
        playsInline
        aria-hidden
        onPlaying={() => setPlaying(true)}
      >
        <source src={`/video/reels/${file}-full.mp4`} type="video/mp4" />
      </video>

      {/* Кнопка play: 914:1160 (круг) + 914:1161 (треугольник) */}
      <span
        aria-hidden
        className="u-reel-play absolute flex items-center justify-center rounded-pill"
        style={box(153, 300, 75, 75)}
      >
        <svg viewBox="0 0 35 35" className="size-35" fill="none" aria-hidden>
          <path
            d="M12 8.5 L27 17.5 L12 26.5 Z"
            fill="currentColor"
            strokeWidth="4"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

export default function Reels() {
  return (
    <section id="reels" data-section="reels" style={box(0, 2241, 1440, 867)}>
      <SectionHeading size="l" node="914:1183" at={[563, 0, 314, 100]} accent=" праздника">
        REELS после
      </SectionHeading>

      <p className="u-lede" data-node-id="914:1182" style={box(367, 114, 704, 28)}>
        Reels входит в каждый пакет — ты получишь его уже смонтированным.
      </p>

      {CARDS.map((c) => (
        <ReelCard key={c.node} {...c} />
      ))}
    </section>
  );
}

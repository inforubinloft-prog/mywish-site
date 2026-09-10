"use client";

import { useEffect, useRef, useState } from "react";
import { box, px } from "@/lib/px";
import SiteHeader from "./SiteHeader";

/**
 * Секция 1 «hero» — Figma 914:1023 (1440 × 956).
 *
 * Отличие от макета осознанное: в Figma это фрейм фиксированной высоты,
 * на сайте — полный экран (100svh) с фоновым видео. Поэтому по вертикали
 * блоки не копируются координатами, а привязаны к краям:
 *   • шапка         — сверху (37px макета)
 *   • заголовок     — по центру (в макете блок 296…657 при высоте 956,
 *                     его центр 476.5 против центра кадра 478 — то есть центр)
 *   • регалии       — снизу (88px макета)
 * По горизонтали всё ровно на координатах макета внутри сцены 1440.
 *
 * Видео: интро (hero1080) проигрывается один раз и передаёт эстафету лупу
 * (loop1080-24). Последний кадр интро совпадает с кадром лупа, поэтому
 * подмена мгновенная, без затухания: луп лежит слоем ниже и уже играет к
 * моменту, когда интро скрывается. При prefers-reduced-motion остаётся постер.
 */

const VEIL =
  "linear-gradient(90deg, rgba(252,225,227,0.7) 0%, rgba(252,225,227,0.45) 24.774%, rgba(252,225,227,0.12) 47.566%, rgba(252,225,227,0) 67.385%)";

/** Обводка, тень и размытие кнопок hero: блок вставлен в макет в масштабе 2.545. */
const CTA_HERO: React.CSSProperties = {
  borderWidth: "0.0681rem",
  boxShadow: "0 1.0925rem 3.0719rem rgba(28,17,23,0.24)",
  backdropFilter: "blur(1.2288rem)",
};

type Line = { text: string; className?: string; flash?: boolean };

/** Заголовок 914:1027 и подзаголовок 914:1026 печатаются по букве. */
const HEADING: Line[] = [
  { text: "ЖЕНСКИЕ" },
  { text: "ПРАЗДНИКИ", className: "text-primary", flash: true },
  { text: "В САНКТ-ПЕТЕРБУРГЕ" },
];
const LEDE: Line[] = [
  { text: "Твой вишлист уже собран в праздник." },
  { text: "Не хватает только тебя!" },
];

/*
  Верхняя панель выезжает почти сразу: занавес уходит за 300мс, и панель
  подхватывает его хвост. Раньше она ждала 2с — первый экран это время стоял
  пустым, хотя ролик уже шёл.
*/
const HEADER_AT = 360;

/*
  Раскрытие левого блока и розовой заливки.

  Раньше момент был привязан к хлопку героя в ролике: 7.03с руки сходятся,
  8.02с разводит обратно, и всё, что появляется слева, должно было уложиться
  в это окно — отсюда быстрая печать и кнопки, стартующие поверх подзаголовка.
  Теперь раскрытие перенесено на 4.08с по просьбе заказчика. Опорного события
  в кадре там нет — камера просто едет, — поэтому попадать в него до кадра не
  требуется; внутренние доли сценария оставлены прежними.
*/
const REVEAL_AT = 4080;

/**
 * Медленный наезд кадра. Выключен: исходник в 24 кадра/с, и непрерывное
 * движение делает видимым чередование 3:2 — картинка начинает подрагивать.
 * Чтобы вернуть, поставьте true и пересоберите ролик с интерполяцией до 48–60.
 */
const ZOOM = false;
const HEADING_STEP = 12;
const LEDE_STEP = 6;
const chars = (lines: Line[]) => lines.reduce((n, l) => n + l.text.length, 0);
/** Подзаголовок идёт сразу за заголовком, кнопки подхватывают его хвост. */
const LEDE_START = chars(HEADING) * HEADING_STEP + 20;
const POP_START = 620;

/**
 * Печать по букве. Каждый символ — свой span с порядковым номером,
 * задержка считается в CSS: start + номер × шаг. Анимация вместо таймеров,
 * чтобы печать не спотыкалась, пока страница догружает видео.
 *
 * Для скринридеров текст продублирован рядом обычной строкой,
 * а сами буквы скрыты через aria-hidden — иначе их прочитают по одной.
 */
function Typed({
  lines,
  start,
  step,
}: {
  lines: Line[];
  start: number;
  step: number;
}) {
  let i = 0;
  return (
    <span
      className="hero-type"
      aria-hidden
      style={
        {
          "--start": `${start}ms`,
          "--step": `${step}ms`,
        } as React.CSSProperties
      }
    >
      {lines.map((line, li) => {
        /** Момент, когда строка допечаталась — для «клевка» акцентного слова. */
        const doneAt = start + (i + line.text.length) * step;
        return (
          <span key={li}>
            {li > 0 ? <br /> : null}
            <span
              className={[line.className, line.flash ? "hero-flash" : ""]
                .filter(Boolean)
                .join(" ")}
              style={
                line.flash
                  ? ({ "--at": `${doneAt}ms` } as React.CSSProperties)
                  : undefined
              }
            >
              {Array.from(line.text).map((ch, ci) => (
                <span
                  key={ci}
                  data-ch
                  style={{ "--i": i++ } as React.CSSProperties}
                >
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default function Hero() {
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [loopVisible, setLoopVisible] = useState(false);
  /**
   * Сценарий первого экрана:
   *   0 — чёрный экран, видео грузится
   *   1 — затемнение уходит за 0.3с, видео играет в чистом виде
   *   2 — почти сразу (0.36с) выезжает верхняя панель
   *   3 — на 4.08с появляются левый блок, розовая вуаль и растворение внизу
   */
  const [phase, setPhase] = useState(0);
  /** Ref, а не state — читаем из обработчиков событий, которые ставятся один раз. */
  const onLoopRef = useRef(false);

  /** Интро доиграло: запускаем луп и скрываем интро, когда луп реально пошёл. */
  const handoff = () => {
    onLoopRef.current = true;
    const v = loopRef.current;
    if (!v) return setLoopVisible(true);
    const show = () => setLoopVisible(true);
    v.play().then(show, show);
  };

  /**
   * Отсчёт ведём от момента, когда видео реально пошло, — тогда затемнение
   * скрывает загрузку, а не съедает секунды сценария. Если запуск почему-то
   * не случился, стартуем через 0.6с, чтобы страница не осталась чёрной.
   */
  useEffect(() => {
    const intro = introRef.current;
    let started = false;
    const timers: number[] = [];
    const start = () => {
      if (started) return;
      started = true;
      setPhase(1);
      timers.push(window.setTimeout(() => setPhase(2), HEADER_AT));
      timers.push(window.setTimeout(() => setPhase(3), REVEAL_AT));
    };
    intro?.addEventListener("playing", start, { once: true });
    timers.push(window.setTimeout(start, 600));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      intro?.removeEventListener("playing", start);
    };
  }, []);

  /**
   * Браузеры ставят фоновое видео на паузу: в скрытой вкладке, при потере фокуса,
   * иногда сразу после автозапуска. Поэтому мы не полагаемся на один autoPlay,
   * а возвращаем воспроизведение, как только страница снова видима или
   * пользователь что-то сделал. Плюс muted выставляется свойством — без него
   * часть браузеров отказывает в автозапуске.
   */
  useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;

    intro.muted = true;
    loop.muted = true;

    const current = () => (onLoopRef.current ? loop : intro);
    /** Два параллельных play() рвут друг друга (AbortError), поэтому по одному. */
    let pending = false;
    const resume = () => {
      // Намеренно не смотрим на document.hidden: встроенные браузеры и панели
      // предпросмотра держат страницу «скрытой» постоянно, и проверка навсегда
      // оставила бы фон замершим. Видео без звука, поэтому попытка безопасна.
      if (pending) return;
      const v = current();
      if (!v.paused || v.ended) return;
      pending = true;
      v.play()
        .catch(() => {})
        .finally(() => {
          pending = false;
        });
    };

    resume();

    const onVisibility = () => resume();
    const onIntroPause = () => {
      if (!intro.ended) window.setTimeout(resume, 60);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", resume);
    window.addEventListener("pointerdown", resume);
    window.addEventListener("pointermove", resume, { passive: true });
    window.addEventListener("keydown", resume);
    window.addEventListener("scroll", resume, { passive: true });
    intro.addEventListener("pause", onIntroPause);
    loop.addEventListener("pause", resume);

    /*
      Сторож: событий бывает недостаточно — встроенные браузеры и панели
      предпросмотра ставят медиа на паузу без внятного повода и не всегда
      присылают visibilitychange. Раз в секунду проверяем и возвращаем.
    */
    const watchdog = window.setInterval(resume, 1000);

    return () => {
      window.clearInterval(watchdog);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("pointermove", resume);
      window.removeEventListener("keydown", resume);
      window.removeEventListener("scroll", resume);
      intro.removeEventListener("pause", onIntroPause);
      loop.removeEventListener("pause", resume);
    };
  }, []);

  return (
    <section
      id="hero"
      data-section="hero"
      data-node-id="914:1023"
      className="relative h-svh min-h-[560px] overflow-hidden bg-page"
    >
      {/* ── Фон: постер → интро → бесконечный луп ─────────────── */}
      <div aria-hidden className="absolute inset-0">
        {/* Кадр медленно доезжает с 1.06 до 1.0 ровно за 7 секунд сценария */}
        <div
          className="hero-zoom absolute inset-0"
          data-zoom={ZOOM}
          data-shown={phase >= 1}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/video/hero-poster.webp"
            alt=""
            className="absolute inset-0 size-full object-cover"
            style={{ visibility: phase >= 1 ? "hidden" : "visible" }}
          />
          <video
            ref={loopRef}
            className="hero-video absolute inset-0 size-full object-cover"
            loop
            muted
            playsInline
            preload="auto"
            onPlaying={() => setLoopVisible(true)}
          >
            <source src="/video/hero-loop.mp4" type="video/mp4" />
            <source src="/video/hero-loop.webm" type="video/webm" />
          </video>
          <video
            ref={introRef}
            className="hero-video absolute inset-0 size-full object-cover"
            style={{ opacity: loopVisible ? 0 : 1 }}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handoff}
          >
            <source src="/video/hero-intro.mp4" type="video/mp4" />
            <source src="/video/hero-intro.webm" type="video/webm" />
          </video>
        </div>
        {/*
          Растворение нижнего края кадра в цвет страницы: без него на прокрутке
          виден резкий шов между видео и розовым фоном сцены.

          Приходит не сразу, а вместе с боковой заливкой — на 4.08с: обе
          розовые, и появляться им врозь незачем. См. .hero-seam.
        */}
        <div className="hero-seam" aria-hidden data-shown={phase >= 3} />

        {/* 914:1025 — розовая вуаль, выезжает слева направо на 7-й секунде */}
        <div
          className="hero-veil absolute inset-0"
          data-shown={phase >= 3}
          style={{ backgroundImage: VEIL }}
        />
        {/* Затемнение на старте: прячет загрузку первого кадра */}
        <div
          className="hero-curtain absolute inset-0 bg-black"
          data-shown={phase >= 1}
        />
      </div>

      <div className="stage h-full">
        {/* Шапка — общая для всех страниц, здесь с выездом сверху. */}
        <SiteHeader animated shown={phase >= 2} />

        {/* ── Левый блок: появляется на 7-й секунде ──────────── */}
        <div
          className="hero-gate hero-interface-layer absolute inset-0"
          data-shown={phase >= 3}
        >
          <div
            className="absolute left-131 top-1/2 w-780"
            style={{ transform: "translateY(calc(-50% - 0.1rem))" }}
          >
            {/* 914:1027 — печатается по букве */}
            <h1 className="font-display text-hero font-black tracking-[0.04em] text-ink">
              <span className="u-visually-hidden">
                ЖЕНСКИЕ ПРАЗДНИКИ В САНКТ-ПЕТЕРБУРГЕ
              </span>
              <Typed lines={HEADING} start={0} step={HEADING_STEP} />
            </h1>

            {/* 914:1026 — допечатывается следом */}
            <p className="mt-19 font-sans text-hero-lede font-medium tracking-[0.04em] text-ink">
              <span className="u-visually-hidden">
                Твой вишлист уже собран в праздник. Не хватает только тебя!
              </span>
              <Typed lines={LEDE} start={LEDE_START} step={LEDE_STEP} />
            </p>

            {/* 914:1130 / 914:1132 — всплывают, когда текст допечатан */}
            <div className="mt-51 flex items-center gap-13">
              <span
                className="hero-pop inline-flex"
                style={{ "--delay": `${POP_START}ms` } as React.CSSProperties}
              >
                <a
                  href="#contact"
                  className="u-cta h-41 w-193 text-btn transition-all duration-200 hover:-translate-y-2 hover:bg-navy hover:text-surface"
                  style={CTA_HERO}
                >
                  СВЯЗАТЬСЯ
                </a>
              </span>
              <span
                className="hero-pop inline-flex"
                style={
                  { "--delay": `${POP_START + 80}ms` } as React.CSSProperties
                }
              >
                <a
                  href="#halls"
                  data-hero-halls-trigger
                  className="u-cta h-41 w-136 bg-[rgba(255,241,242,0.63)] text-btn font-normal text-ink-secondary transition-all duration-200 hover:-translate-y-2 hover:bg-blush hover:text-primary"
                  style={CTA_HERO}
                >
                  Выбрать зал
                </a>
              </span>
            </div>
          </div>

          {/*
            Плашки «5.0 Яндекс.Карты» и «Хорошее место 2026» (914:1128 / 914:1127)
            временно сняты по просьбе заказчика. Возвращаются на bottom-88 left-131.
          */}
        </div>
      </div>
    </section>
  );
}

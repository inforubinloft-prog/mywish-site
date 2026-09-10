"use client";

import { useEffect, useRef } from "react";
import SiteHeader from "@/components/SiteHeader";

/**
 * Первый экран страницы залов — смонтированный ролик по всем площадкам.
 *
 * Ниже главной по высоте (78svh против 100svh) намеренно: это не титульный
 * экран сайта, а обложка раздела, и следующий блок должен выглядывать снизу,
 * подсказывая, что страница продолжается.
 *
 * Внизу та же полоса растворения, что и на главной, — кадр уходит в цвет
 * страницы, а не обрывается швом.
 *
 * Ролик без звука и по кругу: он идёт фоном под заголовком, а не смотрится
 * отдельно. Браузеры глушат фоновое видео при потере фокуса и в скрытой
 * вкладке, поэтому воспроизведение возвращаем — как в Hero на главной.
 */
export default function HallsHero() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;

    let pending = false;
    const resume = () => {
      if (pending || !video.paused) return;
      pending = true;
      video
        .play()
        .catch(() => {})
        .finally(() => {
          pending = false;
        });
    };
    resume();

    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("pointerdown", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pointerdown", resume);
    };
  }, []);

  return (
    <section className="halls-hero" data-page-hero>
      <video
        ref={ref}
        className="halls-hero-video"
        poster="/video/halls/promo.webp"
        preload="auto"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      >
        <source src="/video/halls/promo.webm" type="video/webm" />
        <source src="/video/halls/promo.mp4" type="video/mp4" />
      </video>

      {/* Затемняющая заливка слева — как розовая вуаль на главной, но темнее:
          заголовок здесь белый и стоит поверх подвижного кадра. */}
      <div aria-hidden className="halls-hero-veil" />

      <div className="stage h-full">
        <SiteHeader />

        <div className="halls-hero-copy">
          <h1 className="u-heading text-d-xl">
            Девять залов
            <br />
            <em>под любой формат</em>
          </h1>
          <p className="halls-hero-lede">
            Три площадки в Петербурге. Все залы идут в одну стоимость — выбирай
            по настроению, а не по прайсу.
          </p>
        </div>
      </div>
    </section>
  );
}

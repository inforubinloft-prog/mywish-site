"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useOrder } from "@/lib/order";
import { box } from "@/lib/px";

/**
 * Отметка выполненного шага.
 *
 * Четыре шага — зал, пакет, дата, заявка — закрываются четырьмя действиями.
 * Как только действие сделано, шаг говорит об этом сам: стикер над заголовком
 * сменяется галочкой, а акцентная строка заголовка уходит из розового в
 * тёмно-синий. Розовым на странице зовут к действию; сделанный шаг звать
 * больше не должен, но и гаснуть целиком ему нельзя — вернуться и сменить
 * выбор можно в любой момент.
 *
 * Момент закрытия отыгрывается один раз: галочка впечатывается, из-под неё
 * коротко разлетаются искры, а стикер следующего шага пару раз подпрыгивает —
 * зовёт идти дальше. Признак justDone держится меньше секунды и снимается,
 * поэтому праздник не повторяется при каждой перерисовке и не запускается
 * заново, когда человек прокручивает страницу мимо.
 *
 * Сам компонент только ставит признаки на секцию и рисует искры; вид и
 * движение — в globals.css.
 */
export type Step = "hall" | "package" | "date" | "sent";

/** Кто за кем: закрыли шаг — зовём в следующий. */
const NEXT: Partial<Record<Step, Step>> = {
  hall: "package",
  package: "date",
  date: "sent",
};

/** Сколько держим отыгрыш и приглашение. */
const CELEBRATE = 900;
const INVITE = 2400;

/** Искры: восемь штук по кругу, чуть вразнобой по длине. */
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
  const far = 1.7 + (i % 3) * 0.35;
  return {
    dx: (Math.cos(angle) * far).toFixed(2) + "rem",
    dy: (Math.sin(angle) * far).toFixed(2) + "rem",
    i,
  };
});

export default function StepDone({
  step,
  at,
}: {
  step: Step;
  /** Координаты стикера в макете: искры вылетают из его центра. */
  at: [number, number, number, number];
}) {
  const order = useOrder();
  const was = useRef(false);

  const done =
    step === "hall"
      ? Boolean(order.hall)
      : step === "package"
        ? order.pkgTouched
        : step === "date"
          ? order.dateTouched
          : order.sent;

  useEffect(() => {
    const section = document.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (!section) return;
    section.dataset.done = String(done);

    const закрыли = done && !was.current;
    const передумали = !done && was.current;
    was.current = done;

    /*
      Передумали, пока отыгрыш ещё идёт: снимаем признаки сразу. Иначе
      анимация с fill-mode both держит галочку на экране до конца своего
      таймера — выбор уже снят, а отметка ещё висит.
    */
    if (передумали) {
      delete section.dataset.justDone;
      const nextSlug = NEXT[step];
      if (nextSlug) {
        const сосед = document.querySelector<HTMLElement>(
          `[data-step="${nextSlug}"]`,
        );
        if (сосед) delete сосед.dataset.invite;
      }
    }

    if (!закрыли) return;

    section.dataset.justDone = "";
    const nextStep = NEXT[step];
    const next = nextStep
      ? document.querySelector<HTMLElement>(`[data-step="${nextStep}"]`)
      : null;
    /* Зовём только туда, где ещё не были: отмеченный шаг подпрыгивать не должен. */
    if (next && next.dataset.done !== "true") next.dataset.invite = "";

    const t1 = setTimeout(() => delete section.dataset.justDone, CELEBRATE);
    const t2 = setTimeout(() => {
      if (next) delete next.dataset.invite;
    }, INVITE);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step, done]);

  return (
    <span aria-hidden className="u-step-burst" style={box(...at)}>
      {SPARKS.map((s) => (
        <i
          key={s.i}
          style={{ "--dx": s.dx, "--dy": s.dy, "--i": s.i } as CSSProperties}
        />
      ))}
    </span>
  );
}

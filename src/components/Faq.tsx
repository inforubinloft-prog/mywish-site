"use client";

import { useState } from "react";
import SectionHeading from "./SectionHeading";
import { box, px } from "@/lib/px";

/**
 * Секция 11 «вопросы» — Figma 914:2021 … 914:2075.
 * Сцена: макет 9220…9918 → 8264 на странице.
 *
 * Аккордеон: открыт ровно один ответ, по умолчанию первый. Список выложен
 * потоком с зазором 8.7 — при таком зазоре позиции пунктов совпадают с
 * макетом до пикселя, но, в отличие от жёстких координат, список сам
 * подстраивается под длину ответа. Это важно: тексты ответов ещё не готовы.
 *
 * Блок вставлен в макет в масштабе 0.7565, поэтому кегли дробные.
 */

type Item = { q: string; a: string; list?: string[] };

const ITEMS: Item[] = [
  {
    q: "Мы точно поместимся?",
    a: "Да, у нас девять залов на разное количество гостей — от 10 до 40 человек. Скажи, сколько вас будет, и менеджер подберёт подходящий.",
  },
  {
    q: "Можно со своей едой и напитками?",
    a: "Да, можно. В каждом пакете уже есть депозит на еду, но что-то докупить или принести своё тоже не проблема.",
  },
  {
    q: "Есть ли пробковый сбор?",
    a: "Нет. Ни в каком виде.",
  },
  {
    q: "Можно добавить ведущего, декор или что-то ещё?",
    a: "Да. Дополнительная еда, паровые коктейли, декор, шоу-программа — соберём что угодно под твой формат. Менеджер расскажет подробнее и посчитает.",
  },
  {
    q: "Как забронировать дату?",
    a: "Напиши нам — менеджер проверит, свободен ли зал в нужную дату, обсудит детали и посчитает итоговую сумму. После этого закрепим дату за тобой: для брони нужна предоплата от 50%.",
  },
  {
    q: "Можно ли продлить праздник в моменте?",
    a: "Можно, если после вас в зале нет другого праздника. Но лучше заложить время с запасом: все думают, что четырёх часов хватит, а в среднем празднуют шесть — время летит незаметно.",
  },
  {
    q: "Можно ли приехать посмотреть зал заранее?",
    a: "Конечно. Приезжай, посмотри зал вживую и обсуди детали с менеджером — договоримся об удобном времени.",
  },
  {
    q: "Что делать, если нужно отменить или перенести?",
    a: "Перенести можно в любой момент, кроме дня праздника. С отменой так:",
    list: [
      "больше 14 дней — вернём предоплату полностью",
      "7–14 дней — вернём половину или сохраним всю сумму, и ты потратишь её на праздник в течение года",
      "1–6 дней — сумма сохранится за тобой на год",
    ],
  },
];

const ROW_HEIGHT = 67;
/** Зазор между пунктами: с ним координаты совпадают с макетом. */
const GAP = 8.7;

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" data-section="faq" style={box(0, 8264, 1440, 698)}>
      <SectionHeading
        size="m"
        node="914:2022"
        at={[130, 1, 464, 135]}
        accent="до праздника"
        className="text-left"
      >
        Вопросы, которые
        <br />
        лучше решить
      </SectionHeading>

      <p
        className="font-sans text-ink-muted"
        data-node-id="914:2023"
        style={{ ...box(130, 153, 249, 18), fontSize: px(11.4) }}
      >
        Собрали то, о чём спрашивают чаще всего.
      </p>

      {/* Иллюстрация 914:2082 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/faq/hero.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="max-w-none"
        style={box(127, 179, 387, 540)}
      />

      <div
        style={{
          ...box(642, 0, 668),
          display: "flex",
          flexDirection: "column",
          gap: px(GAP),
        }}
      >
        {ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <details
              key={item.q}
              open={isOpen}
              data-node-id={i === 0 ? "914:2024" : undefined}
              className="u-faq group rounded-md"
              data-open={isOpen}
            >
              <summary
                className="relative flex cursor-pointer list-none"
                style={{ height: px(ROW_HEIGHT) }}
                onClick={(e) => {
                  // открытым управляем сами: закрывать последний нечем
                  e.preventDefault();
                  setOpen(i);
                }}
              >
                <span
                  aria-hidden
                  className="font-sans font-bold text-primary"
                  style={{ ...box(19, 28, 20, 11), fontSize: px(7.6) }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="u-faq-question font-sans"
                  style={{
                    ...box(60, 21, 540, 24),
                    fontSize: px(21.2),
                    lineHeight: px(24),
                    letterSpacing: px(-0.53),
                  }}
                >
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className="u-faq-mark flex items-center justify-center rounded-pill"
                  style={{ ...box(623, 20, 26, 26), borderWidth: px(0.8) }}
                >
                  <svg
                    viewBox="0 0 12 12"
                    style={{ width: px(9), height: px(9) }}
                    aria-hidden
                  >
                    <path
                      d="M1 6h10"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6 1v10"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      className="group-open:hidden"
                    />
                  </svg>
                </span>
              </summary>

              <div
                className="rounded-sm bg-surface-alt"
                style={{
                  marginLeft: px(60),
                  marginRight: px(19),
                  marginBottom: px(19),
                  padding: `${px(18)} ${px(20)}`,
                }}
              >
                <p
                  className="font-sans text-ink-secondary"
                  style={{ fontSize: px(14), lineHeight: px(20.5) }}
                >
                  {item.a}
                </p>
                {item.list ? (
                  <ul
                    className="font-sans text-ink-secondary"
                    style={{
                      marginTop: px(8),
                      fontSize: px(14),
                      lineHeight: px(20.5),
                    }}
                  >
                    {item.list.map((line) => (
                      <li
                        key={line}
                        style={{ position: "relative", paddingLeft: px(14) }}
                      >
                        <span
                          aria-hidden
                          style={{ position: "absolute", left: 0 }}
                        >
                          ·
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

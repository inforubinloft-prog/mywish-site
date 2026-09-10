"use client";

import { useRef, useState } from "react";
import SectionHeading from "./SectionHeading";
import StepDone from "./StepDone";
import { box, px } from "@/lib/px";
import { markSent, pickHall, useOrder } from "@/lib/order";
import { MONTHS_OF, getPackage, money, totalOf } from "@/lib/pricing";
import { LEGAL, type LegalId } from "@/lib/legal";
import { HALL_TITLES as HALLS } from "@/lib/halls.mjs";
import LegalModal from "./LegalModal";

/**
 * Секция 8 «заполни детали своего праздника» — Figma 914:1861 … 914:1802.
 * Сцена: макет 6839…7756 → 5883 на странице.
 *
 * Форма собрана настоящими полями: поля, чекбокс и кнопка — реальные элементы,
 * привязанные к подписям, чтобы её оставалось только подключить к бэкенду.
 * Блок вставлен в макет в масштабе 0.8305 — кегли дробные, как в макете.
 */

/*
  Девять залов берём из общего источника. Раньше список лежал здесь копией и
  в своём написании — «Блек» против «Блэк» на странице залов. Пока зал выбирали
  только тут, это не мешало; теперь его выбирают на /halls и переносят сюда, и
  при расхождении <select> не нашёл бы совпадения и показал пустое поле.
*/

/** Гостей считают с запасом, поэтому вилки, а не точное число. */
const GUESTS = [
  "до 5 человек",
  "до 10 человек",
  "до 15 человек",
  "до 20 человек",
  "до 25 человек",
  "больше 30 человек",
];

/**
 * Ник в мессенджере: собачка ставится сама и всегда одна. Внутри — только
 * латиница, цифры и подчёркивание: и Telegram, и MAX других символов в нике
 * не допускают, поэтому кириллицу и пробелы отсекаем сразу, а не после
 * отправки. Пустое поле оставляем пустым, иначе одинокая собачка выглядела бы
 * как заполненное.
 */
function formatHandle(raw: string) {
  const body = raw.replace(/[^A-Za-z0-9_]/g, "");
  return body ? `@${body}` : "";
}

/**
 * Из любого ввода достаём номер абонента: десять цифр после +7. Восьмёрку и
 * семёрку в начале съедаем — код страны уже в маске, а первая цифра номера у
 * мобильных всегда девятка, поэтому всё до неё отбрасываем.
 */
function subscriberDigits(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("7") || d.startsWith("8")) d = d.slice(1);
  while (d && d[0] !== "9") d = d.slice(1);
  return d.slice(0, 10);
}

/** «+7 (916) 123-45-67» — разделители появляются по мере набора. */
function formatPhone(d: string) {
  if (!d) return "";
  let out = `+7 (${d.slice(0, 3)}`;
  if (d.length >= 3) out += ")";
  if (d.length > 3) out += ` ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

const CHEVRON = (
  <svg
    viewBox="0 0 10 6"
    aria-hidden
    fill="none"
    className="pointer-events-none absolute"
    style={{ right: px(14), top: "50%", width: px(10), marginTop: px(-3) }}
  >
    <path
      d="M1 1l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function RequestForm() {
  const order = useOrder();

  const [name, setName] = useState("");
  const [guests, setGuests] = useState("");
  const [phone, setPhone] = useState("");
  const [messenger, setMessenger] = useState("");
  const [wish, setWish] = useState("");
  const [consent, setConsent] = useState(false);
  const [missing, setMissing] = useState({
    name: false,
    phone: false,
    consent: false,
  });
  /** Документ, открытый поверх формы: то же окно, что и в подвале. */
  const [legal, setLegal] = useState<LegalId | null>(null);
  /* Курсор на кнопке отправки: по нему живёт подсказка под заголовком. */
  const [aiming, setAiming] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);
  /**
   * Момент отметки согласия. Документ обещает, что вместе с заявкой
   * сохраняются его версия и время отметки, — значит это надо не вычислять
   * при отправке, а запомнить именно тогда, когда человек поставил галочку.
   */
  const consentAtRef = useRef<string | null>(null);

  const phoneDigits = subscriberDigits(phone);
  const phoneReady = phoneDigits.length === 10;
  const nameReady = name.trim().length > 0;

  function onPhoneChange(next: string) {
    let d = subscriberDigits(next);
    // стёрли разделитель — значит хотели стереть цифру перед ним
    if (next.length < phone.length && d.length === phoneDigits.length)
      d = d.slice(0, -1);
    setPhone(formatPhone(d));
  }

  /** Перезапуск анимации: без снятия класса второй промах прошёл бы молча. */
  function shake(el: HTMLElement | null) {
    if (!el) return;
    el.classList.remove("u-shake");
    void el.offsetWidth;
    el.classList.add("u-shake");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bad = { name: !nameReady, phone: !phoneReady, consent: !consent };
    setMissing(bad);

    /*
      Кнопка остаётся живой, даже когда чего-то не хватает: заблокированная
      кнопка молча не нажимается и не объясняет причину. Промах показываем
      отказом — тряской поля и подписью под кнопкой.
    */
    if (bad.name || bad.phone || bad.consent) {
      if (bad.name) shake(nameRef.current);
      if (bad.phone) shake(phoneRef.current);
      if (bad.consent) shake(consentRef.current);
      const first = bad.name
        ? nameRef.current
        : bad.phone
          ? phoneRef.current
          : consentRef.current?.querySelector<HTMLInputElement>("#consent");
      first?.focus();
      return;
    }

    markSent();

    /*
      Точка подключения бэкенда: отправлять надо этот объект. Отметка согласия
      идёт отдельным полем с версией документа и временем — этого требует сам
      текст согласия, и по нему потом доказывают, на какую редакцию человек
      соглашался.
    */
    const payload = {
      hall: order.hall,
      date: order.date,
      pkg: order.pkg,
      hours: order.hours,
      total,
      name: name.trim(),
      phone,
      guests,
      messenger,
      wish,
      consent: {
        version: LEGAL.consent.version,
        acceptedAt: consentAtRef.current,
      },
    };
    void payload;
  }

  // цвет обводки живёт в CSS (.u-field): инлайновый стиль перебил бы :focus
  const field = {
    marginTop: px(8),
    height: px(42),
    paddingInline: px(14),
    fontSize: px(14.1),
  };

  const label = { fontSize: px(11.6), lineHeight: px(18) };

  const выбранная = order.date
    ? (() => {
        const [y, m, d] = order.date.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : null;
  const chosen = выбранная
    ? `${выбранная.getDate()} ${MONTHS_OF[выбранная.getMonth()]} ${выбранная.getFullYear()}`
    : null;
  /* Та же сумма, что в калькуляторе: считает её общий расчёт из pricing.ts. */
  const total = totalOf(order.pkg, order.hours, выбранная);

  /*
    Чего не хватает — по тем же правилам, по которым заявка не уходит:
    имя, телефон из десяти цифр и отметка согласия. Перечисляем в том же
    порядке, в каком расставлен фокус при отказе, иначе подсказка отправит
    человека не туда, куда прыгнет курсор.
  */
  /* В подсказке дата без года: год виден в сводке над кнопкой. */
  const короткаяДата = выбранная
    ? выбранная.getDate() + " " + MONTHS_OF[выбранная.getMonth()]
    : null;

  const нехватка = [
    nameReady ? null : "имени",
    phoneReady ? null : "телефона",
    consent ? null : "отметки согласия",
  ].filter(Boolean) as string[];

  const перечисли = (список: string[]) =>
    список.length < 2
      ? список[0]
      : список.slice(0, -1).join(", ") + " и " + список[список.length - 1];

  let hint =
    "Мы проверим дату, согласуем вместе детали и забронируем зал за тобой.";
  if (aiming) {
    /*
      «В заявке», а не «отправим»: подсказка показывает содержимое заявки,
      а отправляет её человек — обещание сделать это вместе здесь лишнее.

      Перечисляем только выбранное. Заглушки вроде «зал подберём» стояли в
      одном ряду с настоящими пунктами и читались как ещё один выбор, хотя
      выбора там не было. Что осталось несделанным — отдельной фразой в конце.
    */
    const выбрано = [
      order.hall,
      короткаяДата,
      "пакет " + getPackage(order.pkg).title,
      order.hours + " ч",
    ].filter(Boolean) as string[];

    const подберём = [order.hall ? null : "зал", выбранная ? null : "дату"].filter(
      Boolean,
    ) as string[];

    hint = нехватка.length
      ? "Не хватает " + перечисли(нехватка)
      : "В заявке: " +
        выбрано.join(" · ") +
        (выбранная ? " — " + money(total) : "") +
        (подберём.length
          ? ". " +
            перечисли(подберём).replace(/^./, (c) => c.toUpperCase()) +
            " подберём вместе"
          : "");
  }

  return (
    <section
      id="contact"
      data-section="contact"
      data-step="sent"
      className="u-snap"
      /* Коробка подрезана до содержимого — см. Packages.tsx. */
      style={box(0, 5883, 1440, 860)}
    >
      <SectionHeading
        node="914:1862"
        at={[419, 26, 600, 140]}
        accent="своего праздника"
      >
        Заполни детали
      </SectionHeading>

      {/* Стикер над заголовком — image 87 (914:1863) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/form/heading-sticker.webp"
        alt=""
        aria-hidden
        className="u-step-sticker max-w-none"
        style={{ ...box(430, 4, 44, 41), transform: "rotate(-12.2deg)" }}
      />

      {/* Галочка выполненного шага — на месте стикера, см. StepDone. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/steps/done.webp"
        alt=""
        aria-hidden
        loading="lazy"
        className="u-step-check max-w-none"
        style={{ ...box(430, 4, 44, 41), transform: "rotate(-12.2deg)" }}
      />
      <StepDone step="sent" at={[430, 4, 44, 41]} />

      {/*
        Подсказка под заголовком — как у залов, пакетов и даты. Здесь под
        курсором она отвечает на вопрос, который человек задаёт перед самым
        нажатием: всё ли готово. Если чего-то не хватает — говорим чего, не
        дожидаясь отказа; если готово — показываем, что именно уйдёт.
      */}
      <p
        className="u-lede u-step-hint"
        data-node-id="914:1801"
        data-active={aiming}
        style={box(220, 191, 1000, 28)}
      >
        {hint}
      </p>

      <form
        data-node-id="914:1802"
        className="rounded-md bg-surface"
        style={{
          /*
            Высота 646 вместо 670: поле пожеланий стало на 24 ниже, и всё, что
            под ним, поднялось. Нижнее поле формы осталось прежним — 33, как
            сверху.
          */
          ...box(230, 224, 980, 628),
          boxShadow: "var(--shadow-card-lg)",
        }}
        onSubmit={onSubmit}
        noValidate
      >
        {/* Зал 914:1803 — девять залов из секции «Выбери зал» */}
        <div style={box(33, 33, 914, 69)}>
          <label
            htmlFor="hall"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Зал
          </label>
          <span className="relative block text-ink-muted">
            <select
              id="hall"
              name="hall"
              value={order.hall}
              onChange={(e) => pickHall(e.target.value)}
              className="u-field block w-full appearance-none rounded-sm bg-surface-alt font-sans text-ink"
              style={{ ...field, paddingRight: px(34) }}
            >
              <option value="">Помогите выбрать</option>
              {HALLS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {CHEVRON}
          </span>
        </div>

        {/* Имя 914:1812 — обязательное */}
        <div style={box(33, 118, 448, 68)}>
          <label
            htmlFor="name"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Как тебя зовут
          </label>
          <input
            ref={nameRef}
            id="name"
            name="name"
            required
            aria-invalid={missing.name}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (missing.name) setMissing((m) => ({ ...m, name: false }));
            }}
            placeholder="Имя"
            className="u-field block w-full rounded-sm bg-surface-alt font-sans text-ink placeholder:text-ink-muted"
            style={field}
          />
        </div>

        {/* Гости 914:1820 — список от двух до шестидесяти */}
        <div style={box(498, 118, 448, 68)}>
          <label
            htmlFor="guests"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Сколько гостей
          </label>
          <span className="relative block text-ink-muted">
            <select
              id="guests"
              name="guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="u-field block w-full appearance-none rounded-sm bg-surface-alt font-sans text-ink"
              style={{ ...field, paddingRight: px(34) }}
            >
              <option value="">Примерно</option>
              {GUESTS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {CHEVRON}
          </span>
        </div>

        {/* Телефон 914:1828 — обязательное, строго по маске */}
        <div style={box(33, 203, 448, 90)}>
          <label
            htmlFor="phone"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Телефон
          </label>
          <input
            ref={phoneRef}
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            aria-invalid={missing.phone}
            value={phone}
            onChange={(e) => {
              onPhoneChange(e.target.value);
              if (missing.phone) setMissing((m) => ({ ...m, phone: false }));
            }}
            placeholder="+7 (9__) ___-__-__"
            className="u-field block w-full rounded-sm bg-surface-alt font-sans text-ink placeholder:text-ink-muted"
            style={field}
          />
        </div>

        {/* Мессенджер 914:1836 */}
        <div style={box(498, 203, 448, 90)}>
          <label
            htmlFor="messenger"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Мессенджер
          </label>
          <input
            id="messenger"
            name="messenger"
            value={messenger}
            onChange={(e) => setMessenger(formatHandle(e.target.value))}
            placeholder="@username"
            className="u-field block w-full rounded-sm bg-surface-alt font-sans text-ink placeholder:text-ink-muted"
            style={field}
          />
          <p
            className="font-sans text-ink-muted"
            style={{ marginTop: px(7), fontSize: px(10.8) }}
          >
            Telegram или MAX
          </p>
        </div>

        {/* Пожелание 914:1842 */}
        <div style={box(33, 309, 914, 90)}>
          <label
            htmlFor="wish"
            className="block font-sans font-semibold text-ink"
            style={label}
          >
            Вопрос или пожелание
          </label>
          <textarea
            id="wish"
            name="wish"
            rows={3}
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            placeholder="Например: хочу тотал блэк вечеринку"
            className="u-field block w-full resize-none rounded-sm bg-surface-alt font-sans text-ink placeholder:text-ink-muted"
            style={{
              marginTop: px(8),
              height: px(91),
              padding: `${px(12)} ${px(14)}`,
              fontSize: px(14.1),
            }}
          />
        </div>

        {/* Сводка выбранного 914:1848 — то же, что в калькуляторе выше */}
        <div
          className="flex items-center rounded-sm bg-surface-alt"
          style={{ ...box(33, 422, 914, 48), paddingInline: px(18) }}
        >
          <p
            className="font-sans font-medium text-ink"
            style={{ fontSize: px(13.3) }}
          >
            {chosen
              ? `${chosen} · пакет ${getPackage(order.pkg).title} · ${order.hours} ч`
              : `Пакет ${getPackage(order.pkg).title} · ${order.hours} ч`}
          </p>
          {/*
            Сумма из калькулятора. Человек считал её наверху, а отправляет
            заявку здесь: без неё приходится верить памяти или возвращаться
            к расчёту. Пока дата не выбрана, аренду считать не из чего —
            говорим об этом прямо, а не показываем цену одного пакета как
            итог.
          */}
          <p
            className="u-form-total ml-auto font-sans font-bold text-ink"
            style={{ fontSize: px(13.3), marginRight: px(18) }}
          >
            {выбранная ? (
              <>
                Итого <span className="text-primary">{money(total)}</span>
              </>
            ) : (
              "Выбери дату — посчитаем"
            )}
          </p>
          <a
            href="#price"
            className="font-sans text-primary underline-offset-2 hover:underline"
            style={{ fontSize: px(11.6) }}
          >
            Изменить
          </a>
        </div>

        {/*
          Согласие 914:1853 — обязательное, без него заявка не уходит.

          В макете здесь одна строка «Даю согласие на обработку персональных
          данных». Строка расшифровки добавлена: отметка должна быть
          информированной, то есть человеку до отметки видно, на что он
          соглашается и где прочитать условия. Формулировки и разбивка на две
          строки взяты с черновой версии сайта, тексты открываются тут же в
          модалке — теми же документами, что и в подвале.

          Блок поднят с 507 на 500 и занял 37 вместо 27: вторая строка влезла
          в зазор до кнопки, поэтому кнопка и подпись под ней остались на
          макетных местах.
        */}
        <div
          ref={consentRef}
          className="flex items-start"
          style={box(33, 476, 914, 37)}
        >
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            checked={consent}
            aria-invalid={missing.consent}
            aria-describedby="consent-note"
            onChange={(e) => {
              setConsent(e.target.checked);
              /* Момент отметки уходит вместе с заявкой — так обещает документ. */
              consentAtRef.current = e.target.checked
                ? new Date().toISOString()
                : null;
              if (e.target.checked)
                setMissing((m) => ({ ...m, consent: false }));
            }}
            /*
              18 вместо макетных 11. Отметка обязательная — без неё заявка не
              уходит, — а попасть в квадратик 11×11 мышью тяжело, пальцем почти
              нельзя. Подпись рядом кликабельна через label, но полагаться
              только на неё нельзя: глазом человек целится в сам квадрат.
            */
            className="u-consent-box shrink-0 rounded-xs border border-border-soft accent-[var(--color-primary)]"
            style={{ width: px(18), height: px(18), marginTop: px(1) }}
          />
          <span style={{ marginLeft: px(10) }}>
            <label
              htmlFor="consent"
              className={`block font-sans font-semibold ${
                missing.consent ? "text-primary" : "text-ink"
              }`}
              style={{ fontSize: px(11.6), lineHeight: px(18) }}
            >
              Даю отдельное{" "}
              <button
                type="button"
                onClick={() => setLegal("consent")}
                className="u-legal-link"
              >
                согласие на обработку персональных данных
              </button>{" "}
              для подготовки предложения и ответа на заявку.
            </label>
            <p
              id="consent-note"
              className="font-sans text-ink-muted"
              style={{
                marginTop: px(3),
                fontSize: px(10.4),
                lineHeight: px(16),
              }}
            >
              Условия обработки указаны в{" "}
              <button
                type="button"
                onClick={() => setLegal("privacy")}
                className="u-legal-link"
              >
                политике конфиденциальности
              </button>
              . Рекламные сообщения требуют отдельного согласия.
            </p>
          </span>
        </div>

        {/* Кнопка 914:1857 */}
        <button
          type="submit"
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") setAiming(true);
          }}
          onPointerLeave={() => setAiming(false)}
          onFocus={() => setAiming(true)}
          onBlur={() => setAiming(false)}
          className="u-cta font-extrabold hover:-translate-y-2 hover:bg-navy hover:text-surface"
          style={{ ...box(33, 523, 914, 60), fontSize: px(18.3) }}
        >
          ОТПРАВИТЬ ЗАЯВКУ
        </button>

        {/*
          Подпись под кнопкой объясняет отказ. Имя с телефоном идут первыми:
          на них наводится фокус, и подсказка должна говорить про то поле, куда
          человека только что отправили.
        */}
        <p
          className={`text-center font-sans ${
            missing.name || missing.phone || missing.consent
              ? "text-primary"
              : "text-ink-muted"
          }`}
          role="status"
          style={{ ...box(33, 597, 914, 16), fontSize: px(11.6) }}
        >
          {missing.name || missing.phone
            ? "Заполни имя и телефон — без них мы не сможем связаться"
            : missing.consent
              ? "Поставь отметку согласия — без неё мы не вправе принять заявку"
              : "С тобой свяжется твой личный менеджер"}
        </p>
      </form>

      <LegalModal id={legal} onClose={() => setLegal(null)} />
    </section>
  );
}

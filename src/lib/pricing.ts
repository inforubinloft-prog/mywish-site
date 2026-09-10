/**
 * Прайс праздника — один источник правды для карточек пакетов и калькулятора.
 *
 * Стоимость складывается из двух частей: пакет + аренда зала. Аренда зависит
 * от дня недели и от даты: декабрь идёт по отдельному прайсу, причём двумя
 * периодами — до 11 числа и с 12-го. Поэтому тариф считает функция от даты,
 * а не таблица по дню недели, как было раньше.
 */

export type PackageId = "happy" | "extra" | "wow";

export type Package = {
  id: PackageId;
  /** Как в карточке пакета: с кавычками. */
  title: string;
  /** Как в списке калькулятора: без кавычек. */
  short: string;
  price: number;
};

export const PACKAGES: Package[] = [
  { id: "happy", title: "«Хэппи»", short: "Хэппи", price: 19700 },
  { id: "extra", title: "«Экстра»", short: "Экстра", price: 32500 },
  { id: "wow", title: "«Вау»", short: "Вау", price: 100500 },
];

export const getPackage = (id: PackageId) =>
  PACKAGES.find((p) => p.id === id) ?? PACKAGES[1];

/** День недели от понедельника (0) до воскресенья (6). */
export const weekdayOf = (date: Date) => (date.getDay() + 6) % 7;

/**
 * Набор тарифов аренды за час. Дни делятся на три группы — так же, как их
 * различает цветом календарь: будни, пятница с воскресеньем и суббота.
 */
export type RentTier = {
  /** Название периода для легенды под календарём. */
  label: string;
  /** Пн–чт. */
  weekday: number;
  /** Пт и вс. */
  weekend: number;
  /** Сб. */
  saturday: number;
};

export const RENT_BASE: RentTier = {
  label: "Обычный прайс",
  weekday: 2900,
  weekend: 4500,
  saturday: 6000,
};

/**
 * Декабрь идёт дороже и двумя ступенями: предновогодние даты разбирают
 * первыми, поэтому со второй декады тариф ещё выше.
 */
export const RENT_DECEMBER_EARLY: RentTier = {
  label: "1–11 декабря",
  weekday: 3800,
  weekend: 5850,
  saturday: 7800,
};

export const RENT_DECEMBER_LATE: RentTier = {
  label: "с 12 декабря",
  weekday: 4350,
  weekend: 6750,
  saturday: 9000,
};

/** Какой набор тарифов действует на эту дату. */
export const rentTierOf = (date: Date): RentTier => {
  if (date.getMonth() !== 11) return RENT_BASE;
  return date.getDate() <= 11 ? RENT_DECEMBER_EARLY : RENT_DECEMBER_LATE;
};

/** Тариф за час в этот день: набор по дате, ставка внутри — по дню недели. */
export const rentOfTier = (tier: RentTier, weekday: number) => {
  if (weekday === 5) return tier.saturday;
  if (weekday === 4 || weekday === 6) return tier.weekend;
  return tier.weekday;
};

export const rentPerHourOf = (date: Date) =>
  rentOfTier(rentTierOf(date), weekdayOf(date));

/**
 * Все наборы, действующие внутри показанного месяца, по порядку. Для обычного
 * месяца это один набор, для декабря — два: легенда под календарём должна
 * показать оба, иначе цены в ячейках после 11 числа выглядят опечаткой.
 */
export const rentTiersOfMonth = (year: number, month: number): RentTier[] =>
  month === 11
    ? [RENT_DECEMBER_EARLY, RENT_DECEMBER_LATE]
    : [rentTierOf(new Date(year, month, 1))];

/** Доступная длительность брони: от четырёх часов. */
export const HOURS = [4, 5, 6, 7, 8];

/**
 * «19 600 ₽» — разряды и знак рубля отбиты неразрывным пробелом, чтобы сумма
 * не разрывалась переносом.
 */
export const money = (value: number) =>
  `${value.toLocaleString("ru-RU").replace(/\s/g, " ")} ₽`;

export const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

/** Родительный падеж — для строки «Аренда 18 августа». */
export const MONTHS_OF = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** Ключ даты без времени и часовых поясов: «2026-09-08». */
/**
 * Сумма заказа: пакет плюс аренда за выбранные часы.
 *
 * Живёт здесь, а не в калькуляторе, потому что то же число показывает форма
 * внизу страницы. Пока их было два, они могли разойтись на декабрьском
 * тарифе — а расхождение в цене на одной странице хуже, чем её отсутствие.
 *
 * Без даты аренду считать не из чего: до её выбора сумма — это цена пакета.
 */
export const totalOf = (pkg: PackageId, hours: number, date: Date | null) =>
  getPackage(pkg).price + (date ? rentPerHourOf(date) * hours : 0);

export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

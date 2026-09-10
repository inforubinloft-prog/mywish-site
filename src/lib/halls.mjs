/**
 * Залы и площадки — один источник правды.
 *
 * До этого списки залов жили в четырёх местах и в трёх разных написаниях:
 * «Блэк» в подвале против «Блек» в форме, «Рубинхол» против «Рубин Холл»,
 * «Санта Лючия» против «Санта-Лючия». Пока это были просто подписи, расхождение
 * никому не мешало; со страницей залов оно превратилось бы в битые ссылки.
 * Здесь принято одно написание, и остальные экраны берут названия отсюда.
 *
 * Модуль намеренно .mjs, а не .ts: те же данные нужны скрипту пересчёта
 * фотографий, а он запускается обычным node, без сборки.
 *
 * @typedef {object} Location
 * @property {string} slug     Якорь на странице залов.
 * @property {string} title    Адрес, как в секции «где проходит».
 * @property {string} metro    Метро и время на такси.
 * @property {string} map      Карточка площадки на Яндекс.Картах.
 * @property {string} rating   Плашка рейтинга из макета (public/figma/where).
 *
 * @typedef {object} Hall
 * @property {string} slug     Якорь и имя папки в public/halls.
 * @property {string} title    Название зала.
 * @property {string} location Ссылка на площадку по её slug.
 * @property {string} src      Папка исходников в «фото залов».
 * @property {number} shots    Сколько кадров лежит в public/halls/<slug>.
 * @property {number} area     Площадь зала в квадратных метрах.
 * @property {string} note     Чем зал отличается — по самим фотографиям.
 * @property {string[]} plans   Файлы схем в «залы для кукольного домика».
 */

/** @type {Location[]} */
export const LOCATIONS = [
  {
    slug: "kozhevennaya-34",
    title: "Кожевенная линия, 34А",
    metro: "м. Горный институт · ≈ 8 минут на такси",
    map: "https://yandex.ru/maps/org/rubin_loft/94381773448/",
    rating: "rating-1",
  },
  {
    slug: "kachalova-8",
    title: "Профессора Качалова, 8И",
    metro: "м. Площадь Александра Невского · ≈ 7 минут на такси",
    map: "https://yandex.ru/maps/org/rubin_loft/224972655169/",
    rating: "rating-2",
  },
  {
    slug: "kachalova-15",
    title: "Профессора Качалова, 15А",
    metro: "м. Площадь Александра Невского · ≈ 9 минут на такси",
    map: "https://yandex.ru/maps/org/rubin_loft/100393680164/",
    rating: "rating-3",
  },
];

/**
 * Порядок залов внутри площадки — как в секции «где проходит».
 *
 * `note` описывает то, что видно на самих фотографиях, и ничего сверх того:
 * вместимость и оснащение сюда не выдуманы — их ждём от заказчика.
 *
 * @type {Hall[]}
 */
export const HALLS = [
  {
    slug: "flamingo",
    title: "Фламинго",
    location: "kozhevennaya-34",
    src: "Кожевенная 34/Фламинго",
    shots: 15,
    area: 101,
    plans: ["Кожевенная 34/06_Фламинго.png"],
    note: "Розовый неон, полосатые колонны и бар со стойкой.",
  },
  {
    slug: "white",
    title: "Вайт",
    location: "kozhevennaya-34",
    src: "Кожевенная 34/Вайт",
    shots: 15,
    area: 135,
    plans: ["Кожевенная 34/02_Вайт.png","Кожевенная 34/03_Вайт_с_боку.png"],
    note: "Светлый лофт: панорамные окна во всю стену и открытый потолок.",
  },
  {
    slug: "black",
    title: "Блэк",
    location: "kozhevennaya-34",
    src: "Кожевенная 34/Блэк",
    shots: 12,
    area: 93,
    plans: ["Кожевенная 34/Блек.png"],
    note: "Чёрные стены, живая зелень на панели и длинный сервированный стол.",
  },
  {
    slug: "barbie",
    title: "Барби",
    location: "kachalova-8",
    src: "Профессора Качалова 8/Барби",
    shots: 15,
    area: 41,
    plans: ["Профессора Качалова 8И/07_Барби.png"],
    note: "Мрамор, арка из сакуры и облака-люстры над столом.",
  },
  {
    slug: "sicily",
    title: "Сицилия",
    location: "kachalova-8",
    src: "Профессора Качалова 8/Сицилия",
    shots: 15,
    area: 46,
    plans: ["Профессора Качалова 8И/05_Сицилия.png"],
    note: "Камин, большой экран и стол из цельного дерева.",
  },
  {
    slug: "ocean-drive",
    title: "Оушен Драйв",
    location: "kachalova-8",
    src: "Профессора Качалова 8/Оушен Драйв",
    shots: 15,
    area: 61,
    plans: ["Профессора Качалова 8И/09_ОушенДрайв.png"],
    note: "Клубный зал: шахматный пол, диско-шары и неоновая арка у бара.",
  },
  {
    slug: "leonardo",
    title: "Леонардо",
    location: "kachalova-15",
    src: "Профессора Качалова 15/Леонардо",
    shots: 13,
    area: 45,
    plans: ["Профессора Качалова 15А/01_Леонардо.png"],
    note: "Хрустальная люстра, зеркальные панели и тёмный мраморный пол.",
  },
  {
    slug: "santa-lucia",
    title: "Санта-Лючия",
    location: "kachalova-15",
    src: "Профессора Качалова 15/Санта-Лючия",
    shots: 15,
    area: 60,
    plans: ["Профессора Качалова 15А/04_Санта_Лючия.png"],
    note: "Терракотовые стены, паркет ёлочкой и барная стойка.",
  },
  {
    slug: "rubin-hall",
    title: "Рубин Холл",
    location: "kachalova-15",
    src: "Профессора Качалова 15/РубинХолл",
    shots: 15,
    area: 65,
    plans: ["Профессора Качалова 15А/10_RubinHall.png","Профессора Качалова 15А/РубинХолл.png"],
    note: "Светлые арки, неоновая вывеска и стол на большую компанию.",
  },
];

/** Залы одной площадки, в порядке списка. */
export const hallsOf = (locationSlug) =>
  HALLS.filter((h) => h.location === locationSlug);

/** Площадка, на которой стоит зал. */
export const locationOf = (hall) =>
  LOCATIONS.find((l) => l.slug === hall.location);

/** Пути к схемам зала: plan-1.webp … в public/halls/<slug>. */
export const plansOf = (hall) =>
  hall.plans.map((_, i) => `/halls/${hall.slug}/plan-${i + 1}.webp`);

/** Пути к кадрам зала: 01.webp … NN.webp в public/halls/<slug>. */
export const shotsOf = (hall) =>
  Array.from(
    { length: hall.shots },
    (_, i) => `/halls/${hall.slug}/${String(i + 1).padStart(2, "0")}.webp`,
  );

/** Названия залов для подписей — там, где нужен просто перечень. */
export const HALL_TITLES = HALLS.map((h) => h.title);

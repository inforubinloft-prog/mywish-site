"use client";

import { useSyncExternalStore } from "react";
import type { PackageId } from "./pricing";

/**
 * Черновик заказа, общий для всей страницы: кнопка «выбрать» в карточке пакета
 * и калькулятор ниже — это один и тот же выбор, поэтому состояние живёт вне
 * компонентов. Контекст здесь не нужен: обе точки — маленькие клиентские
 * острова внутри серверной страницы.
 *
 * touched отделяет «мы рекомендуем» от «человек выбрал»: до первого клика
 * пакет и длительность подсвечены мягко, после — в полную силу.
 */
export type Order = {
  pkg: PackageId;
  pkgTouched: boolean;
  hours: number;
  hoursTouched: boolean;
  /** Ключ даты вида «2026-09-08»; null, пока страница не ожила. */
  date: string | null;
  /** Дату поставил человек, а не подставили по умолчанию. */
  dateTouched: boolean;
  /** Название зала из формы; пустая строка — «помогите выбрать». */
  hall: string;
  sent: boolean;
};

const INITIAL: Order = {
  pkg: "extra",
  pkgTouched: false,
  hours: 5,
  hoursTouched: false,
  date: null,
  dateTouched: false,
  hall: "",
  sent: false,
};

let state: Order = INITIAL;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function setOrder(patch: Partial<Order>) {
  state = { ...state, ...patch };
  emit();
}

/**
 * Выбор пакета. Повторное нажатие по уже выбранному снимает выбор — так же,
 * как у залов во втором блоке.
 *
 * Снятый выбор — это не «пакета нет»: расчёт всё равно должен что-то
 * показывать. Возвращаемся к рекомендованному, и pkgTouched снова false —
 * по нему подпись «наш выбор» отличает совет от решения человека.
 */
export const pickPackage = (pkg: PackageId) =>
  setOrder(
    state.pkgTouched && state.pkg === pkg
      ? { pkg: INITIAL.pkg, pkgTouched: false }
      : { pkg, pkgTouched: true },
  );

/** Выбран ли пакет человеком (а не подсказан нами). */
export const isPackagePicked = (pkg: PackageId) =>
  state.pkgTouched && state.pkg === pkg;

export const pickHours = (hours: number) =>
  setOrder({ hours, hoursTouched: true });

export const pickDate = (date: string) =>
  setOrder({ date, dateTouched: true });

/**
 * Выбор зала переживает переход между страницами.
 *
 * Зал выбирают на /halls, а нужен он в форме на главной — это разные адреса,
 * и черновик в памяти между ними теряется, если браузер перезагрузит страницу.
 * Кладём в sessionStorage: выбор живёт в этой вкладке до её закрытия и не
 * всплывает через неделю в новой сессии, как было бы с localStorage.
 */
const HALL_KEY = "mywish:hall";

export const pickHall = (hall: string) => {
  setOrder({ hall });
  try {
    if (hall) sessionStorage.setItem(HALL_KEY, hall);
    else sessionStorage.removeItem(HALL_KEY);
  } catch {
    /* приватный режим и запрет хранилища — выбор просто не переживёт переход */
  }
};

/**
 * Поднять сохранённый зал. Вызывается после гидрации, а не при первом
 * отрисовывании: на сервере sessionStorage нет, и разметка разошлась бы.
 *
 * Перезагрузка выбор сбрасывает. Хранилище нужно ровно для одного — донести
 * зал со страницы залов в форму на главной; переживать обновление страницы
 * оно не должно, иначе выбор нечем снять: человек жмёт F5, а зал по-прежнему
 * отмечен, и это выглядит как заевшая кнопка. Тип перехода отличает
 * обновление от обычного перехода по ссылке.
 */
export function restoreHall() {
  if (state.hall) return;
  try {
    const [nav] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (nav?.type === "reload") {
      sessionStorage.removeItem(HALL_KEY);
      return;
    }
    const hall = sessionStorage.getItem(HALL_KEY);
    if (hall) setOrder({ hall });
  } catch {
    /* см. выше */
  }
}

export const markSent = () => setOrder({ sent: true });

/** Дата по умолчанию ставится после гидрации: на сервере «сегодня» неизвестно. */
export function initDate(date: string) {
  if (state.date === null) setOrder({ date });
}

export function useOrder(): Order {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => INITIAL,
  );
}

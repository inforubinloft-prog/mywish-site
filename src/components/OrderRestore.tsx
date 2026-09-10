"use client";

import { useEffect } from "react";
import { restoreHall } from "@/lib/order";

/**
 * Поднимает выбранный зал после перехода со страницы залов.
 *
 * Отдельный компонент, а не строчка внутри формы: черновик заказа читают три
 * острова на странице — карточки пакетов, калькулятор и форма, — и поднимать
 * его должен кто-то один, до того как они отрисуются с пустым залом.
 */
export default function OrderRestore() {
  useEffect(() => {
    restoreHall();
  }, []);

  return null;
}

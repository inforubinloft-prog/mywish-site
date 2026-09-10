"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

export type FoodSetItem = {
  name: string;
  price: string;
  image: string;
  /**
   * Сколько таких в наборе. Больше одного бывает редко — у «Вау» на столе два
   * одинаковых бокса салатов. Отдельной плашкой это выглядело бы ошибкой
   * вёрстки: две одинаковые картинки рядом читаются как дубль, а не как две
   * порции. Поэтому пометка внутри позиции.
   */
  count?: number;
};

export default function FoodMenuModal({
  packageName,
  deposit,
  tableImage,
  items,
}: {
  packageName: string;
  deposit: string;
  tableImage: string;
  items: FoodSetItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"set" | "menu">("set");
  const [menuPage, setMenuPage] = useState(1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add("food-modal-open");
    }
    if (!open && dialog.open) dialog.close();

    return () => document.documentElement.classList.remove("food-modal-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      document.documentElement.classList.remove("food-modal-open");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    document.documentElement.classList.remove("food-modal-open");
  };

  return (
    <>
      <button
        type="button"
        className="u-food-trigger font-sans font-medium"
        onClick={() => {
          setView("set");
          setMenuPage(1);
          setOpen(true);
        }}
        aria-haspopup="dialog"
      >
        <span className="u-food-trigger-label">• Еда: депозит {deposit}</span>
        <span className="u-food-trigger-icon" aria-hidden>
          <svg viewBox="0 0 18 18" fill="none">
            <path d="M3 11.5h12M4.2 10.8a4.8 4.8 0 0 1 9.6 0M9 5.8V4.5M7.8 4.2h2.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="u-food-modal"
        data-view={view}
        aria-labelledby={titleId}
        onClose={close}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        {open ? (
          <article className="u-food-panel">
            <header className="u-food-head">
              <div>
                <p className="u-food-kicker">Пакет {packageName}</p>
                <h2 id={titleId}>Еда на депозит {deposit}</h2>
                <p>
                  Мы уже собрали удачный вариант. Его можно оставить как есть
                  или заменить и добавить любые позиции из меню.
                </p>
              </div>
              <button type="button" className="u-food-close" onClick={close} aria-label="Закрыть меню">
                <svg viewBox="0 0 16 16" aria-hidden fill="none">
                  <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <nav className="u-food-tabs" aria-label="Содержание меню">
              <button type="button" aria-pressed={view === "set"} onClick={() => setView("set")}>
                Наш выбор
              </button>
              <button type="button" aria-pressed={view === "menu"} onClick={() => { setMenuPage(1); setView("menu"); }}>
                Меню
              </button>
            </nav>

            <div className={`u-food-body${view === "menu" ? " u-food-body-menu" : ""}`}>
              {view === "set" ? (
                <div className="u-food-set">
                  <figure className="u-food-table">
                    <Image src={tableImage} alt={`Пример сервировки для пакета ${packageName}`} fill sizes="(max-width: 700px) 94vw, 900px" />
                  </figure>

                  <div className="u-food-set-intro">
                    <h3>Готовый набор в рамках депозита</h3>
                    <strong>{deposit}</strong>
                  </div>

                  <ul className="u-food-items">
                    {items.map((item) => (
                      <li key={item.name}>
                        <span className="u-food-item-image">
                          <Image src={item.image} alt="" fill sizes="160px" />
                        </span>
                        <span className="u-food-item-copy">
                          <b>
                            {item.name}
                            {item.count && item.count > 1 ? (
                              <span className="u-food-item-count">
                                ×{item.count}
                              </span>
                            ) : null}
                          </b>
                          <span>{item.price}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <aside className="u-food-note">
                    <span aria-hidden>↺</span>
                    <p>
                      <b>Набор — это рекомендация, не ограничение.</b>
                      Менеджер поможет поменять блюда, добавить позиции и
                      пересчитать разницу, если итог выйдет за депозит.
                    </p>
                  </aside>
                </div>
              ) : (
                <div className="u-food-menu-view">
                  <div
                    className="u-food-menu-carousel"
                    tabIndex={0}
                    aria-label="Полное меню, листайте стрелками"
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") setMenuPage((page) => (page + 6) % 7);
                      if (event.key === "ArrowRight") setMenuPage((page) => (page + 1) % 7);
                    }}
                  >
                    <div className="u-food-menu-stack">
                      {Array.from({ length: 7 }, (_, page) => {
                        const previousPage = (menuPage + 6) % 7;
                        const nextPage = (menuPage + 1) % 7;
                        const position =
                          page === menuPage
                            ? "active"
                            : page === previousPage
                              ? "prev"
                              : page === nextPage
                                ? "next"
                                : "hidden";
                        return (
                          <button
                            type="button"
                            key={page}
                            className="u-food-menu-page"
                            data-position={position}
                            aria-hidden={position === "hidden"}
                            tabIndex={position === "prev" || position === "next" ? 0 : -1}
                            disabled={position === "active" || position === "hidden"}
                            onClick={() => setMenuPage(page)}
                            aria-label={position === "prev" ? "Показать предыдущую страницу меню" : position === "next" ? "Показать следующую страницу меню" : undefined}
                          >
                            <Image
                              src={`/packages/food/menu/page-${String(page).padStart(2, "0")}.webp`}
                              alt={page === 0 ? "Обложка меню MyWish" : `Страница ${page} полного меню MyWish`}
                              width={595}
                              height={842}
                              sizes="(max-width: 700px) 86vw, 660px"
                            />
                          </button>
                        );
                      })}
                    </div>

                    <p className="u-food-menu-count" aria-live="polite">
                      {menuPage === 0 ? "Обложка" : `${menuPage} / 6`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </article>
        ) : null}
      </dialog>
    </>
  );
}

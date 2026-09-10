import type { Metadata, Viewport } from "next";
import { fira, manrope, pinyon } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyWish — женские праздники в Санкт-Петербурге",
  description:
    "Твой вишлист уже собран в праздник. Залы, пакеты, личный менеджер и Reels после праздника — MyWish by Rubin Loft, Санкт-Петербург.",
};

export const viewport: Viewport = {
  themeColor: "#fff9f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      data-scroll-behavior — для Next, а не для CSS: у нас на <html> стоит
      scroll-behavior: smooth ради переходов по якорям внутри страницы, и без
      этого признака Next восстанавливает позицию при смене страницы тем же
      плавным ходом. Между главной и залами это выглядело как проматывание
      всей страницы вместо появления новой.
    */
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${fira.variable} ${manrope.variable} ${pinyon.variable}`}
    >
      <head>
        {/*
          Блоки появляются при прокрутке: до этого их прячет CSS, а показывает
          наблюдатель из ScrollReveal. Без скрипта показывать было бы некому,
          поэтому здесь страховка — при выключенном JS содержимое просто на
          месте, без появления.
        */}
        <noscript>
          <style>{`[data-reveal]:not([data-revealed]){opacity:1!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}

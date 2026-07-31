"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CommandPalette } from "./command";
import { SiteBar } from "./site-bar";
import { SiteFooter } from "./site-footer";
import { MobileMenu, MobileTabBar } from "./site-mobile";

/* ==========================================================================
   Sayt qobig'i
   --------------------------------------------------------------------------
   Tartib: tepada navigatsiya paneli (ochiluvchi menyular bilan), ostida
   kontent, eng pastda futer; mobilda qo'shimcha tab-panel. Chap rail olib
   tashlangan — navigatsiya tepada, shuning uchun kontent butun kenglikni
   egallaydi va sahifa markazlashadi.

   Futer huquqiy va yordam havolalarini ushlab turadi: railsiz tartibda
   ularga boshqa yo'l qolmagan edi.

   SAHIFA ALMASHUVI. `<main>` ga manzil bo'yicha `key` beriladi, shuning
   uchun har bir yangi sahifada React blokni qaytadan o'rnatadi va
   `page-in` animatsiyasi (220ms fade + 8px ko'tarilish) qayta ishga
   tushadi. Siljish ataylab kichik: yirik siljish yopishqoq panel bilan
   to'qnashadi va sahifa "sakragan" ko'rinadi.
   ========================================================================== */

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // ⌘K / Ctrl+K — buyruq paneli. `/` ham ishlaydi, lekin faqat matn
  // maydonidan tashqarida: aks holda izoh yozayotganda panel ochilib ketardi.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((previous) => !previous);
        return;
      }
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="aurora-canvas flex min-h-dvh flex-col">
      <SiteBar onCommand={() => setCommandOpen(true)} onMobileMenu={() => setMenuOpen(true)} />

      {/* Navbar bilan AYNAN bir xil konteyner (`shell`): kenglik cheklovi va
          chekinish bitta joyda — shu tufayli logo, menyu va sahifa bloklari
          bir vertikal chiziqda turadi. */}
      <main key={pathname} className="page-in shell flex-1 pt-12 pb-16 sm:pt-14 lg:pb-24">
        {children}
      </main>

      <SiteFooter />

      <MobileTabBar onMore={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

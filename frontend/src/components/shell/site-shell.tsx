"use client";

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
   ========================================================================== */

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

      {/* Navbar bilan AYNAN bir xil konteyner: kenglik cheklovi va chekinish
          bitta elementda — shu tufayli logo, menyu va sahifa bloklari bir
          vertikal chiziqda turadi. */}
      <main className="mx-auto w-full max-w-[var(--page)] flex-1 px-4 pt-9 pb-10 sm:px-6 sm:pt-10 lg:px-[var(--gutter)] lg:pb-16">
        {children}
      </main>

      <SiteFooter />

      <MobileTabBar onMore={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

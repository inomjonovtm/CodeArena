"use client";

import { useEffect, useState } from "react";

import { CommandPalette } from "./command";
import { MAIN_ID, SkipLink } from "./skip-link";
import { SiteFooter } from "./site-footer";
import { MobileMenu, MobileTabBar } from "./site-mobile";
import { TopNav } from "./topnav";

/* ==========================================================================
   SAYT QOBIG'I
   --------------------------------------------------------------------------
   Tepada navigatsiya lentasi (asosiy bo'limlar tekis, faol belgi — pastki
   yashil chiziq), ostida MARKAZLASHGAN kontent (1120px), eng pastda
   ingichka futer. Mobilda qo'shimcha pastki tab-panel.

   Har bir sahifa `PageHead` bilan boshlanadi — u och yashil PANEL bo'lib,
   sahifaning "boshi" ekanini fon bilan e'lon qiladi (surface.tsx).
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
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <SkipLink />

      <TopNav
        onCommand={() => setCommandOpen(true)}
        onMobileMenu={() => setMenuOpen(true)}
      />

      <main id={MAIN_ID} className="wrap w-full flex-1 pt-6 pb-16 sm:pt-8">
        {children}
      </main>

      <SiteFooter />

      <MobileTabBar onMore={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

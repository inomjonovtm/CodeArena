"use client";

import { CalendarDays, LayoutDashboard, Puzzle, Terminal, Trophy } from "lucide-react";

export interface StudioNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Bo'lim ko'rinishi uchun kerakli huquq kodi. */
  perm?: string;
  /** Ichki sahifalarda ham aktiv qolsin (`/studio/problems/<id>`). */
  matchPrefix?: boolean;
  /** Komandalar panelida qidirish uchun qo'shimcha so'zlar. */
  keywords?: string;
}

const icon = "size-[17px] shrink-0";

/**
 * Studio menyusi — TEKIS ro'yxat, beshta band.
 *
 * IKKI SODDALASHTIRISH:
 *
 * 1. BILIM SINOVI BO'LIMI OLIB TASHLANDI. Ilgari bu yerda «Savollar bazasi»
 *    va «Sinovlar» turardi (test-viktorina moduli). Platformada bunday
 *    mahsulot yo'q: CodeArena — kod yozib yechiladigan algoritmik masalalar
 *    platformasi. Ikki begona bo'lim menyuning uchdan birini egallab,
 *    nomlari «test» so'zi bilan boshlangani uchun masala TESTLARI bilan
 *    chalkashardi.
 *
 * 2. GURUH SARLAVHALARI OLIB TASHLANDI. Beshta band uchun «Tayyorlash» va
 *    «Asboblar» sarlavhalari ortiqcha edi: ular ro'yxatni uzaytirib, ikkita
 *    band uchun bitta sarlavha qo'yardi. Tekis ro'yxat qisqa va bir
 *    qarashda o'qiladi.
 *
 * Menyu ham, API ham bitta manbadan — huquq kodlaridan — tekshiriladi,
 * shuning uchun ko'rinadigan bo'lim har doim ochiladi.
 */
export const STUDIO_NAV: StudioNavItem[] = [
  {
    href: "/studio",
    label: "Bosh sahifa",
    icon: <LayoutDashboard className={icon} />,
    keywords: "dashboard boshqaruv holat",
  },
  {
    href: "/studio/problems",
    label: "Masalalar",
    icon: <Puzzle className={icon} />,
    perm: "problems.view",
    matchPrefix: true,
    keywords: "masala problem test checker etalon",
  },
  {
    href: "/studio/contests",
    label: "Olimpiadalar",
    icon: <Trophy className={icon} />,
    perm: "contests.view",
    matchPrefix: true,
    keywords: "olimpiada musobaqa contest hakam natija",
  },
  {
    href: "/studio/daily",
    label: "Kunlik masala",
    icon: <CalendarDays className={icon} />,
    // Kalendarning asosiy ishi — kun biriktirish, bu esa `problems.edit`
    // talab qiladi. Faqat ko'ra oladigan odamga bo'limni ko'rsatish uni
    // 403 xatolarga olib borardi.
    perm: "problems.edit",
    matchPrefix: true,
    keywords: "kunlik daily kalendar bonus seriya",
  },
  {
    href: "/studio/generator",
    label: "Test yasovchi",
    icon: <Terminal className={icon} />,
    perm: "authoring.run",
    keywords: "generator testcase test yasash seed",
  },
];

/** Foydalanuvchi huquqlariga qarab ko'rinadigan bo'limlar. */
export function visibleNav(codes: string[]): StudioNavItem[] {
  const owned = new Set(codes);
  return STUDIO_NAV.filter((item) => !item.perm || owned.has(item.perm));
}

/** Joriy yo'l shu bo'limga tegishlimi. */
export function isActive(pathname: string, item: StudioNavItem): boolean {
  if (item.matchPrefix) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return pathname === item.href;
}

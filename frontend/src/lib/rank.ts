import type { RankInfo } from "./types";

/**
 * Rank ramkasi uchun umumiy stil hisoblagichlari.
 *
 * Ranglar backenddan keladi (`apps/core/ranks.py`), shuning uchun bu yerda
 * ro'yxat takrorlanmaydi — faqat ular qanday chizilishi hal qilinadi. Sayt
 * ham, admin panel ham shu funksiyalarni ishlatadi, ramka ikkalasida bir xil.
 */

/** Ramka qalinligi — avatar o'lchamiga qarab. */
export function ringWidth(size: number): number {
  if (size <= 28) return 2;
  if (size <= 44) return 2.5;
  if (size <= 72) return 3;
  return 4;
}

/**
 * Avatar ramkasi: rank rangidan konus gradient.
 *
 * `padding` — rasm bilan ramka orasidagi bo'shliq, aks holda gradient
 * rasmning chetiga tegib turadi va ramka bilinmaydi.
 */
export function ringStyle(rank: RankInfo | null | undefined, size: number): React.CSSProperties {
  if (!rank) return {};
  const width = ringWidth(size);
  return {
    padding: width,
    background: `conic-gradient(from 140deg, ${rank.color}, ${rank.color_soft}, ${rank.color}, ${rank.color_soft}, ${rank.color})`,
    // Yumshoq nur — yuqori ranklarda ko'zga tashlanadi
    boxShadow: `0 0 0 1px ${rank.color}40, 0 0 ${size / 4}px ${rank.color}30`,
  };
}

/** Nishon (badge) uchun rang to'plami. */
export function rankChipStyle(rank: RankInfo | null | undefined): React.CSSProperties {
  if (!rank) return {};
  // Fon shaffof emas: rank rangi oq bilan aralashtiriladi, shu tufayli
  // nishon har qanday sirt ustida bir xil ko'rinadi.
  return {
    color: rank.color,
    backgroundColor: `color-mix(in oklab, ${rank.color} 12%, var(--pane-solid))`,
  };
}

/** Ranklar guruhi uchun o'zbekcha/inglizcha nom. */
export function rankName(rank: RankInfo | null | undefined, locale: string): string {
  if (!rank) return "";
  return locale === "en" ? rank.name_en : rank.name_uz;
}

/** Eng yuqori ikki rank uchun jonli effekt beriladi. */
export function isElite(rank: RankInfo | null | undefined): boolean {
  return rank?.group === "legend" || rank?.group === "grandmaster";
}

import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  // ‘default’ + ‘template’: oddiy satr sarlavha ildizdagi shablonni uzib
  // qo‘yardi — ichki sahifalar (masalan ‘/problems/two-sum’) brauzer tabida
  // “CodeArena” qo‘shimchasisiz chiqardi.
  title: { default: "Musobaqalar", template: "%s · CodeArena" },
  description:
    "Yaqinlashayotgan va o‘tgan musobaqalar, jonli natijalar jadvali va reyting.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

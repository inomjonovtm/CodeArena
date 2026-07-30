import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  title: "Foydalanish shartlari",
  description:
    "CodeArena platformasidan foydalanish qoidalari va shartlari.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

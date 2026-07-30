import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  title: "Maxfiylik siyosati",
  description:
    "Shaxsiy ma’lumotlar qanday yig‘iladi, saqlanadi va ishlatiladi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

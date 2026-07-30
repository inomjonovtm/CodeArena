import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  title: "Reyting",
  description:
    "Eng ko‘p ball to‘plagan va eng yuqori reytingga ega ishtirokchilar ro‘yxati.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

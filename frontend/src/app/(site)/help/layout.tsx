import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  title: "Yordam va FAQ",
  description:
    "Ko‘p so‘raladigan savollar: ro‘yxatdan o‘tish, yechim yuborish, reyting va musobaqalar.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

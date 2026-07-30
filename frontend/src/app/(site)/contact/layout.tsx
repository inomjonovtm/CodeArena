import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  title: "Bog‘lanish",
  description:
    "Savol, taklif yoki xatolik haqida xabar bering — jamoamiz javob beradi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

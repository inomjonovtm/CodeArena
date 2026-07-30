import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  title: "Bildirishnomalar",
  description:
    "Musobaqa eslatmalari, javoblar va tizim xabarlari.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

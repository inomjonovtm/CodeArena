import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  title: "Emailni tasdiqlash",
  description:
    "Email manzilingizni tasdiqlang.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

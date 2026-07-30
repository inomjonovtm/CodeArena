import type { Metadata } from "next";

/** Sahifa sarlavhasi va tavsifi — brauzer tabi, ulashish va qidiruv uchun. */
export const metadata: Metadata = {
  title: "Kunlik masala",
  description:
    "Har kuni yangi masala va seriya hisobi — mashqni odatga aylantiring.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

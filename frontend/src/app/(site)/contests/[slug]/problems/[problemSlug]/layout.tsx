import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Musobaqa masalasi",
  description: "Musobaqa davomidagi masala sahifasi.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

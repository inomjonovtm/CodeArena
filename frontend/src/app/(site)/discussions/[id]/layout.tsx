import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muhokama",
  description: "Masala yechimi bo‘yicha muhokama va izohlar.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

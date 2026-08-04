import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kurslar" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shikoyatlar" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

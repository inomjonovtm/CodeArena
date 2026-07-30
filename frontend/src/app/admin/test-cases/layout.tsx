import type { Metadata } from "next";

export const metadata: Metadata = { title: "Test-case’lar" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

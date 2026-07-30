import type { Metadata } from "next";

export const metadata: Metadata = { title: "Judge0" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

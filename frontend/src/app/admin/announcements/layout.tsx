import type { Metadata } from "next";

export const metadata: Metadata = { title: "E’lonlar" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

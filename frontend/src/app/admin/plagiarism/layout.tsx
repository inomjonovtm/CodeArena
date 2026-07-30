import type { Metadata } from "next";

export const metadata: Metadata = { title: "Anti-plagiat" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

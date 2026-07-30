import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guruh",
  description: "Guruh sahifasi va ichki reyting.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

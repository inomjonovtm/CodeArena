import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Kurslar", template: "%s · CodeArena" },
  description:
    "Python, JavaScript va C++ ni noldan o'rganing: nazariya, ishga tushiriladigan misollar, test va kod yoziladigan topshiriqlar.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

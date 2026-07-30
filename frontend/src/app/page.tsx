import type { Metadata } from "next";

import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  // Ildiz sahifada shablon qo'shilmasin
  title: { absolute: "CodeArena — dasturlashni mashq bilan o'rganing" },
  description:
    "Kuniga bitta masala yeching, natijani darhol ko'ring, musobaqalarda qatnashing va reytingingizni oshiring. Python, JavaScript va C++ da bepul mashq.",
  robots: { index: true, follow: true },
};

/** Saytga birinchi kirganda ochiladigan sahifa. Admin panel `/admin` da. */
export default function HomePage() {
  return <Landing />;
}

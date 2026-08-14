import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  // Ildiz sahifada shablon qo'shilmasin
  title: { absolute: "CodeArena — dasturlashni mashq bilan o'rganing" },
  description:
    "Kuniga bitta masala yeching, natijani darhol ko'ring, musobaqalarda qatnashing va reytingingizni oshiring. Python, JavaScript va C++ da bepul mashq.",
  robots: { index: true, follow: true },
};

/* Sessiya cookie'lari — `backend/config/settings.py` dagi
   `AUTH_COOKIE_ACCESS` / `AUTH_COOKIE_REFRESH` bilan bir xil nom. */
const SESSION_COOKIES = ["ca_access", "ca_refresh"];

/**
 * Saytga birinchi kirganda ochiladigan sahifa. Admin panel `/admin` da.
 *
 * TIZIMGA KIRGAN FOYDALANUVCHI serverda aniqlanadi va darhol ish maydoniga
 * yuboriladi. Ilgari bu tekshiruv brauzerda, `useAuth().loading` ostida
 * turardi: sahifa `/auth/me` javobini kutgancha BUTUN reklama sahifasi
 * o'rniga spinner chizilardi. Natijada server HTML'ida bitta ham sarlavha
 * yo'q edi — qidiruv tizimlari va ijtimoiy tarmoq bot'lari bo'sh sahifa
 * ko'rardi, foydalanuvchi esa birinchi ekranda spinner.
 *
 * Cookie bor-yo'qligi tekshiriladi, uning haqiqiyligi emas: muddati o'tgan
 * token bilan ham `/problems` ochiq sahifa, ya'ni xato tomon zararsiz.
 */
export default async function HomePage() {
  const jar = await cookies();
  if (SESSION_COOKIES.some((name) => jar.has(name))) redirect("/problems");

  return <Landing />;
}

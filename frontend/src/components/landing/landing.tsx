"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers";
import { LogoLink } from "@/components/shell/logo";
import { NavMenu } from "@/components/shell/nav-menu";
import { useNavModel } from "@/components/shell/nav-model";
import { PrefsMenu } from "@/components/shell/prefs-menu";
import { SiteFooter } from "@/components/shell/site-footer";
import { MAIN_ID, SkipLink } from "@/components/shell/skip-link";
import { useScrolled } from "@/hooks/use-scrolled";
import { cn } from "@/lib/utils";

import { About, SiteNumbers } from "./about";
import { CTA } from "./cta";
import { Hero } from "./hero";

/* ==========================================================================
   Bosh sahifa
   --------------------------------------------------------------------------
   QISQA. Mehmon bu sahifaga bitta savol bilan keladi: «bu sayt nima va
   menga nima beradi?». Javob to'rt ekranga sig'adi:

     sarlavha → «sayt haqida» karuseli → jonli raqamlar → chaqiriq

   Ilgari bu yerda oltita imkoniyat kartasi, uch qadamli yo'riqnoma, yasama
   kod demosi, rejalashtirgich, hamjamiyat bloki va savol-javob turardi —
   yetti ekran uzunlik. Ularning ko'pchiligi ayni bir narsani boshqacha
   aytardi; savol-javob esa `/help` sahifasida to'liqroq holida bor.

   NIMA YOZILMAYDI. Sahifa mahsulot NIMA BERISHINI aytadi, u nima bilan
   qurilganini emas: kutubxona, xizmat va versiya nomlari mehmonga hech
   narsa qo'shmaydi, lekin tizim haqida ortiqcha ma'lumot beradi.

   YASHIL BLOK. Butun sahifada ikkitagina: chaqiriq lentasi va futer.
   Ular orasida oq masofa bor, shuning uchun "yashil devor" hosil bo'lmaydi.
   ========================================================================== */

/* Bosh sahifa paneli sayt panelining aynan o'zi qoidalarda: tepada
   chegarasiz, siljigach kapsulaga yig'iladi. Farqi faqat shunda — bu yerda
   qidiruv va bildirishnoma yo'q (mehmon uchun ular ma'nosiz). */
const NAV_SIGN_IN = [
  "ring-focus hidden h-11 items-center rounded-[var(--radius-md)] px-4 sm:flex",
  "text-[14px] font-medium text-[var(--text-2)]",
  "transition-colors duration-[var(--dur-1)]",
  "hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
].join(" ");

const NAV_CTA = [
  "ring-focus inline-flex h-9 items-center rounded-[var(--radius-md)] px-3.5",
  "bg-[var(--green)] text-[14px] font-medium text-[var(--text-on-green)] shadow-[var(--shadow-xs)]",
  "transition-colors duration-[var(--dur-1)] ease-[var(--ease)]",
  "hover:bg-[var(--green-hover)] active:translate-y-px",
].join(" ");

export function Landing() {
  const { user } = useAuth();
  const router = useRouter();
  const { groups: navGroups, support: navSupport } = useNavModel();
  const { scrolled, sentinelRef } = useScrolled();

  /* Tizimga kirgan foydalanuvchiga reklama sahifasi kerak emas. Asosiy
     tekshiruv SERVERDA (`app/page.tsx`, sessiya cookie'si bo'yicha); bu yerda
     faqat qolgan holat qoplanadi — boshqa varaqda kirib, keyin shu varaqqa
     qaytilganda.

     MUHIM: sahifa `loading` ustida BLOKLANMAYDI. Ilgari bu yerda
     `if (loading || user) return <spinner/>` turardi va `loading` boshlanishda
     doim `true` bo'lgani uchun server HTML'ida reklama sahifasidan bitta ham
     so'z qolmasdi. */
  useEffect(() => {
    if (user) router.replace("/problems");
  }, [user, router]);

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <SkipLink />

      {/* ==================================================== SARLAVHA */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <header
        className={cn(
          "sticky top-0 z-50 h-[var(--nav-h)] border-b border-[var(--line)] bg-[var(--bg)]",
          "transition-shadow duration-[var(--dur-2)] ease-[var(--ease)]",
          scrolled && "shadow-[var(--shadow-xs)]",
        )}
      >
        <div className="wrap flex h-full items-center">
          <div className="flex h-full w-full items-center gap-2">
            <LogoLink size="sm" />

            {/* Menyu OQIMDA — `absolute` markazlash o'ng tomondagi
                tugmalar ustiga chiqib qolardi (`site-bar.tsx` ga qarang). */}
            <nav
              aria-label="Asosiy"
              className="ml-3 hidden min-w-0 items-center gap-0.5 lg:flex"
            >
              {navGroups.map((group) => (
                <NavMenu key={group.key} label={group.label} links={group.links} authed={false} />
              ))}
              <NavMenu label="Yordam" links={navSupport} authed={false} />
            </nav>

            <div className="flex flex-1 items-center justify-end gap-1.5">
              <PrefsMenu />
              <Link href="/login" className={NAV_SIGN_IN}>
                Kirish
              </Link>
              <Link href="/register" className={NAV_CTA}>
                Boshlash
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Bosh sahifada `<main>` YO'Q edi: ekran o'quvchi foydalanuvchi
          "asosiy kontentga o'tish" buyrug'ini bera olmasdi va har safar
          butun menyuni tinglashga majbur bo'lardi. */}
      <main id={MAIN_ID}>
        <Hero />
        <About />
        <SiteNumbers />
        <CTA />
      </main>

      <SiteFooter clearTabBar={false} />
    </div>
  );
}

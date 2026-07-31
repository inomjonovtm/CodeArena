"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers";
import { LogoLink } from "@/components/shell/logo";
import { NavMenu } from "@/components/shell/nav-menu";
import { useNavModel } from "@/components/shell/nav-model";
import { PrefsMenu } from "@/components/shell/prefs-menu";
import { SiteFooter } from "@/components/shell/site-footer";
import { cn } from "@/lib/utils";

import { CodeDemo } from "./code-demo";
import { Community } from "./community";
import { CTA } from "./cta";
import { Faq } from "./faq";
import { Features } from "./features";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { Planner } from "./planner";
import { Reveal } from "./reveal";
import { Testimonials } from "./testimonials";
import { TrustStrip } from "./trust-strip";

/* ==========================================================================
   Bosh sahifa
   --------------------------------------------------------------------------
   SAHIFA RITMI. Bo'limlar fon bo'yicha almashinadi, shuning uchun uzun
   sahifa "nafas oladi" va bloklar bir-biriga qo'shilib ketmaydi:

     oq → oq → oq → OCH KULRANG → oq → QORA → oq → OCH KULRANG → oq → oq → QORA(futer)

   To'q bo'lim sahifada BITTA (kalkulyator) — ikkinchisi futer. Ilgari
   butun bosh sahifa to'q edi; endi u ichki sahifalar bilan bir tilda
   gapiradi, ya'ni bosh sahifadan katalogga o'tganda "boshqa saytga
   tushdim" tuyg'usi qolmaydi.
   ========================================================================== */

const FAQ_ITEMS = [
  {
    question: "Foydalanish pullikmi?",
    answer:
      "Yo'q. Masalalarni yechish, musobaqalarda qatnashish va reytingda ishtirok etish bepul. Ro'yxatdan o'tish uchun email va parol kifoya.",
  },
  {
    question: "Dasturlashni endi boshlagan bo'lsam bo'ladimi?",
    answer:
      "Ha. Masalalar oson, o'rta va qiyin darajalarga ajratilgan. Osondan boshlab, tayyor shablon ustiga yozasiz — bo'sh sahifadan qo'rqish shart emas.",
  },
  {
    question: "Qaysi tillarda yozish mumkin?",
    answer:
      "Python, JavaScript va C++. Har bir masala uchun uchala tilda ham tayyor boshlang'ich kod beriladi.",
  },
  {
    question: "Yechimim qanday tekshiriladi?",
    answer:
      "Yechimingiz izolyatsiyalangan muhitda testlar to'plamida ishga tushiriladi. Natijada nechta test o'tgani, qaysi testda xato ketgani, sarflangan vaqt va xotira ko'rsatiladi.",
  },
  {
    question: "Reyting qanday hisoblanadi?",
    answer:
      "Musobaqalardan keyin reyting raqiblaringiz kuchiga qarab o'zgaradi: kuchliroqni ortda qoldirsangiz ko'proq olasiz. Yangi ishtirokchilarning reytingi tezroq to'g'rilanadi.",
  },
  {
    question: "Har kuni qancha vaqt kerak?",
    answer:
      "Kuniga bitta masala — o'rtacha 20-30 daqiqa. Muhimi uzluksizlik: kunlik masala va seriya shu odatni saqlab turish uchun.",
  },
];

/* Bosh sahifa paneli sayt panelining aynan o'zi qoidalarda: oq fon, pastda
   ingichka chiziq, qora logotip, hoverda ko'k menyu. Farqi faqat shunda —
   bu yerda qidiruv va bildirishnoma yo'q (mehmon uchun ular ma'nosiz). */
const NAV_SIGN_IN = [
  "focus-ring hidden h-10 items-center rounded-[var(--r-ctl)] px-4 sm:flex",
  "border border-[var(--ink)] text-[14px] font-semibold text-[var(--ink)]",
  "transition-[color,border-color,transform] duration-[var(--t-base)] ease-[var(--ease-snap)]",
  "hover:border-[var(--brand)] hover:text-[var(--brand)] active:scale-[0.97]",
].join(" ");

const NAV_CTA = [
  "focus-ring inline-flex h-10 items-center rounded-[var(--r-ctl)] px-4",
  "bg-[var(--ink)] text-[14px] font-semibold text-[var(--canvas)]",
  "transition-[background-color,transform] duration-[var(--t-base)] ease-[var(--ease-snap)]",
  "hover:bg-[var(--brand)] active:scale-[0.97]",
].join(" ");

export function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { groups: navGroups, support: navSupport } = useNavModel();

  // Tizimga kirgan foydalanuvchiga reklama sahifasi kerak emas — uni darhol
  // ish maydoniga (masalalar) o'tkazamiz.
  useEffect(() => {
    if (!loading && user) router.replace("/problems");
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)]">
        <Loader2 className="size-5 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="aurora-canvas min-h-screen">
      {/* ==================================================== SARLAVHA */}
      <header className="sticky top-0 z-50 h-[var(--bar)] border-b border-[var(--edge)] bg-[var(--pane)]">
        <div className="shell flex h-full items-center gap-2">
          <LogoLink size="sm" />

          <nav aria-label="Asosiy" className="ml-6 hidden items-center gap-1 lg:flex">
            {navGroups.map((group) => (
              <NavMenu key={group.key} label={group.label} links={group.links} authed={false} />
            ))}
            <NavMenu label="Yordam" links={navSupport} authed={false} />
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2.5">
            <PrefsMenu />
            <Link href="/login" className={NAV_SIGN_IN}>
              Kirish
            </Link>
            <Link href="/register" className={NAV_CTA}>
              Boshlash
            </Link>
          </div>
        </div>
      </header>

      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorks />

      {/* ==================================================== KOD DEMOSI */}
      <section className="band shell">
        <Reveal className="max-w-2xl">
          <p className="t-eyebrow-brand">Sinab ko&apos;ring</p>
          <h2 className="t-title mt-4 text-[var(--ink)]">
            Tekshiruv qanday ketishini shu yerda ko&apos;ring.
          </h2>
          <p className="mt-5 text-[18px] leading-[1.6] text-[var(--ink-2)]">
            Tilni tanlang va tugmani bosing — yechim namunaviy va yashirin testlardan ketma-ket
            o&apos;tadi.
          </p>
        </Reveal>

        {/* Panelning o'zi to'q: u mahsulot oynasini ko'rsatadi, shuning
            uchun oq bo'lim ichida "ekran" bo'lib turadi. */}
        <Reveal delay={120} className={cn("mt-12")}>
          <CodeDemo />
        </Reveal>
      </section>

      <Planner />
      <Community />
      <Testimonials />

      {/* ==================================================== SAVOL-JAVOB */}
      <section className="band">
        <div className="shell-tight">
          <Reveal>
            <p className="t-eyebrow-brand">Savol-javob</p>
            <h2 className="t-title mt-4 text-[var(--ink)]">Qo&apos;shimcha savollar</h2>
          </Reveal>
          <Reveal delay={100} className="mt-12">
            <Faq items={FAQ_ITEMS} />
          </Reveal>
        </div>
      </section>

      <CTA />

      <SiteFooter clearTabBar={false} />
    </div>
  );
}

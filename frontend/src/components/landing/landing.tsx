"use client";

import {
  Briefcase,
  CalendarDays,
  Check,
  GraduationCap,
  Loader2,
  Repeat,
  Rocket,
  Swords,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LinkButton } from "@/components/kit";
import { useAuth } from "@/components/providers";
import { LogoLink } from "@/components/shell/logo";
import { NavMenu } from "@/components/shell/nav-menu";
import { useNavModel } from "@/components/shell/nav-model";
import { PrefsMenu } from "@/components/shell/prefs-menu";
import { SiteFooter } from "@/components/shell/site-footer";

import { CodeDemo } from "./code-demo";
import { Community } from "./community";
import { CTA } from "./cta";
import { Faq } from "./faq";
import { Features } from "./features";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { Marquee } from "./marquee";
import { Reveal } from "./reveal";

/* -------------------------------------------------------------- ma'lumot */

const AUDIENCE_ROW_1 = [
  { label: "Talaba", icon: <GraduationCap /> },
  { label: "Ish qidirayotgan dasturchi", icon: <Briefcase /> },
  { label: "Intervyuga tayyorlanayotgan", icon: <Target /> },
  { label: "Olimpiada ishtirokchisi", icon: <Swords /> },
  { label: "Bootcamp o'quvchisi", icon: <Rocket /> },
  { label: "Yangi til o'rganayotgan", icon: <Repeat /> },
];

const AUDIENCE_ROW_2 = [
  { label: "Dasturlashni endi boshlagan", icon: <Zap /> },
  { label: "Darajasini sinamoqchi", icon: <TrendingUp /> },
  { label: "Kundalik odat qurmoqchi", icon: <CalendarDays /> },
  { label: "Do'stlari bilan bellashuvchi", icon: <Users /> },
  { label: "Maktab o'quvchisi", icon: <GraduationCap /> },
  { label: "O'zini sinovdan o'tkazuvchi", icon: <Check /> },
];

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

/* --------------------------------------------------------------- sahifa */

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
      <div className="landing-dark flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[var(--stage-brand)]" />
      </div>
    );
  }

  return (
    /* `landing-dark` sirt tokenlarini sahnaga ko'chiradi — shu tufayli
       umumiy futer va kit komponentlari o'zgarishsiz to'q ko'rinadi. */
    <div className="landing-dark min-h-screen">
      {/* ==================================================== SARLAVHA */}
      <header className="sticky top-0 z-50 h-[var(--bar)] border-b border-[var(--stage-edge)] bg-[var(--stage-2)]">
        <div className="mx-auto flex h-full w-full max-w-[var(--page)] items-center gap-2 px-4 sm:px-6 lg:px-[var(--gutter)]">
          <LogoLink size="sm" />

          <nav aria-label="Asosiy" className="ml-4 hidden items-center gap-0.5 lg:flex">
            {navGroups.map((group) => (
              <NavMenu key={group.key} label={group.label} links={group.links} authed={false} />
            ))}
            <NavMenu label="Yordam" links={navSupport} authed={false} />
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            <PrefsMenu />
            <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Kirish
            </LinkButton>
            <LinkButton href="/register" variant="primary" size="sm">
              Boshlash
            </LinkButton>
          </div>
        </div>
      </header>

      <Hero />

      {/* ==================================================== KOD DEMOSI */}
      <section className="mx-auto w-full max-w-[var(--page)] px-4 py-20 sm:px-6 sm:py-28 lg:px-[var(--gutter)]">
        <Reveal className="max-w-2xl">
          <p className="t-eyebrow text-[var(--stage-ink-3)]">Sinab ko&apos;ring</p>
          <h2 className="t-title mt-3 text-[var(--stage-ink)]">
            Tekshiruv qanday ketishini shu yerda ko&apos;ring.
          </h2>
          <p className="mt-4 text-[15.5px] leading-[1.65] text-[var(--stage-ink-2)]">
            Tilni tanlang va tugmani bosing — yechim namunaviy va yashirin testlardan
            ketma-ket o&apos;tadi.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-10">
          <CodeDemo />
        </Reveal>
      </section>

      <Features />
      <HowItWorks />
      <Community />

      {/* ==================================================== KIMGA MOS */}
      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[var(--page)] px-4 sm:px-6 lg:px-[var(--gutter)]">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="t-eyebrow text-[var(--stage-ink-3)]">Kimga mos</p>
            <h2 className="t-title mt-3 text-[var(--stage-ink)]">CodeArena kimga mos?</h2>
            <p className="mt-4 text-[15.5px] leading-[1.65] text-[var(--stage-ink-2)]">
              Quyidagilardan birortasi siz haqingizda bo&apos;lsa — bemalol boshlayvering.
            </p>
          </Reveal>
        </div>

        <Reveal delay={100} className="mt-12 flex flex-col gap-2.5">
          <Marquee items={AUDIENCE_ROW_1} direction="left" duration={54} />
          <Marquee items={AUDIENCE_ROW_2} direction="right" duration={60} />
        </Reveal>
      </section>

      {/* ==================================================== SAVOL-JAVOB */}
      <section className="mx-auto w-full max-w-[var(--page-tight)] px-4 pb-20 sm:px-6 sm:pb-28 lg:px-[var(--gutter)]">
        <Reveal>
          <p className="t-eyebrow text-[var(--stage-ink-3)]">Savol-javob</p>
          <h2 className="t-title mt-3 text-[var(--stage-ink)]">Qo&apos;shimcha savollar</h2>
        </Reveal>
        <Reveal delay={100} className="mt-10">
          <Faq items={FAQ_ITEMS} />
        </Reveal>
      </section>

      <CTA />

      <SiteFooter clearTabBar={false} />
    </div>
  );
}

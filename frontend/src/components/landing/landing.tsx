"use client";

import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CalendarDays,
  Check,
  GraduationCap,
  Loader2,
  MessageSquare,
  Repeat,
  Rocket,
  Search,
  Swords,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Eyebrow, LinkButton } from "@/components/kit";
import { useAuth } from "@/components/providers";
import { LogoLink } from "@/components/shell/logo";
import { NavMenu } from "@/components/shell/nav-menu";
import { useNavModel } from "@/components/shell/nav-model";
import { PrefsMenu } from "@/components/shell/prefs-menu";
import { SiteFooter } from "@/components/shell/site-footer";

import { Faq } from "./faq";
import { LiveStats } from "./live-stats";
import { Marquee } from "./marquee";
import { Reveal } from "./reveal";
import { ActivityGrid, CodePanel, DifficultySplit, LanguagePills, MiniLeaderboard } from "./visuals";

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

const STEPS = [
  {
    title: "Masalani tanlang",
    text: "Qiyinlik yoki mavzu bo'yicha filtrlang. Qayerdan boshlashni bilmasangiz — kunlik masaladan.",
  },
  {
    title: "Yechimni yozing",
    text: "Python, JavaScript yoki C++ da. Tayyor shablon bor, noldan boshlash shart emas.",
  },
  {
    title: "Darhol natijani ko'ring",
    text: "Testlar bir zumda ishga tushadi. Qaysi testda xato ketgani, sarflangan vaqt va xotira ko'rinadi.",
  },
];

/** Asosiy sabablar — matn va vizual navbatma-navbat almashadi. */
const REASONS = [
  {
    icon: <Zap className="size-5" />,
    title: "Javobni kutib o'tirmaysiz",
    text: "Yechimni yuborasiz — bir necha soniyada natija tayyor. Xato bo'lsa, qaysi testda qolgani ko'rinadi va darhol tuzatasiz.",
    points: [
      "Nechta test o'tgani aniq ko'rinadi",
      "Sarflangan vaqt va xotira",
      "Xatolik matni to'liq ko'rsatiladi",
    ],
    visual: <DifficultySplit />,
  },
  {
    icon: <Swords className="size-5" />,
    title: "Bellashuv qiziqishni yo'qotmaydi",
    text: "Musobaqalarda qatnashing, reytingingizni oshiring va o'zingizni boshqalar bilan solishtiring. Yolg'iz mashq qilishdan ko'ra ancha qiziq.",
    points: [
      "Jonli natijalar jadvali",
      "Musobaqadan keyin reyting yangilanadi",
      "Do'stlaringiz bilan yopiq guruh reytingi",
    ],
    visual: <MiniLeaderboard />,
    flip: true,
  },
  {
    icon: <CalendarDays className="size-5" />,
    title: "Kuniga bitta masala — yiliga uch yuzdan ortiq",
    text: "Har kuni yangi kunlik masala chiqadi. Seriyangiz uzilmasa, bir necha oydan keyin farqni o'zingiz sezasiz.",
    points: [
      "Bugungi masala har kuni yangilanadi",
      "Seriya va faollik kalendari",
      "Nimadan boshlashni o'ylab o'tirmaysiz",
    ],
    visual: <ActivityGrid />,
  },
];

const EXTRAS = [
  {
    icon: <MessageSquare className="size-[18px]" />,
    title: "Muhokamalar",
    text: "Masala yechilmayaptimi — boshqalar qanday yondashganini o'qing, o'z yechimingizni ulashing.",
  },
  {
    icon: <Users className="size-[18px]" />,
    title: "Guruhlar",
    text: "Kurs, guruh yoki do'stlar davrasi uchun yopiq reyting. Kim oldinda — hammaga ko'rinadi.",
  },
  {
    icon: <Bookmark className="size-[18px]" />,
    title: "Xatcho'plar",
    text: "Qaytib ishlash kerak bo'lgan masalalarni belgilab qo'ying, keyin bir joydan toping.",
  },
  {
    icon: <Search className="size-[18px]" />,
    title: "Mavzu bo'yicha mashq",
    text: "Massiv, xesh-jadval, daraxt, dinamik dasturlash — zaif tomoningizni maqsadli mashq qiling.",
  },
  {
    icon: <TrendingUp className="size-[18px]" />,
    title: "O'sish tarixi",
    text: "Yechilgan masalalar, seriya va reyting o'zgarishi — taraqqiyot raqamlarda ko'rinadi.",
  },
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

/** Belgilangan ro'yxat elementi — ko'k belgi, plitkasiz. */
function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-[var(--ink-2)]">
      <Check className="mt-[3px] size-4 shrink-0 text-[var(--brand)]" strokeWidth={2.75} />
      {children}
    </li>
  );
}

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
      <div className="aurora-canvas flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="aurora-canvas min-h-screen text-[var(--ink)]">
      {/* ==================================================== SARLAVHA
          Ilova bilan bir xil yuqori panel: iliq qog'oz, ochiluvchi menyular. */}
      <header className="sticky top-0 z-50 h-[var(--bar)] border-b border-[var(--edge)] bg-[var(--canvas)]">
        <div className="mx-auto flex h-full w-full max-w-[var(--page)] items-center gap-2 px-4 sm:px-6 lg:px-[var(--gutter)]">
          <LogoLink size="sm" />

          <nav aria-label="Asosiy" className="ml-4 hidden items-center gap-0.5 lg:flex">
            {navGroups.map((group) => (
              <NavMenu key={group.key} label={group.label} links={group.links} authed={false} />
            ))}
            <NavMenu label="Yordam" links={navSupport} authed={false} />
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            {/* Tema va til — saytga kirmasdan turib ham o'zgartirish mumkin */}
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

      {/* ==================================================== HERO
          Chapda matn, o'ngda sahifadagi YAGONA to'q blok — kod muharriri.
          Fonda millimetrli qog'oz: sahifa "material" bo'ladi, lekin tekstura
          matn ostida sezilmaydi. */}
      <section className="relative overflow-hidden">
        <span aria-hidden className="grid-paper texture-fade absolute inset-0" />

        <div className="relative mx-auto w-full max-w-[var(--page)] px-4 pt-16 pb-16 sm:px-6 lg:px-[var(--gutter)] sm:pt-24 sm:pb-20">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
            {/* --- chap: matn */}
            <div className="min-w-0">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-[var(--r-chip)] border border-[var(--brand-edge)] bg-[var(--brand-wash)] px-3 py-1 font-mono text-[11px] font-medium tracking-[0.06em] text-[var(--brand-ink)] uppercase">
                  <span className="size-1.5 rounded-full bg-[var(--brand)]" />
                  Bepul boshlanadi
                </span>
              </Reveal>

              <Reveal delay={60}>
                <h1 className="t-display mt-7 text-[var(--ink)]">
                  Dasturlashni
                  <br />
                  <span className="text-[var(--brand)]">mashq bilan</span> o&apos;rganing.
                </h1>
              </Reveal>

              <Reveal delay={120}>
                <p className="mt-7 max-w-lg text-[17px] leading-[1.65] text-[var(--ink-3)]">
                  Kuniga bitta masala yeching, natijani darhol ko&apos;ring va darajangiz qanday
                  o&apos;sayotganini kuzating. Video ko&apos;rish emas — yozib o&apos;rganish.
                </p>
              </Reveal>

              <Reveal delay={180}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <LinkButton
                    href="/register"
                    variant="primary"
                    size="lg"
                    iconAfter={<ArrowRight className="size-4" />}
                  >
                    Bepul ro&apos;yxatdan o&apos;tish
                  </LinkButton>
                  <LinkButton href="/problems" variant="quiet" size="lg">
                    Masalalarni ko&apos;rish
                  </LinkButton>
                </div>
              </Reveal>

              <Reveal delay={240}>
                <LanguagePills className="mt-10" />
              </Reveal>
            </div>

            {/* --- o'ng: kod muharriri va hukm */}
            <Reveal delay={300} className="min-w-0">
              <CodePanel />
            </Reveal>
          </div>
        </div>
      </section>

      {/* --- jonli raqamlar lentasi: kanvasda, chiziqlar bilan */}
      <section className="mx-auto max-w-[var(--page)] px-4 sm:px-6 lg:px-[var(--gutter)]">
        <Reveal>
          <LiveStats />
        </Reveal>
      </section>

      {/* ==================================================== QANDAY ISHLAYDI
          Uchta ustun, kartasiz: har biri ustidagi chiziq va yirik tartib
          raqami bilan ajraladi — gazeta ustunlari kabi. */}
      <section className="mx-auto max-w-[var(--page)] px-4 py-20 sm:px-6 lg:px-[var(--gutter)] sm:py-28">
        <Reveal className="max-w-2xl">
          <Eyebrow index={1}>Qanday ishlaydi</Eyebrow>
          <h2 className="t-title mt-4 text-[var(--ink)]">
            Uch qadam, murakkab sozlash yo&apos;q
          </h2>
          <p className="t-body mt-4 max-w-lg text-[16px] text-[var(--ink-3)]">
            Kompyuteringizga hech narsa o&apos;rnatmaysiz. Brauzerni ochasiz va yozishni
            boshlaysiz.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal
              key={step.title}
              as="article"
              delay={index * 90}
              className="border-t border-[var(--edge)] pt-5"
            >
              <span className="t-num block text-[13px] font-semibold text-[var(--brand)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="t-section mt-4 text-[var(--ink)]">{step.title}</h3>
              <p className="t-body mt-2.5 text-[var(--ink-3)]">{step.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ==================================================== ASOSIY SABABLAR
          Har bir sabab — kanvasdagi keng qator. Matn bir tomonda, mahsulot
          bo'lagi ikkinchi tomonda; qatorlar orasida faqat soch chizig'i. */}
      <section className="mx-auto max-w-[var(--page)] px-4 sm:px-6 lg:px-[var(--gutter)]">
        <div className="border-t border-[var(--edge)]">
          {REASONS.map((reason, index) => (
            <Reveal
              key={reason.title}
              as="article"
              className="grid items-center gap-10 border-b border-[var(--edge)] py-16 lg:grid-cols-2 lg:gap-20 sm:py-20"
            >
              <div className={reason.flip ? "min-w-0 lg:order-2" : "min-w-0"}>
                <span className="flex items-center gap-3">
                  <span className="text-[var(--brand)]">{reason.icon}</span>
                  <span aria-hidden className="h-px w-8 bg-[var(--edge-strong)]" />
                  <span className="t-num text-[11px] text-[var(--ink-4)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <h3 className="t-title mt-6 max-w-md text-[var(--ink)]">{reason.title}</h3>
                <p className="t-body mt-4 max-w-md text-[15px] text-[var(--ink-3)]">
                  {reason.text}
                </p>
                <ul className="mt-7 flex flex-col gap-2.5">
                  {reason.points.map((point) => (
                    <CheckItem key={point}>{point}</CheckItem>
                  ))}
                </ul>
              </div>
              <div className={reason.flip ? "min-w-0 lg:order-1" : "min-w-0"}>
                {reason.visual}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ==================================================== KIMGA MOS */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[var(--page)] px-4 sm:px-6 lg:px-[var(--gutter)]">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow index={2} className="justify-center">
              Kimga mos
            </Eyebrow>
            <h2 className="t-title mt-4 text-[var(--ink)]">CodeArena kimga mos?</h2>
            <p className="t-body mt-4 text-[16px] text-[var(--ink-3)]">
              Quyidagilardan birortasi siz haqingizda bo&apos;lsa — bemalol boshlayvering.
            </p>
          </Reveal>
        </div>

        <Reveal delay={100} className="mt-12 flex flex-col gap-2.5">
          <Marquee items={AUDIENCE_ROW_1} direction="left" duration={54} />
          <Marquee items={AUDIENCE_ROW_2} direction="right" duration={60} />
        </Reveal>
      </section>

      {/* ==================================================== QO'SHIMCHA
          Ochiq panjara: ikonka plitkasiz, har bir element ustida chiziq. */}
      <section className="mx-auto max-w-[var(--page)] px-4 pb-20 sm:px-6 lg:px-[var(--gutter)] sm:pb-28">
        <Reveal className="max-w-xl">
          <Eyebrow index={3}>Imkoniyatlar</Eyebrow>
          <h2 className="t-title mt-4 text-[var(--ink)]">Mashqni oson qiladigan narsalar</h2>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {EXTRAS.map((item, index) => (
            <Reveal
              key={item.title}
              as="article"
              delay={index * 60}
              className="border-t border-[var(--edge)] pt-5"
            >
              <span className="text-[var(--ink-4)]">{item.icon}</span>
              <h3 className="t-section mt-4 text-[var(--ink)]">{item.title}</h3>
              <p className="t-body mt-2 text-[var(--ink-3)]">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ==================================================== FAQ */}
      <section className="mx-auto max-w-[var(--page-tight)] px-4 pb-20 sm:px-6 lg:px-[var(--gutter)] sm:pb-28">
        <Reveal>
          <Eyebrow index={4}>Savol-javob</Eyebrow>
          <h2 className="t-title mt-4 text-[var(--ink)]">Qo&apos;shimcha savollar</h2>
        </Reveal>
        <Reveal delay={100} className="mt-10">
          <Faq items={FAQ_ITEMS} />
        </Reveal>
      </section>

      {/* ==================================================== CTA
          Sahifadagi yagona to'yingan ko'k blok. */}
      <section className="mx-auto max-w-[var(--page)] px-4 pb-20 sm:px-6 lg:px-[var(--gutter)]">
        <Reveal className="pane-brand relative overflow-hidden rounded-[var(--r-pane-lg)] px-7 py-16 text-center sm:px-10 sm:py-20">
          <span
            aria-hidden
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative">
            <p className="font-mono text-[11px] tracking-[0.12em] text-white/70 uppercase">
              Boshlash uchun
            </p>
            <h2 className="t-title mx-auto mt-4 max-w-xl text-white">
              Birinchi masalangiz sizni kutmoqda
            </h2>
            <p className="t-body mx-auto mt-4 max-w-md text-[16px] text-white/80">
              Ro&apos;yxatdan o&apos;tish bir daqiqa. Karta ham, o&apos;rnatish ham talab
              qilinmaydi.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <LinkButton
                href="/register"
                size="lg"
                iconAfter={<ArrowRight className="size-4" />}
                className="border-transparent bg-white font-semibold text-[var(--brand-ink)] hover:bg-white/90"
              >
                Bepul ro&apos;yxatdan o&apos;tish
              </LinkButton>
              <LinkButton
                href="/login"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:border-white/60 hover:bg-white/10"
              >
                Kirish
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ==================================================== FOOTER
          Ilovadagi futerning O'ZI: havolalar ro'yxati bitta joyda turadi va
          bosh sahifadan ichkariga o'tganda futer o'zgarib ketmaydi. */}
      <SiteFooter clearTabBar={false} />
    </div>
  );
}

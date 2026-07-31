"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, BookOpen, ShieldCheck, Trophy, Users, Zap } from "lucide-react";

import { publicApi } from "@/lib/public-api";
import { cn, formatNumber } from "@/lib/utils";

import { useCountUp, useInView } from "./count-up";
import { Reveal } from "./reveal";

/* ==========================================================================
   Imkoniyatlar
   --------------------------------------------------------------------------
   Ikki qatlam:

   1. UCHTA YIRIK KARTA — har birida katta KO'K raqam. Raqamlar backenddan
      keladi (`site.stats`), ya'ni ular haqiqiy. Ma'lumot kelmasa raqam
      o'rni bo'sh qoladi, karta esa baribir ko'rinadi: o'ylab topilgan
      statistika eng arzon va eng zararli yolg'on.
   2. QOLGAN XUSUSIYATLAR — raqamsiz, sokinroq ro'yxat. Hammasiga bir xil
      og'irlik bersak, ko'z qayerdan boshlashni bilmay qoladi.

   Karta hoverda 4px yuqoriga ko'tariladi va soyasi kuchayadi (`pane-interactive`).
   ========================================================================== */

const HIGHLIGHTS = [
  {
    key: "problems" as const,
    title: "Masalalar katalogi",
    body:
      "Oson, o'rta va qiyin darajalarga ajratilgan masalalar. Har biri uchun Python, JavaScript va C++ da tayyor boshlang'ich kod beriladi.",
  },
  {
    key: "submissions" as const,
    title: "Avtomatik tekshiruv",
    body:
      "Judge0 va sandbox izolyatsiyasi: yechimingiz soniyalar ichida yashirin testlardan o'tadi, natijada vaqt va xotira sarfi ko'rsatiladi.",
  },
  {
    key: "users" as const,
    title: "Elo reyting va jamoa",
    body:
      "Musobaqadan keyin reyting raqiblar kuchiga qarab qayta hisoblanadi. Guruhlar, yopiq leaderboard va taklif kodi bilan qo'shilish.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Tezkor judge",
    body: "Namuna testlarda darhol sinang, so'ng to'liq to'plamga yuboring.",
  },
  {
    icon: Trophy,
    title: "Jonli musobaqalar",
    body: "SSE orqali soniya sayin yangilanadigan natijalar taxtasi.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-plagiat",
    body: "Winnowing algoritmi o'zgartirilgan nusxalarni ham topadi.",
  },
  {
    icon: BookOpen,
    title: "Editorial",
    body: "Murakkablik tahlili, muqobil yondashuvlar va tipik xatolar.",
  },
  {
    icon: Users,
    title: "Guruhlar",
    body: "O'quv markazi yoki do'stlar uchun alohida ichki reyting.",
  },
  {
    icon: Bell,
    title: "PWA va bildirishnoma",
    body: "Ilovani ekranga o'rnating, natijadan xabardor bo'ling.",
  },
];

/**
 * Katta ko'k raqam — ko'rinishga kirganda 0 dan sanaydi.
 *
 * Qiymat yo'q yoki nol bo'lsa raqam umuman chizilmaydi. "0+" degan yozuv
 * bo'sh bazani ko'rsatib turadi va kartani ishonchsiz qiladi; balandlik
 * esa `min-h` orqali saqlanadi, shuning uchun kartalar tekis turadi.
 */
function HighlightNumber({ value }: { value?: number }) {
  const { ref, inView } = useInView<HTMLParagraphElement>(0.4);
  const hasValue = typeof value === "number" && value > 0;
  const shown = useCountUp(value ?? 0, inView && hasValue);

  return (
    <p ref={ref} className="t-metric-lg t-num min-h-[1em]">
      {hasValue ? `${formatNumber(shown)}+` : ""}
    </p>
  );
}

export function Features() {
  /* Statistika kelmasa ham bo'lim ko'rinadi — faqat raqamlar o'rni bo'sh
     qoladi. `retry: false`: bosh sahifa backend javob bermasa ham ochilishi
     kerak. */
  const { data } = useQuery({
    queryKey: ["site-stats"],
    queryFn: () => publicApi.site.stats(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    <section className="band shell">
      <Reveal className="max-w-2xl">
        <p className="t-eyebrow-brand">Imkoniyatlar</p>
        <h2 className="t-title mt-4 text-[var(--ink)]">
          Mashqdan musobaqagacha — hammasi bitta joyda.
        </h2>
        <p className="mt-5 text-[18px] leading-[1.6] text-[var(--ink-2)]">
          Masalani tanlashdan tortib reyting o&apos;sishigacha bo&apos;lgan yo&apos;lning har bir
          qadami platformaning ichida.
        </p>
      </Reveal>

      {/* --------------------------------------------- uchta yirik karta */}
      <ul className="mt-14 grid gap-8 md:grid-cols-3">
        {HIGHLIGHTS.map((item, index) => (
          <Reveal as="li" key={item.key} delay={index * 100} className="min-w-0">
            <div className="pane pane-interactive h-full rounded-[var(--r-pane)] p-8">
              <HighlightNumber value={data?.[item.key]} />
              <h3 className="mt-6 text-[19px] font-semibold text-[var(--ink)]">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-[var(--ink-2)]">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </ul>

      {/* ------------------------------------------ qolgan xususiyatlar */}
      <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Reveal as="li" key={feature.title} delay={index * 60} className="min-w-0">
              <div className={cn("h-full border-t border-[var(--edge)] pt-6")}>
                {/* Ikonka rangli plitkada emas — minimalist chiziqli belgi */}
                <Icon className="size-6 text-[var(--ink)]" strokeWidth={1.5} />
                <h3 className="mt-5 text-[16px] font-semibold text-[var(--ink)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--ink-3)]">
                  {feature.body}
                </p>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/* ==========================================================================
   Hero
   --------------------------------------------------------------------------
   Oq sirt, juda ko'p bo'sh joy va bitta yirik sarlavha. Sarlavha ichida
   FAQAT BITTA ibora ko'k — u sahifadagi birinchi rangli nuqta va ko'z aynan
   shu yerdan o'qishni boshlaydi.

   O'ng tomonda mahsulot ko'rinishi: to'q panel ichida kod va tekshiruv
   natijasi. Bu "ekran surati" vazifasini bajaradi — foydalanuvchi mahsulot
   qanday ko'rinishini matnni o'qimasdan tushunadi. Panel qora bo'lgani uchun
   oq hero ustida og'irlik markazi hosil qiladi.
   ========================================================================== */

const PRIMARY = [
  "focus-ring inline-flex h-12 items-center gap-2.5 rounded-[var(--r-ctl)] px-7",
  "bg-[var(--ink)] text-[15px] font-semibold text-[var(--canvas)]",
  "transition-[background-color,transform] duration-[var(--t-base)] ease-[var(--ease-snap)]",
  // Hoverda ko'kka o'tadi va 2px ko'tariladi — tizimdagi asosiy CTA qoidasi
  "hover:-translate-y-0.5 hover:bg-[var(--brand)] active:scale-[0.97]",
].join(" ");

const SECONDARY = [
  "focus-ring inline-flex h-12 items-center gap-2 rounded-[var(--r-ctl)] px-7",
  "border border-[var(--ink)] text-[15px] font-semibold text-[var(--ink)]",
  "transition-[color,border-color,transform] duration-[var(--t-base)] ease-[var(--ease-snap)]",
  "hover:border-[var(--brand)] hover:text-[var(--brand)] active:scale-[0.97]",
].join(" ");

/* Panelda ko'rsatiladigan yechim — haqiqiy, ishlaydigan Python kodi.
   O'ylab topilgan "chiroyli" kod o'rniga platformada uchraydigan oddiy
   masala: ikki sonning yig'indisini topish. */
const CODE_LINES: { text: string; tone?: "kw" | "fn" | "num" | "str" | "dim" }[][] = [
  [{ text: "def ", tone: "kw" }, { text: "two_sum", tone: "fn" }, { text: "(nums, target):" }],
  [{ text: "    seen = {}" }],
  [{ text: "    for ", tone: "kw" }, { text: "i, n " }, { text: "in ", tone: "kw" }, { text: "enumerate(nums):" }],
  [{ text: "        if ", tone: "kw" }, { text: "target - n " }, { text: "in ", tone: "kw" }, { text: "seen:" }],
  [{ text: "            return ", tone: "kw" }, { text: "[seen[target - n], i]" }],
  [{ text: "        seen[n] = i" }],
];

const TESTS = ["Namuna 1", "Namuna 2", "Yashirin testlar (18)"];

const TONE_CLASS: Record<string, string> = {
  kw: "text-[var(--stage-brand)]",
  fn: "text-white",
  num: "text-white",
  str: "text-white",
  dim: "text-[var(--stage-ink-3)]",
};

function HeroVisual() {
  return (
    <div className="overflow-hidden rounded-[var(--r-pane-lg)] bg-[var(--stage)] shadow-[var(--lift-3)]">
      {/* Panel sarlavhasi — muharrir oynasining yuqori qatori */}
      <div className="flex items-center gap-2 border-b border-[var(--stage-edge)] px-5 py-3.5">
        <span className="size-2.5 rounded-full bg-[var(--stage-ink-3)]" />
        <span className="size-2.5 rounded-full bg-[var(--stage-ink-3)]" />
        <span className="size-2.5 rounded-full bg-[var(--stage-ink-3)]" />
        <span className="ml-2 font-mono text-[12px] text-[var(--stage-ink-2)]">two_sum.py</span>
      </div>

      <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-[1.85]">
        <code>
          {CODE_LINES.map((line, index) => (
            <div key={index} className="flex gap-4">
              <span className="w-4 shrink-0 text-right text-[var(--stage-ink-3)] select-none">
                {index + 1}
              </span>
              <span className="text-[var(--stage-ink-2)]">
                {line.map((part, partIndex) => (
                  <span key={partIndex} className={part.tone ? TONE_CLASS[part.tone] : undefined}>
                    {part.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </code>
      </pre>

      {/* Tekshiruv natijasi — mahsulotning asosiy va'dasi shu yerda ko'rinadi */}
      <div className="border-t border-[var(--stage-edge)] px-5 py-4">
        <ul className="flex flex-col gap-2.5">
          {TESTS.map((test) => (
            <li key={test} className="flex items-center gap-2.5 text-[13px]">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[var(--stage-brand)]">
                <Check className="size-3 text-[#0a0a0a]" strokeWidth={3} />
              </span>
              <span className="text-[var(--stage-ink-2)]">{test}</span>
              <span className="t-num ml-auto text-[12px] text-[var(--stage-ink-3)]">o&apos;tdi</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Millimetrli qog'oz — chekkalarga qarab so'nadi, matn ustida sezilmaydi */}
      <span aria-hidden className="grid-paper texture-fade absolute inset-0" />

      <div className="shell relative pt-20 pb-24 sm:pt-28 lg:pt-32 lg:pb-32">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-20">
          {/* ------------------------------------------------------- matn */}
          <div className="min-w-0">
            <Reveal>
              <p className="t-eyebrow-brand">Algoritmik mashq platformasi</p>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="t-display mt-6 text-[var(--ink)]">
                Kod yozing, <span className="text-[var(--brand)]">darhol tekshiring</span> va
                reytingingizni oshiring.
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-7 max-w-xl text-[19px] leading-[1.6] text-[var(--ink-2)]">
                Yechimingiz izolyatsiyalangan muhitda yashirin testlardan o&apos;tadi. Musobaqalarda
                jonli natijalar taxtasi, har bir masaladan keyin esa tahlil.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/register" className={PRIMARY}>
                  Bepul boshlash
                  <ArrowRight className="size-[18px]" />
                </Link>
                <Link href="/problems" className={SECONDARY}>
                  Masalalarni ko&apos;rish
                </Link>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <p className="mt-6 text-[14px] text-[var(--ink-3)]">
                Karta talab qilinmaydi · Ro&apos;yxatdan o&apos;tish bir daqiqa
              </p>
            </Reveal>
          </div>

          {/* ---------------------------------------------------- vizual */}
          <Reveal delay={200} className={cn("min-w-0")}>
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

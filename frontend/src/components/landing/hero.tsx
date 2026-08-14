"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/* ==========================================================================
   Hero — "sarlavha butun kenglikda"
   --------------------------------------------------------------------------
   Bu blok saytdagi eng ko'p ko'riladigan ekran, shuning uchun uning tartibi
   ataylab odatdagidan boshqacha. Klassik "chapda matn, o'ngda rasm" ikki
   ustunli tartib YO'Q — u ikkala tomonni ham siqadi: sarlavha yarim
   kenglikda qolib, kichkina teriladi, rasm esa ezilib ketadi.

   O'rniga uch qavat:

     1. ULKAN SARLAVHA — sahifaning butun kengligida, 104px gacha. Ostida
        hech narsa yo'q, faqat oq maydon. Bu birinchi va yagona xabar.
     2. BAZA QATORI — sarlavha ostida uchta ustun bir CHIZIQDA turadi:
        chapda yetakchi xatboshi, o'rtada chaqiriq tugmalari, o'ngda
        tekshirib bo'ladigan faktlar. Ular pastki qirrasi bo'yicha
        tekislangan (`items-end`), shuning uchun turli balandlikdagi
        bloklar bitta gorizontal chiziq hosil qiladi.
     3. MAHSULOT OYNASI — to'liq kenglikda, ostida yashil nur bilan. U
        "o'ng tomondagi rasm" emas, sahifaning davomi: foydalanuvchi
        sarlavhani o'qib, pastga tushadi va mahsulotni ko'radi.

   Yashil bu ekranda ikki joyda: sarlavha ichidagi bitta ibora ostidagi
   marker chizig'i va asosiy tugma. Boshqa hech qayerda.
   ========================================================================== */

const PRIMARY = [
  "ring-focus inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] px-5",
  "bg-[var(--green)] text-[15px] font-medium text-[var(--text-on-green)] shadow-[var(--shadow-xs)]",
  "transition-colors duration-[var(--dur-1)] ease-[var(--ease)]",
  "hover:bg-[var(--green-hover)] active:translate-y-px",
].join(" ");

const SECONDARY = [
  "ring-focus inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] px-5",
  "border border-[var(--line-strong)] bg-[var(--surface)] text-[15px] font-medium text-[var(--text)]",
  "transition-colors duration-[var(--dur-1)] ease-[var(--ease)]",
  "hover:bg-[var(--surface-hover)] active:translate-y-px",
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

const TESTS = [
  { name: "Namuna 1", time: "0.02s" },
  { name: "Namuna 2", time: "0.01s" },
  { name: "Yashirin testlar (18)", time: "0.34s" },
];

/* Tekshirib bo'ladigan faktlar. O'ylab topilgan "10 000+ foydalanuvchi"
   o'rniga mahsulotning haqiqiy xossalari — ular yolg'on bo'la olmaydi.
   Ular NIMA BERISHINI aytadi: qanday xizmat yoki kutubxona ishlatilgani
   mehmonga hech narsa qo'shmaydi. */
const FACTS = [
  "Shartlar o'zbek tilida",
  "Natija bir necha soniyada",
  "Musobaqa va reyting",
];

const TONE_CLASS: Record<string, string> = {
  kw: "text-[var(--code-key)]",
  fn: "text-white",
  num: "text-white",
  str: "text-white",
  dim: "text-[var(--code-text-2)]",
};

/**
 * Mahsulot oynasi — muharrir va tekshiruv natijasi.
 *
 * Sirt YASHIL EMAS: sintaksis ranglari yashil fonda yo'qoladi. Shuning
 * uchun bu yerda `on-code` qatlami ishlatiladi — palitraning eng to'q
 * pog'onasi (chuqur zumrad-qora). Yashil esa ichkarida aksent sifatida
 * qoladi: kalit so'zlar va o'tgan testlar belgisi.
 */
function HeroVisual() {
  return (
    <div className="on-code overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--shadow-md)]">
      {/* Panel sarlavhasi — muharrir oynasining yuqori qatori */}
      <div className="flex items-center gap-2.5 border-b border-[var(--code-line)] px-7 py-5">
        <span className="size-3 rounded-full bg-[var(--code-text-2)] opacity-45" />
        <span className="size-3 rounded-full bg-[var(--code-text-2)] opacity-45" />
        <span className="size-3 rounded-full bg-[var(--code-text-2)] opacity-45" />
        <span className="ml-3 font-mono text-[13px] text-[var(--code-text-2)]">two_sum.py</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <pre className="overflow-x-auto px-7 py-7 font-mono text-[14px] leading-[2]">
          <code>
            {CODE_LINES.map((line, index) => (
              <div key={index} className="flex gap-5">
                <span className="w-5 shrink-0 text-right text-[var(--code-text-2)] opacity-60 select-none">
                  {index + 1}
                </span>
                <span className="text-[var(--code-text)]">
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

        {/* Tekshiruv natijasi — mahsulotning asosiy va'dasi shu yerda
            ko'rinadi. Kod bilan yonma-yon turadi, ostida emas: ikkalasi
            BIR VAQTDA sodir bo'ladigan jarayonning ikki tomoni. */}
        <div className="border-t border-[var(--code-line)] px-7 py-7 lg:border-t-0 lg:border-l">
          <p className="ts-label text-[var(--code-text-2)]">Tekshiruv</p>
          <ul className="mt-6 flex flex-col gap-5">
            {TESTS.map((test) => (
              <li key={test.name} className="flex items-center gap-3.5 text-[14px]">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--code-key)]">
                  <Check className="size-4 text-[#04170f]" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--code-text)]">{test.name}</span>
                <span className="ts-num shrink-0 text-[13px] text-[var(--code-text-2)]">
                  {test.time}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-8 border-t border-[var(--code-line)] pt-6 text-[14px] text-[var(--code-text-2)]">
            <span className="font-semibold text-[var(--code-key)]">Qabul qilindi</span> · 20/20 test
          </p>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section>
      {/* Markazlashgan kompozitsiya: yorliq, sarlavha, izoh, ikki tugma,
          faktlar qatori — hammasi bitta vertikal o'qda. Eski uch ustunli
          "baza qatori" tartibi olib tashlandi. */}
      <div className="wrap flex flex-col items-center pt-14 pb-10 text-center sm:pt-20">
        <p className="ts-label rounded-[var(--radius-full)] border border-[var(--green-line)] bg-[var(--green-wash)] px-3 py-1 text-[var(--green-text)]">
          Algoritmik mashq platformasi
        </p>

        <h1 className="ts-display mt-5 max-w-[20ch] text-[var(--text)]">
          Kod yozing, darhol tekshiring va reytingingizni oshiring.
        </h1>

        <p className="ts-lead mt-4 max-w-[52ch]">
          O&apos;zbek tilidagi masalalar, bir necha soniyada qaytadigan natija va
          musobaqalarda o&apos;sib boradigan reyting.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <Link href="/register" className={PRIMARY}>
            Bepul boshlash
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/problems" className={SECONDARY}>
            Masalalar
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {FACTS.map((fact) => (
            <li key={fact} className="flex items-center gap-1.5 text-[13px] text-[var(--text-3)]">
              <Check className="size-3.5 shrink-0 text-[var(--green)]" strokeWidth={2.5} />
              {fact}
            </li>
          ))}
        </ul>
      </div>

      {/* Mahsulot oynasi — markazda, tor konteynerda */}
      <div className="wrap max-w-[960px] pb-16 lg:pb-20">
        <HeroVisual />
      </div>
    </section>
  );
}

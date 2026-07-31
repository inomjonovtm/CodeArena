"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Reveal } from "./reveal";

/* ==========================================================================
   Yakuniy chaqiriq
   --------------------------------------------------------------------------
   Sahifadagi oxirgi blok va YAGONA markazga tekislangan sarlavha: butun
   sahifa chapdan o'qilgani uchun markazlashgan matn bu yerda "to'xtash
   nuqtasi" bo'lib ishlaydi.

   Fon oq qoladi. Ilgari bu blok to'yingan ko'k edi, lekin ostidagi futer
   qora — ikki og'ir blok ketma-ket kelib, sahifa oxiri "qorong'i devor"ga
   aylanardi. Endi ritm shunday: oq CTA → qora futer, ya'ni kontrast oxirgi
   qadamda beriladi.
   ========================================================================== */

const PRIMARY = [
  "focus-ring inline-flex h-12 items-center gap-2.5 rounded-[var(--r-ctl)] px-7",
  "bg-[var(--ink)] text-[15px] font-semibold text-[var(--canvas)]",
  "transition-[background-color,transform] duration-[var(--t-base)] ease-[var(--ease-snap)]",
  "hover:-translate-y-0.5 hover:bg-[var(--brand)] active:scale-[0.97]",
].join(" ");

const SECONDARY = [
  "focus-ring inline-flex h-12 items-center rounded-[var(--r-ctl)] px-7",
  "border border-[var(--ink)] text-[15px] font-semibold text-[var(--ink)]",
  "transition-[color,border-color,transform] duration-[var(--t-base)] ease-[var(--ease-snap)]",
  "hover:border-[var(--brand)] hover:text-[var(--brand)] active:scale-[0.97]",
].join(" ");

export function CTA() {
  return (
    <section className="band shell">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="t-title text-[var(--ink)]">
          Bugunoq birinchi kodingizni yozing va{" "}
          <span className="text-[var(--brand)]">reytingingizni oshiring</span>.
        </h2>
        <p className="mt-5 text-[18px] leading-[1.6] text-[var(--ink-2)]">
          Ro&apos;yxatdan o&apos;tish bepul. Birinchi masalani yechish uchun besh daqiqa yetadi.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register" className={PRIMARY}>
            Bepul boshlash
            <ArrowRight className="size-[18px]" />
          </Link>
          <Link href="/problems" className={SECONDARY}>
            Avval masalalarni ko&apos;rish
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

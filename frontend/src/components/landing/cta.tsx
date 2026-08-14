"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

/* ==========================================================================
   O'RTA CHAQIRIQ — och yashil plitka, markazlashgan
   --------------------------------------------------------------------------
   Ilgari bu to'liq to'yingan yashil lenta edi ("yashil devor"). Yangi
   tizimda to'yingan yashil faqat TUGMADA yashaydi — blok esa och yashil
   yuvindida qoladi va sahifaning karta tiliga qo'shiladi.

   Kompozitsiya markazda: bosh sahifaning hamma bo'limi endi bitta markaziy
   o'qda teriladi, chaqiriq undan chetga chiqmaydi.
   ========================================================================== */

/* Uchta va'da — har biri tekshirib bo'ladigan fakt. Tillar ro'yxati
   ataylab yozilmagan: u vaqt o'tishi bilan o'zgaradi va bosh sahifada
   eskirib qoladi. To'liq ro'yxat masala sahifasidagi tanlagichda. */
const POINTS = [
  { value: "Bepul", label: "Barcha masalalar va musobaqalar" },
  { value: "O'zbekcha", label: "Shartlar va tahlillar ona tilida" },
  { value: "Soniyalar", label: "Tekshiruv natijasi shu zahoti" },
];

export function CTA() {
  return (
    <section className="section-sm wrap">
      <div className="wash flex flex-col items-center rounded-[var(--radius-xl)] px-6 py-10 text-center sm:py-12">
        <p className="ts-label text-[var(--green-text)]">Tayyormisiz?</p>
        <h2 className="ts-h2 mt-2 max-w-[22ch] text-[var(--text)]">
          Bugunoq birinchi kodingizni yozing.
        </h2>
        <p className="ts-sm mt-2.5 max-w-[46ch] text-[var(--text-3)]">
          Ro&apos;yxatdan o&apos;tish bepul. Birinchi masalani yechish uchun besh
          daqiqa yetadi.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/register"
            className={[
              "ring-focus inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] px-4",
              "bg-[var(--green)] text-[14px] font-medium text-[var(--text-on-green)]",
              "shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-1)]",
              "hover:bg-[var(--green-hover)] active:translate-y-px",
            ].join(" ")}
          >
            Bepul boshlash
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/problems"
            className={[
              "ring-focus inline-flex h-10 items-center rounded-[var(--radius-md)] px-4",
              "border border-[var(--green-line)] bg-[var(--surface)] text-[14px] font-medium text-[var(--text)]",
              "transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface-hover)] active:translate-y-px",
            ].join(" ")}
          >
            Masalalar
          </Link>
        </div>

        {/* Uchta va'da — plitkaning pastki qatori */}
        <ul className="mt-8 grid w-full max-w-[40rem] gap-x-8 gap-y-5 border-t border-[var(--green-line)] pt-7 sm:grid-cols-3">
          {POINTS.map((point) => (
            <li key={point.value} className="min-w-0">
              <p className="text-[17px] font-semibold text-[var(--green-text)]">{point.value}</p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-3)]">{point.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

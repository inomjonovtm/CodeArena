"use client";

import { Reveal } from "./reveal";

/* ==========================================================================
   Qanday ishlaydi — uch qadam
   --------------------------------------------------------------------------
   Fon juda och kulrang: oq bo'limlar orasida turgan bu lenta sahifa
   ritmini ochadi va bo'limlar bir-biriga qo'shilib ketmaydi.

   Qadam raqami KO'K: u ro'yxatning tartibini bir qarashda beradi. Qadamlar
   orasidagi chiziq scrollda o'sib chiqadi (`step-line`) — ketma-ketlik shu
   bitta detal orqali seziladi.
   ========================================================================== */

const STEPS = [
  {
    title: "Ro'yxatdan o'ting va darajangizni tanlang",
    body:
      "Oson masalalardan boshlang yoki teglar bo'yicha kerakli mavzuni tanlang — massivlar, dinamik dasturlash, grafiklar.",
  },
  {
    title: "Kod yozing va tekshiruvga yuboring",
    body:
      "Python, C++ yoki JavaScript'da yozing. Namuna testlarda sinab ko'ring, so'ng to'liq to'plamga yuboring — natija soniyalarda keladi.",
  },
  {
    title: "Musobaqalarda reytingingizni oshiring",
    body:
      "Contestlarda qatnashing, jonli leaderboardni kuzating va Elo reytingingiz bilan global hamda guruh jadvalida yuqoriga chiqing.",
  },
];

export function HowItWorks() {
  return (
    <section className="band bg-[var(--canvas-deep)]">
      <div className="shell">
        <Reveal className="max-w-2xl">
          <p className="t-eyebrow-brand">Qanday ishlaydi</p>
          <h2 className="t-title mt-4 text-[var(--ink)]">
            Uch qadam — birinchi yechimdan reytinggacha.
          </h2>
        </Reveal>

        <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 120} className="relative min-w-0">
              {/* Chiziq scrollda o'sadi — qadamlar ketma-ketligini ko'rsatadi */}
              <span
                aria-hidden
                className="step-line absolute top-0 left-0 h-full w-px bg-[var(--brand)] sm:h-px sm:w-full"
              />
              <div className="py-2 pl-6 sm:pt-8 sm:pr-8 sm:pl-0">
                <span className="t-num block text-[15px] font-bold text-[var(--brand)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 text-[19px] font-semibold text-[var(--ink)]">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-[var(--ink-2)]">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

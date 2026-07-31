"use client";

import { Reveal } from "./reveal";

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
    <section className="mx-auto w-full max-w-[var(--page)] px-4 pb-20 sm:px-6 sm:pb-28 lg:px-[var(--gutter)]">
      <Reveal>
        <p className="t-eyebrow text-[var(--stage-ink-3)]">Qanday ishlaydi</p>
        <h2 className="t-title mt-3 max-w-2xl text-[var(--stage-ink)]">
          Uch qadam — birinchi yechimdan reytinggacha.
        </h2>
      </Reveal>

      <ol className="mt-12 grid gap-px sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <Reveal as="li" key={step.title} delay={index * 120} className="relative min-w-0">
            {/* Chiziq scrollda pastga o'sadi — qadamlar ketma-ketligini ko'rsatadi */}
            <span
              aria-hidden
              className="step-line absolute left-0 top-0 h-full w-px bg-[var(--stage-brand)] sm:h-px sm:w-full"
            />
            <div className="py-8 pl-6 sm:pt-8 sm:pl-0 sm:pr-8">
              <span className="t-num block text-[13px] font-semibold text-[var(--stage-brand)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-[16px] font-semibold text-[var(--stage-ink)]">
                {step.title}
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-[1.65] text-[var(--stage-ink-2)]">
                {step.body}
              </p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

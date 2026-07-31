"use client";

import { Bell, BookOpen, ShieldCheck, Trophy, Users, Zap } from "lucide-react";

import { Reveal } from "./reveal";

/* Ikonka rangli plitkada TURMAYDI (DESIGN.md, 0-bo'lim) — soch chizig'idagi
   doirada, sokin rangda. Hover'da karta chegarasi brendga o'tadi. */
const FEATURES = [
  {
    icon: Zap,
    title: "Avtomatik va tezkor judge",
    body:
      "Judge0 va sandbox izolyatsiyasi: kodingiz soniyalar ichida yashirin test-case'lar orqali xavfsiz va xolis tekshiriladi.",
  },
  {
    icon: Trophy,
    title: "Real-time contest va Elo reyting",
    body:
      "SSE orqali soniya sayin yangilanadigan jonli leaderboard va har bir musobaqadan keyin qayta hisoblanadigan adolatli Elo ballari.",
  },
  {
    icon: ShieldCheck,
    title: "Ilg'or anti-plagiat",
    body:
      "Winnowing algoritmi o'zgartirilgan nusxalarni ham topadi. Avtomatik jazo yo'q: shubhali juftlikni moderator qo'lda ko'rib chiqadi.",
  },
  {
    icon: BookOpen,
    title: "Editorial va tahlillar",
    body:
      "Har bir masalaning chuqur tahlili — murakkablik, muqobil yondashuvlar va tipik xatolar. Masalani yechgandan keyin ochiladi.",
  },
  {
    icon: Users,
    title: "Guruhlar va yopiq reyting",
    body:
      "Do'stlaringiz yoki o'quv markazingiz uchun alohida guruh, ichki leaderboard va taklif kodi bilan qo'shilish.",
  },
  {
    icon: Bell,
    title: "PWA va push bildirishnomalar",
    body:
      "Musobaqa boshlanishi, yechim natijasi va javoblar haqida brauzer bildirishnomasi. Ilovani telefon ekraniga o'rnatib qo'yish mumkin.",
  },
];

export function Features() {
  return (
    <section className="mx-auto w-full max-w-[var(--page)] px-4 py-20 sm:px-6 sm:py-28 lg:px-[var(--gutter)]">
      <Reveal>
        <p className="t-eyebrow text-[var(--stage-ink-3)]">Imkoniyatlar</p>
        <h2 className="t-title mt-3 max-w-2xl text-[var(--stage-ink)]">
          Mashqdan musobaqagacha — hammasi bitta joyda.
        </h2>
      </Reveal>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Reveal as="li" key={feature.title} delay={index * 60}>
              <div className="stage-card h-full p-6">
                <span className="grid size-10 place-items-center rounded-full border border-[var(--stage-edge)] text-[var(--stage-ink-2)]">
                  <Icon className="size-[18px]" />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold text-[var(--stage-ink)]">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-[1.65] text-[var(--stage-ink-2)]">
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

"use client";

import { ArrowRight, CalendarDays, Flame, MessageSquare } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/* ==========================================================================
   Kunlik masala va hamjamiyat — ikkita yirik karta
   --------------------------------------------------------------------------
   Oq sirt, ingichka kulrang chegara, hoverda 4px ko'tarilish. Ikkalasi ham
   mahsulotning "har kuni qaytib kelish" sababini ko'rsatadi.
   ========================================================================== */

/* Kalendar — oxirgi 5 hafta. Naqsh QAT'IY: tasodifiy raqam har renderda
   o'zgarib, "jonli ma'lumot" degan noto'g'ri taassurot qoldirardi. Bu —
   g'oyani tushuntiruvchi illyustratsiya, statistika emas. */
const WEEKS = [
  [1, 1, 0, 1, 1, 1, 0],
  [1, 1, 1, 1, 0, 1, 1],
  [0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const TOPICS = [
  { title: "Dinamik dasturlashda holatni qanday tanlash kerak?", replies: 14 },
  { title: "C++ da tez kiritish-chiqarish: cin/cout sekinmi?", replies: 9 },
  { title: "Grafda eng qisqa yo'l — BFS yetarlimi?", replies: 21 },
];

const CARD_LINK = [
  "focus-ring inline-flex items-center gap-2 rounded-[var(--r-ctl)]",
  "text-[15px] font-semibold text-[var(--ink)]",
  "transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]",
].join(" ");

export function Community() {
  return (
    <section className="band shell">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* ------------------------------------------------ kunlik masala */}
        <Reveal>
          <div className="pane pane-interactive h-full rounded-[var(--r-pane)] p-8 sm:p-10">
            <span className="inline-flex items-center gap-2.5">
              <Flame className="size-[18px] text-[var(--brand)]" strokeWidth={1.5} />
              <span className="t-eyebrow-brand">Kunlik masala</span>
            </span>

            <h3 className="mt-5 text-[24px] leading-[1.25] font-bold text-[var(--ink)]">
              Har kuni bitta masala — seriyangizni uzmang.
            </h3>
            <p className="mt-4 text-[15px] leading-[1.65] text-[var(--ink-2)]">
              Kuniga bitta masala yechsangiz seriya o&apos;sadi va qo&apos;shimcha ball beriladi.
              Bir kun o&apos;tkazib yuborsangiz — noldan boshlanadi.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-1.5">
              {WEEKS.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1.5">
                  {week.map((filled, dayIndex) => (
                    <span
                      key={dayIndex}
                      className={cn(
                        "size-3.5 rounded-[4px]",
                        filled ? "bg-[var(--brand)]" : "bg-[var(--canvas-deep)]",
                      )}
                    />
                  ))}
                </div>
              ))}
              <span className="t-num ml-4 text-[15px] font-bold text-[var(--ink)]">
                32 kunlik seriya
              </span>
            </div>

            <Link href="/daily" className={cn(CARD_LINK, "mt-9")}>
              <CalendarDays className="size-[18px]" strokeWidth={1.5} />
              Bugungi masalani ochish
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>

        {/* -------------------------------------------------- muhokamalar */}
        <Reveal delay={100}>
          <div className="pane pane-interactive flex h-full flex-col rounded-[var(--r-pane)] p-8 sm:p-10">
            <span className="inline-flex items-center gap-2.5">
              <MessageSquare className="size-[18px] text-[var(--brand)]" strokeWidth={1.5} />
              <span className="t-eyebrow-brand">Hamjamiyat</span>
            </span>

            <h3 className="mt-5 text-[24px] leading-[1.25] font-bold text-[var(--ink)]">
              Tiqilib qolsangiz — so&apos;rang.
            </h3>
            <p className="mt-4 text-[15px] leading-[1.65] text-[var(--ink-2)]">
              Muhokamalarda g&apos;oya almashinadi, tayyor yechim tarqatilmaydi. Masala ostida
              esa oddiy izohlar — qisqa savol berish uchun.
            </p>

            <ul className="mt-8 flex-1 divide-y divide-[var(--edge)] border-t border-[var(--edge)]">
              {TOPICS.map((topic) => (
                <li key={topic.title} className="flex items-start gap-4 py-4">
                  <span className="min-w-0 flex-1 text-[15px] text-[var(--ink)]">
                    {topic.title}
                  </span>
                  <span className="t-num shrink-0 text-[13px] text-[var(--ink-3)]">
                    {topic.replies}
                  </span>
                </li>
              ))}
            </ul>

            <Link href="/discussions" className={cn(CARD_LINK, "mt-8")}>
              Muhokamalarga o&apos;tish
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

"use client";

import { ArrowRight, CalendarDays, Flame, MessageSquare } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/* Kalendar — oxirgi 5 hafta. Uzluksiz seriya g'oyasini bir qarashda
   ko'rsatish uchun naqsh qat'iy: tasodifiy raqam har renderda o'zgarib,
   "jonli ma'lumot" degan noto'g'ri taassurot qoldirardi. */
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

export function Community() {
  return (
    <section className="mx-auto w-full max-w-[var(--page)] px-4 pb-20 sm:px-6 sm:pb-28 lg:px-[var(--gutter)]">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------ kunlik masala */}
        <Reveal>
          <div className="stage-card h-full p-6 sm:p-8">
            <span className="inline-flex items-center gap-2 text-[var(--flare)]">
              <Flame className="size-4" />
              <span className="t-eyebrow">Kunlik masala</span>
            </span>

            <h3 className="t-section mt-4 text-[var(--stage-ink)]">
              Har kuni bitta masala — seriyangizni uzmang.
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--stage-ink-2)]">
              Kuniga bitta masala yechsangiz seriya o&apos;sadi va qo&apos;shimcha ball beriladi.
              Bir kun o&apos;tkazib yuborsangiz — noldan boshlanadi.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-1.5">
              {WEEKS.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1.5">
                  {week.map((filled, dayIndex) => (
                    <span
                      key={dayIndex}
                      className={cn(
                        "size-3 rounded-[3px]",
                        filled
                          ? "bg-[color-mix(in_oklab,var(--stage-ok)_70%,transparent)]"
                          : "bg-[var(--stage-edge)]",
                      )}
                    />
                  ))}
                </div>
              ))}
              <span className="t-num ml-3 text-[13px] font-semibold text-[var(--stage-ink)]">
                32 kunlik seriya
              </span>
            </div>

            <Link
              href="/daily"
              className="focus-ring mt-7 inline-flex items-center gap-1.5 rounded-[var(--r-ctl)] text-[13.5px] font-medium text-[var(--stage-brand)] transition-opacity hover:opacity-80"
            >
              <CalendarDays className="size-4" />
              Bugungi masalani ochish
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Reveal>

        {/* -------------------------------------------------- muhokamalar */}
        <Reveal delay={100}>
          <div className="stage-card flex h-full flex-col p-6 sm:p-8">
            <span className="inline-flex items-center gap-2 text-[var(--stage-ink-2)]">
              <MessageSquare className="size-4" />
              <span className="t-eyebrow">Hamjamiyat</span>
            </span>

            <h3 className="t-section mt-4 text-[var(--stage-ink)]">
              Tiqilib qolsangiz — so&apos;rang.
            </h3>
            <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--stage-ink-2)]">
              Muhokamalarda g&apos;oya almashinadi, tayyor yechim tarqatilmaydi. Masala ostida
              esa oddiy izohlar — qisqa savol berish uchun.
            </p>

            <ul className="mt-6 flex-1 divide-y divide-[var(--stage-edge)]">
              {TOPICS.map((topic) => (
                <li key={topic.title} className="flex items-start gap-3 py-3">
                  <span className="min-w-0 flex-1 text-[13.5px] text-[var(--stage-ink)]">
                    {topic.title}
                  </span>
                  <span className="t-num shrink-0 text-[12px] text-[var(--stage-ink-3)]">
                    {topic.replies}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/discussions"
              className="focus-ring mt-6 inline-flex items-center gap-1.5 rounded-[var(--r-ctl)] text-[13.5px] font-medium text-[var(--stage-brand)] transition-opacity hover:opacity-80"
            >
              Muhokamalarga o&apos;tish
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

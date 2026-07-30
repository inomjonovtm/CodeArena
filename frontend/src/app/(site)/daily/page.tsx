"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Check, Flame, Timer, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers";
import {
  Block,
  Chip,
  DifficultyMark,
  Empty,
  LinkButton,
  PageHead,
  Pane,
  PaneHead,
  SplitLayout,
  Stat,
} from "@/components/kit";
import { Markdown } from "@/components/ui/markdown";
import type { DailyCalendarDay, Difficulty } from "@/lib/types";
import { publicApi } from "@/lib/public-api";
import { cn, formatDate } from "@/lib/utils";

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

const WEEKDAYS_UZ = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

/** Ertangi kunning boshlanishi — bugungi masala shu vaqtda almashadi. */
function nextMidnight(): number {
  const date = new Date();
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Yangilanishgacha qolgan vaqt — soat:daqiqa:soniya. */
function TimeLeft() {
  const [target] = useState(nextMidnight);
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor(remaining / 60_000) % 60;
  const seconds = Math.floor(remaining / 1000) % 60;

  return (
    <Chip tone="neutral" icon={<Timer className="size-3.5" />}>
      Yangilanishga{" "}
      <span className="t-num font-semibold text-[var(--ink)]">
        {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}
      </span>
    </Chip>
  );
}

/** Oylik taqvim panjarasi — yechilgan/o'tkazilgan kunlar nuqta bilan. */
function CalendarGrid({ days }: { days: DailyCalendarDay[] }) {
  if (!days.length) return null;

  // Birinchi kun haftaning qaysi kuniga tushishini hisoblaymiz (Du — birinchi)
  const lead = (new Date(days[0].date).getDay() + 6) % 7;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS_UZ.map((day) => (
          <span key={day} className="pb-1 text-center text-[10.5px] font-semibold text-[var(--ink-4)]">
            {day}
          </span>
        ))}
        {Array.from({ length: lead }).map((_, index) => (
          <span key={`lead-${index}`} aria-hidden />
        ))}
        {days.map((day) => {
          const date = new Date(day.date);
          return (
            <Link
              key={day.date}
              href={`/problems/${day.problem_slug}`}
              title={`${formatDate(day.date, false)} — ${day.problem_title}`}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-[var(--r-ctl)] border focus-ring",
                "transition-colors duration-[var(--t-fast)]",
                day.is_today
                  ? "border-[var(--brand-edge)] bg-[var(--brand-wash)]"
                  : "border-transparent hover:bg-[var(--pane-hover)]",
              )}
            >
              <span
                className={cn(
                  "t-num text-[11.5px] font-medium",
                  day.is_solved ? "text-[var(--ink)]" : "text-[var(--ink-3)]",
                )}
              >
                {date.getDate()}
              </span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  day.is_solved ? "bg-[var(--ok)]" : "bg-[var(--edge-strong)]",
                )}
              />
            </Link>
          );
        })}
      </div>

      {/* Belgilar izohi — rang yolg'iz signal bo'lmasin */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-4)]">
          <span className="size-1.5 rounded-full bg-[var(--ok)]" />
          yechilgan
        </span>
        <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-4)]">
          <span className="size-1.5 rounded-full bg-[var(--edge-strong)]" />
          o&apos;tkazilgan
        </span>
        <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-4)]">
          <span className="size-2.5 rounded-[4px] border border-[var(--brand-edge)] bg-[var(--brand-wash)]" />
          bugun
        </span>
      </div>
    </div>
  );
}

export default function DailyChallengePage() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["daily-challenge", 30],
    queryFn: () => publicApi.dailyChallenge(30),
    retry: false,
  });

  if (isLoading) {
    /* Skelet kartalar ritmini takrorlaydi — kontent kelganda sahifa sakramaydi */
    return (
      <div className="flex flex-col gap-5">
        <Block className="h-36 rounded-[var(--r-pane)]" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-5">
            <Block className="h-56 rounded-[var(--r-pane-lg)]" />
            <Block className="h-72 rounded-[var(--r-pane)]" />
          </div>
          <div className="flex flex-col gap-5">
            <Block className="h-44 rounded-[var(--r-pane)]" />
            <Block className="h-80 rounded-[var(--r-pane)]" />
          </div>
        </div>
      </div>
    );
  }

  const challenge = data?.problem_slug ? data : null;
  const detail = data?.problem_detail ?? null;
  const solvedDays = (data?.calendar ?? []).filter((day) => day.is_solved).length;

  return (
    <div className="flex flex-col gap-7">
      {/* --------------------------------------------- 1. sahifa sarlavhasi
          Belgilar sarlavha ostidagi meta qatorida — chiziq ularni kontentdan
          ajratadi, quti kerak emas. */}
      <PageHead
        eyebrow="Har kuni bittadan"
        title="Kunlik masala"
        lead="Har kuni bitta yangi masala. Ketma-ket yeching va seriyangizni uzaytiring."
        actions={<TimeLeft />}
        meta={
          challenge &&
          (challenge.problem_difficulty || challenge.bonus_points || data?.is_solved) ? (
            <>
              {challenge.problem_difficulty ? (
                <DifficultyMark
                  value={challenge.problem_difficulty}
                  label={DIFF_LABEL[challenge.problem_difficulty]}
                />
              ) : null}
              {challenge.bonus_points ? (
                <Chip tone="brand" icon={<Trophy className="size-3.5" />}>
                  +<span className="t-num">{challenge.bonus_points}</span> bonus ball
                </Chip>
              ) : null}
              {data?.is_solved ? (
                <Chip tone="ok" icon={<Check className="size-3.5" strokeWidth={3} />}>
                  Yechilgan
                </Chip>
              ) : null}
            </>
          ) : null
        }
      />

      <SplitLayout
        className="gap-5"
        aside={
          <div className="enter flex flex-col gap-5">
            {/* ----------------------------------------------- seriya statistikasi */}
            {user ? (
              <Pane inset="md">
                <p className="t-eyebrow">Seriya</p>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                  <Stat
                    label="Joriy"
                    value={data?.streak.current ?? 0}
                    sub="kun ketma-ket"
                    tone="warn"
                    icon={<Flame className="size-3.5" />}
                  />
                  <Stat label="Eng uzuni" value={data?.streak.longest ?? 0} sub="kun" />
                  <Stat
                    label="30 kunda"
                    value={solvedDays}
                    sub={`${data?.calendar?.length ?? 0} ta masaladan`}
                    tone="ok"
                    icon={<Check className="size-3.5" />}
                  />
                  <Stat
                    label="Bugungi bonus"
                    value={`+${challenge?.bonus_points ?? 0}`}
                    sub="qo'shimcha ball"
                    tone="brand"
                    icon={<Trophy className="size-3.5" />}
                  />
                </div>
              </Pane>
            ) : null}

            {/* ------------------------------------------------------- taqvim */}
            {data?.calendar?.length ? (
              <Pane inset="md">
                <PaneHead title="Taqvim" hint="Oxirgi 30 kun" />
                <div className="mt-5">
                  <CalendarGrid days={data.calendar} />
                </div>
              </Pane>
            ) : null}

            {!user ? (
              <Pane inset="md">
                <p className="t-meta text-[var(--ink-2)]">
                  Seriyangizni kuzatish va bonus ball olish uchun hisobingizga kiring.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <LinkButton href="/register" size="sm" variant="brand-soft">
                    Ro&apos;yxatdan o&apos;tish
                  </LinkButton>
                  <LinkButton
                    href="/login"
                    size="sm"
                    className="border-[var(--edge)] bg-[var(--pane-sunken)] hover:bg-[var(--pane-hover)]"
                  >
                    Kirish
                  </LinkButton>
                </div>
              </Pane>
            ) : null}
          </div>
        }
      >
        <div className="flex min-w-0 flex-col gap-5">
          {/* ------------------------------------------------ bugungi masala */}
          {isError || !challenge ? (
            <Pane tone="solid" inset="none" className="overflow-hidden">
              <Empty
                icon={<CalendarDays className="size-5" />}
                title="Bugungi masala hali belgilanmagan"
                description="Adminlar tez orada bugungi masalani tanlaydi. Shu orada boshqa masalalarni yechib turing."
                action={<LinkButton href="/problems" variant="primary">Masalalarga o&apos;tish</LinkButton>}
              />
            </Pane>
          ) : (
            <>
              {/* Sahifaning yagona to'yingan ko'k bloki — bugungi chaqiriq */}
              <div className="enter pane-brand rounded-[var(--r-pane-lg)] p-7 sm:p-9">
                <p className="t-eyebrow text-[var(--brand-wash)]">
                  {formatDate(challenge.date, false)}
                </p>
                <h2 className="t-title mt-3 text-[var(--ink-on-brand)]">
                  {challenge.problem_title}
                </h2>

                {challenge.note_uz ? (
                  <p className="t-body mt-4 max-w-xl text-[var(--brand-wash)]">
                    {challenge.note_uz}
                  </p>
                ) : null}

                <div className="mt-7">
                  <LinkButton
                    href={`/problems/${challenge.problem_slug}`}
                    variant="primary"
                    size="lg"
                    iconAfter={<ArrowRight className="size-4" />}
                    className={cn(
                      "bg-[var(--ink-on-brand)] text-[var(--brand-ink)] shadow-none",
                      "hover:bg-[var(--brand-wash)] active:bg-[var(--brand-wash-strong)]",
                    )}
                  >
                    {data?.is_solved ? "Qayta ko'rish" : "Yechishni boshlash"}
                  </LinkButton>
                </div>
              </div>

              {detail ? (
                <Pane tone="solid" inset="lg" className="enter">
                  <PaneHead eyebrow="Shart" title="Masala sharti" />
                  <div className="mt-5">
                    <Markdown source={detail.description_uz} />
                  </div>
                </Pane>
              ) : null}
            </>
          )}
        </div>
      </SplitLayout>
    </div>
  );
}

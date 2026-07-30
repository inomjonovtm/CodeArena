"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Check, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/components/providers";
import { publicApi } from "@/lib/public-api";
import type { ContestState } from "@/lib/types";
import { cn } from "@/lib/utils";

const pad = (value: number) => String(value).padStart(2, "0");

/** Qolgan millisekundlar — server soati bilan tuzatilgan holda sanaydi. */
export function useRemaining(target: string, serverNow?: string, onDone?: () => void) {
  const offsetRef = useRef(0);
  const doneRef = useRef(false);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(target).getTime() - Date.now()),
  );

  // Foydalanuvchi soati noto'g'ri bo'lsa ham server vaqti bo'yicha sanaymiz
  useEffect(() => {
    if (!serverNow) return;
    const skew = new Date(serverNow).getTime() - Date.now();
    offsetRef.current = Math.abs(skew) > 5000 ? skew : 0;
  }, [serverNow]);

  useEffect(() => {
    doneRef.current = false;
    const tick = () => {
      const next = Math.max(0, new Date(target).getTime() - (Date.now() + offsetRef.current));
      setRemaining(next);
      if (next === 0 && !doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // `onDone` har renderda yangi bo'lishi mumkin — taymer qayta qurilmasin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return remaining;
}

/** Millisekundlarni `1k 02:03:04` ko'rinishiga keltiradi. */
export function formatRemaining(remaining: number): string {
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days > 0 ? `${days}k ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Teskari sanoq — raqamlar doim `t-num` bilan tekis turadi. */
export function Countdown({
  target,
  serverNow,
  onDone,
  className,
}: {
  target: string;
  serverNow?: string;
  onDone?: () => void;
  className?: string;
}) {
  const remaining = useRemaining(target, serverNow, onDone);
  return <span className={cn("t-num", className)}>{formatRemaining(remaining)}</span>;
}

/** Qolgan vaqt shu chegaradan tushsa taymer warn tusiga o'tadi. */
const LOW_TIME_MS = 15 * 60_000;

/**
 * Musobaqa konteksti paneli — sayt panelining ostida yopishib turadigan
 * ingichka to'yingan blok. Kontent uning ostidan o'tadi va to'ldirma
 * farqi tufayli panel doim ajralib ko'rinadi — soya kerak emas.
 *
 * Chapda musobaqa nomi, o'rtada masala almashtirgich (oldingi/keyingi +
 * harf chiplari), o'ngda natijalar havolasi va qolgan vaqt. Vaqt oz qolganda
 * taymer warn tusiga o'tadi. Masalalar hali ochilmagan bo'lsa panel umuman
 * ko'rsatilmaydi — bo'sh harflar chalg'itardi.
 */
export function ContestBar({
  slug,
  endTime,
  serverTime,
  state,
  activeProblemSlug,
  title,
}: {
  slug: string;
  endTime: string;
  serverTime?: string;
  state: ContestState | string;
  activeProblemSlug?: string;
  /** Musobaqa nomi — panelning chap qismida havola bo'lib turadi. */
  title?: string;
}) {
  const { t } = useI18n();

  const { data } = useQuery({
    queryKey: ["contest-problems", slug],
    queryFn: () => publicApi.contests.problems(slug),
    enabled: state === "running" || state === "finished",
    retry: false,
  });

  const running = state === "running";
  const remaining = useRemaining(endTime, serverTime);

  const problems = data?.problems ?? [];
  if (!problems.length) return null;

  const solved = problems.filter((row) => row.is_solved).length;
  const low = running && remaining > 0 && remaining <= LOW_TIME_MS;

  // Oldingi/keyingi masala — faqat masala sahifasida ma'noga ega
  const activeIndex = activeProblemSlug
    ? problems.findIndex((row) => row.problem_slug === activeProblemSlug)
    : -1;
  const prev = activeIndex > 0 ? problems[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < problems.length - 1 ? problems[activeIndex + 1] : null;

  const stepClass = (enabled: boolean) =>
    cn(
      "flex size-8 shrink-0 items-center justify-center rounded-[var(--r-ctl)] focus-ring",
      "transition-colors duration-[var(--t-fast)]",
      enabled
        ? "text-[var(--ink-3)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]"
        : "pointer-events-none text-[var(--ink-4)] opacity-35",
    );

  return (
    <div
      className={cn(
        "enter sticky top-[calc(var(--bar)+12px)] z-30 mb-6",
        "pane rounded-[var(--r-pane)] px-3 py-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Musobaqa nomi — hub sahifasiga qaytish */}
        <Link
          href={`/contests/${slug}`}
          title={t.site.contest.backToContest}
          className={cn(
            "min-w-0 max-w-56 truncate rounded-[var(--r-ctl)] px-2 py-1.5 focus-ring",
            "text-[13px] font-semibold text-[var(--ink)] transition-colors",
            "hover:bg-[var(--pane-hover)]",
          )}
        >
          {title ?? t.site.contest.problems}
        </Link>

        <span aria-hidden className="hidden h-5 w-px shrink-0 bg-[var(--edge)] sm:block" />

        {/* Masala almashtirgich: oldingi / harflar / keyingi */}
        <div className="flex min-w-0 items-center gap-1">
          {activeProblemSlug ? (
            prev ? (
              <Link
                href={`/contests/${slug}/problems/${prev.problem_slug}`}
                aria-label={`Oldingi masala — ${prev.label}`}
                className={stepClass(true)}
              >
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <span aria-hidden className={stepClass(false)}>
                <ChevronLeft className="size-4" />
              </span>
            )
          ) : null}

          <div className="fade-edges flex items-center gap-1 overflow-x-auto px-1 py-0.5">
            {problems.map((row) => {
              const active = row.problem_slug === activeProblemSlug;
              return (
                <Link
                  key={row.id}
                  href={`/contests/${slug}/problems/${row.problem_slug}`}
                  title={`${row.label} · ${row.title_uz}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-[var(--r-ctl)]",
                    "text-[13px] font-semibold focus-ring",
                    "transition-colors duration-[var(--t-fast)]",
                    active
                      ? "bg-[var(--brand)] text-[var(--ink-on-brand)] shadow-[var(--lift-brand)]"
                      : row.is_solved
                        ? "bg-[var(--ok-wash)] text-[var(--ok)]"
                        : row.is_attempted
                          ? "bg-[var(--bad-wash)] text-[var(--bad)]"
                          : "bg-[var(--pane-sunken)] text-[var(--ink-3)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-ink)]",
                  )}
                >
                  {row.is_solved && !active ? <Check className="size-3.5" strokeWidth={3} /> : row.label}
                </Link>
              );
            })}
          </div>

          {activeProblemSlug ? (
            next ? (
              <Link
                href={`/contests/${slug}/problems/${next.problem_slug}`}
                aria-label={`Keyingi masala — ${next.label}`}
                className={stepClass(true)}
              >
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span aria-hidden className={stepClass(false)}>
                <ChevronRight className="size-4" />
              </span>
            )
          ) : null}
        </div>

        {/* Yechilganlar hisobi */}
        <span className="t-num hidden text-[12.5px] text-[var(--ink-4)] md:inline">
          {solved}/{problems.length}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Natijalar jadvaliga havola */}
          <Link
            href={`/contests/${slug}?tab=standings`}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[var(--r-ctl)] px-2.5 focus-ring",
              "text-[12.5px] font-medium text-[var(--ink-3)] transition-colors",
              "hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
            )}
          >
            <BarChart3 className="size-3.5" />
            <span className="hidden sm:inline">Natijalar</span>
          </Link>

          {/* Qolgan vaqt — oz qolganda warn tusi */}
          {running ? (
            <span
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[var(--r-ctl)] px-2.5",
                "text-[13px] font-semibold",
                low ? "bg-[var(--warn-wash)] text-[var(--warn)]" : "bg-[var(--pane-sunken)] text-[var(--ink-2)]",
              )}
            >
              <Timer className="size-3.5" />
              <span className="t-num">{formatRemaining(remaining)}</span>
            </span>
          ) : (
            <span className="text-[12px] text-[var(--ink-4)]">{t.site.contest.finished}</span>
          )}
        </div>
      </div>
    </div>
  );
}

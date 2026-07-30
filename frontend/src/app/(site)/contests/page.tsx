"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Clock, History, Lock, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/providers";
import {
  Alert,
  Block,
  Chip,
  Empty,
  LinkButton,
  LiveDot,
  PageHead,
  Pagination,
  Pane,
  PaneHead,
  Segmented,
} from "@/components/kit";
import { Countdown } from "@/components/site/contest-bar";
import { publicApi } from "@/lib/public-api";
import type { PublicContest } from "@/lib/types";
import { cn, formatDate, formatDateShort } from "@/lib/utils";

type Filter = "" | "running" | "scheduled" | "finished";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "", label: "Barchasi" },
  { value: "running", label: "Davom etmoqda" },
  { value: "scheduled", label: "Kutilmoqda" },
  { value: "finished", label: "Tugagan" },
];

/** Soat-daqiqa — chapdagi sana relsi uchun. */
const timeOf = (value: string) => {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

/* --------------------------------------------------------------------------
   Hozir davom etmoqda — o'z kartasi. Birinchisi sahifadagi YAGONA to'yingan
   ko'k blok bo'ladi; qolgani oddiy oq karta, chap qirrasida brend chizig'i.
   Aks holda sahifada ikkita "asosiy" chaqiriq paydo bo'lardi.
   -------------------------------------------------------------------------- */
function RunningPane({ contest, hero }: { contest: PublicContest; hero?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-pane-lg)] p-7",
        hero ? "pane-brand" : "pane edge-brand",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {hero ? (
              /* Ko'k blokda jonli nuqta oq bo'ladi — yashil nuqta bu yerda so'nadi */
              <span className="relative flex size-2 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--ink-on-brand)] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--ink-on-brand)]" />
              </span>
            ) : (
              <LiveDot tone="ok" />
            )}
            <span className={cn("t-eyebrow", hero ? "text-[var(--brand-wash)]" : "text-[var(--ok)]")}>
              Hozir davom etmoqda
            </span>
          </div>
          <h3 className={cn("t-title mt-3", hero ? "text-[var(--ink-on-brand)]" : "text-[var(--ink)]")}>
            <Link
              href={`/contests/${contest.slug}`}
              className={cn(
                "rounded-[6px] transition-colors focus-ring",
                hero ? "hover:text-[var(--brand-wash)]" : "hover:text-[var(--brand)]",
              )}
            >
              {contest.title_uz}
            </Link>
          </h3>
          {contest.description_uz ? (
            <p
              className={cn(
                "t-body mt-2.5 line-clamp-2 max-w-xl",
                hero ? "text-[var(--brand-wash)]" : "text-[var(--ink-3)]",
              )}
            >
              {contest.description_uz}
            </p>
          ) : null}
          <div
            className={cn(
              "mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]",
              hero ? "text-[var(--brand-wash)]" : "text-[var(--ink-3)]",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <Users className={cn("size-3.5", !hero && "text-[var(--ink-4)]")} />
              <span className="t-num">{contest.participant_count}</span> ishtirokchi
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy className={cn("size-3.5", !hero && "text-[var(--ink-4)]")} />
              <span className="t-num">{contest.problem_count}</span> masala
            </span>
            {contest.is_rated ? (
              hero ? (
                <span className="rounded-[var(--r-chip)] bg-[var(--ink-on-brand)] px-2.5 py-1 text-[12px] font-medium text-[var(--brand-ink)]">
                  reytingli
                </span>
              ) : (
                <Chip tone="brand">reytingli</Chip>
              )
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-4 sm:items-end">
          <div>
            <p className={cn("t-eyebrow", hero && "text-[var(--brand-wash)]")}>Tugashiga</p>
            <Countdown
              target={contest.end_time}
              className={cn(
                "mt-1.5 block text-[30px] leading-none font-bold",
                hero ? "text-[var(--ink-on-brand)]" : "text-[var(--ink)]",
              )}
            />
          </div>
          <LinkButton
            href={`/contests/${contest.slug}`}
            variant="primary"
            iconAfter={<ChevronRight className="size-4" />}
            className={cn(
              hero &&
                "bg-[var(--ink-on-brand)] text-[var(--brand-ink)] shadow-none hover:bg-[var(--brand-wash)] active:bg-[var(--brand-wash-strong)]",
            )}
          >
            Musobaqaga kirish
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Yaqinlashayotgan — o'z kartasida vaqt chizig'i: chapda sana relsi,
   o'ngda kontent. Karta ichida karta yo'q, faqat nozik chiziq va nuqtalar.
   -------------------------------------------------------------------------- */
function UpcomingTimeline({ rows }: { rows: PublicContest[] }) {
  return (
    <Pane inset="lg">
      <PaneHead title="Yaqinlashayotgan" hint="Boshlanish vaqti bo'yicha" />

      <ol className="enter-stagger mt-6">
        {rows.map((contest, index) => {
          const last = index === rows.length - 1;
          return (
            <li key={contest.id} className="flex gap-4 sm:gap-6">
              {/* Sana relsi */}
              <div className="w-20 shrink-0 pt-0.5 text-right sm:w-24">
                <p className="t-num text-[14.5px] font-semibold text-[var(--ink)]">
                  {formatDateShort(contest.start_time)}
                </p>
                <p className="t-num mt-0.5 text-[12.5px] text-[var(--ink-4)]">
                  {timeOf(contest.start_time)}
                </p>
              </div>

              {/* Nuqta va chiziq */}
              <div aria-hidden className="flex flex-col items-center">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-[var(--brand)] bg-[var(--pane-solid)]" />
                {!last ? <span className="mt-1 w-px flex-1 bg-[var(--edge)]" /> : null}
              </div>

              {/* Kontent */}
              <div className={cn("min-w-0 flex-1", !last && "pb-8")}>
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <div className="min-w-0">
                    <Link
                      href={`/contests/${contest.slug}`}
                      className="rounded-[6px] text-[15px] font-semibold text-[var(--ink)] transition-colors hover:text-[var(--brand)] focus-ring"
                    >
                      {contest.title_uz}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[var(--ink-3)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5 text-[var(--ink-4)]" />
                        <span className="t-num">{contest.duration_minutes}</span> daqiqa
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Trophy className="size-3.5 text-[var(--ink-4)]" />
                        <span className="t-num">{contest.problem_count}</span> masala
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5 text-[var(--ink-4)]" />
                        <span className="t-num">{contest.participant_count}</span>
                      </span>
                      {contest.is_rated ? <Chip tone="brand">reytingli</Chip> : null}
                    </div>
                  </div>
                  <LinkButton href={`/contests/${contest.slug}`} size="sm">
                    Ro&apos;yxatdan o&apos;tish
                  </LinkButton>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Pane>
  );
}

/* --------------------------------------------------------------------------
   O'tgan musobaqalar — o'z kartasi: tepada sarlavha, ostida zich ro'yxat.
   -------------------------------------------------------------------------- */
function PastList({ rows }: { rows: PublicContest[] }) {
  return (
    <Pane inset="none" className="overflow-hidden">
      <div className="px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
        <PaneHead title="O'tgan musobaqalar" hint="Natijalar va virtual qatnashish" />
      </div>

      <ul className="divide-y divide-[var(--edge-soft)] border-t border-[var(--edge)]">
        {rows.map((contest) => (
          <li key={contest.id}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-[var(--pane-hover)] sm:px-7">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/contests/${contest.slug}`}
                  className="rounded-[6px] text-[14px] font-medium text-[var(--ink)] transition-colors hover:text-[var(--brand)] focus-ring"
                >
                  {contest.title_uz}
                </Link>
                <p className="t-meta mt-0.5 flex flex-wrap items-center gap-x-3 text-[var(--ink-4)]">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    {formatDate(contest.start_time, false)}
                  </span>
                  <span className="t-num">{contest.participant_count} ishtirokchi</span>
                  {contest.is_virtual_allowed ? (
                    <span className="inline-flex items-center gap-1">
                      <History className="size-3.5" />
                      virtual mumkin
                    </span>
                  ) : null}
                </p>
              </div>
              <LinkButton
                href={`/contests/${contest.slug}?tab=standings`}
                variant="ghost"
                size="sm"
                icon={<Trophy className="size-3.5" />}
              >
                Natijalar
              </LinkButton>
            </div>
          </li>
        ))}
      </ul>
    </Pane>
  );
}

/** Skelet — haqiqiy tartibni (kartalar ketma-ketligi) takrorlaydi. */
function ContestsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="pane rounded-[var(--r-pane-lg)] p-7">
        <Block className="h-3 w-36" />
        <Block className="mt-4 h-5 w-2/3" />
        <Block className="mt-3 h-3 w-1/2" />
        <Block className="mt-6 h-9 w-44 rounded-[var(--r-ctl)]" />
      </div>

      <Pane inset="lg">
        <Block className="h-4 w-40" />
        <div className="mt-6 flex flex-col gap-8">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-6">
              <Block className="h-10 w-24 shrink-0" />
              <div className="min-w-0 flex-1">
                <Block className="h-4 w-1/3" />
                <Block className="mt-2.5 h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Pane>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function ContestsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-contests", filter, page],
    placeholderData: (previous) => previous,
    queryFn: () =>
      publicApi.contests.list({
        page,
        page_size: PAGE_SIZE,
        ...(filter ? { state: filter } : {}),
      }),
  });

  const { data: mine } = useQuery({
    queryKey: ["my-contests"],
    queryFn: () => publicApi.contests.mine(),
    enabled: Boolean(user),
  });

  const rows = data?.results ?? [];

  // Zamon bo'yicha uch guruh: jonli, yaqinlashayotgan, o'tgan
  const runningRows = rows.filter((row) => row.computed_status === "running");
  const upcomingRows = rows.filter((row) => row.computed_status === "scheduled");
  const pastRows = rows.filter(
    (row) => row.computed_status !== "running" && row.computed_status !== "scheduled",
  );

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    /* Har bir blok alohida kartada; ular orasida bir tekis 20px bo'shliq */
    <div className="flex flex-col gap-7">
      {/* ------------------------------------------------- sarlavha kartasi */}
      <PageHead
        eyebrow="Arena"
        title="Musobaqalar"
        lead="Belgilangan vaqtda boshlanadigan bellashuvlar. Natijalar reytingingizga ta'sir qiladi."
      />

      {/* ----------------------------------------------- mening natijalarim */}
      {user && mine?.length ? (
        <Pane inset="lg" className="enter">
          <PaneHead title="Mening natijalarim" />
          <div className="fade-edges -mx-1 mt-5 overflow-x-auto px-1 pb-1">
            <ul className="flex gap-2.5">
              {mine.slice(0, 8).map((row) => (
                <li key={row.contest_slug} className="shrink-0">
                  {/* Karta ichida karta emas — botiq kafel */}
                  <Link
                    href={`/contests/${row.contest_slug}`}
                    className={cn(
                      "pane-sunken focus-ring flex w-56 flex-col gap-1.5 rounded-[var(--r-field)] p-3.5",
                      "transition-colors duration-[var(--t-fast)] hover:border-[var(--brand-edge)]",
                    )}
                  >
                    <span className="truncate text-[13.5px] font-medium text-[var(--ink)]">
                      {row.title_uz}
                    </span>
                    <span className="t-num flex items-center gap-2 text-[12.5px] text-[var(--ink-3)]">
                      {row.rank ? `#${row.rank}` : "—"} · {row.score} ball
                      {row.rating_change ? (
                        <span
                          className={cn(
                            "font-semibold",
                            row.rating_change > 0 ? "text-[var(--ok)]" : "text-[var(--bad)]",
                          )}
                        >
                          {row.rating_change > 0 ? "+" : ""}
                          {row.rating_change}
                        </span>
                      ) : null}
                      {row.is_virtual ? <Chip tone="neutral">virtual</Chip> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Pane>
      ) : null}

      {/* -------------------------------------------------- filtr kartasi */}
      <Pane inset="sm">
        <div className="-mx-1 overflow-x-auto px-1 py-0.5">
          <Segmented
            value={filter}
            onChange={changeFilter}
            items={FILTERS.map((item) => ({ value: item.value, label: item.label }))}
          />
        </div>
      </Pane>

      {/* ---------------------------------------------------------- kontent */}
      {isLoading ? (
        <ContestsSkeleton />
      ) : isError ? (
        <Alert
          tone="bad"
          title="Musobaqalarni yuklab bo'lmadi"
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-[var(--r-ctl)] px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--bad)] transition-colors hover:bg-[var(--bad-wash)] focus-ring"
            >
              Qayta urinish
            </button>
          }
        >
          Tarmoqda uzilish bo&apos;ldi. Qayta urinib ko&apos;ring.
        </Alert>
      ) : rows.length === 0 ? (
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            icon={<Trophy className="size-5" />}
            title="Musobaqa topilmadi"
            description={
              filter ? "Boshqa holatni tanlab ko'ring." : "Hozircha e'lon qilingan musobaqa yo'q."
            }
          />
        </Pane>
      ) : (
        <>
          {runningRows.length ? (
            <div className="enter flex flex-col gap-5">
              {runningRows.map((contest, index) => (
                <RunningPane key={contest.id} contest={contest} hero={index === 0} />
              ))}
            </div>
          ) : null}

          {upcomingRows.length ? <UpcomingTimeline rows={upcomingRows} /> : null}

          {pastRows.length ? <PastList rows={pastRows} /> : null}
        </>
      )}

      {/* ------------------------------------------------- mehmon eslatmasi */}
      {!user ? (
        <Alert
          tone="info"
          action={
            <LinkButton href="/login" size="sm" variant="brand-soft" icon={<Lock className="size-3.5" />}>
              Kirish
            </LinkButton>
          }
        >
          Musobaqada qatnashish uchun hisobingizga kiring — natijalar reytingingizga qo&apos;shiladi.
        </Alert>
      ) : null}

      {data && data.total_pages > 1 ? (
        <Pagination
          page={page}
          pageCount={data.total_pages}
          total={data.count}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          className="px-1"
        />
      ) : null}
    </div>
  );
}

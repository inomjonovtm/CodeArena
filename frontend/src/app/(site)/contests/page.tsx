"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, ListChecks, Lock, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/providers";
import {
  Alert,
  Block,
  Button,
  Chip,
  Empty,
  LinkButton,
  LiveDot,
  PageHead,
  Pagination,
  Pane,
  Segmented,
} from "@/components/kit";
import { Countdown } from "@/components/site/contest-bar";
import { publicApi } from "@/lib/public-api";
import type { PublicContest } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ==========================================================================
   MUSOBAQALAR — uch guruh, uch xil og'irlik
   --------------------------------------------------------------------------
   Sahifa endi bitta yaxlit jadval EMAS: musobaqalar vaqt holatiga qarab
   UCH GURUHGA bo'linadi va har biri o'z shaklida chiziladi, chunki har
   birida foydalanuvchidan kutiladigan amal boshqa:

     DAVOM ETMOQDA — yashil yuvindili karta, sanoq va "kirish" tugmasi.
                     Amal: hoziroq qatnashish.
     KUTILMOQDA    — sana plitkali qatorlar ro'yxati. Amal: ro'yxatdan
                     o'tish va kunni belgilab qo'yish.
     TUGAGAN       — ixcham jadval. Amal: natijalarni ko'rish. Bu arxiv,
                     shuning uchun eng zich shakl.

   Tepadagi segment almashtirgich guruhlardan birini yolg'iz qoldiradi —
   filtr tanlangan tab EMAS, ko'rinish rejimi.
   ========================================================================== */

type Filter = "" | "running" | "scheduled" | "finished";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "", label: "Barchasi" },
  { value: "running", label: "Jonli" },
  { value: "scheduled", label: "Kutilmoqda" },
  { value: "finished", label: "Tugagan" },
];

const MONTHS_SHORT = [
  "yan", "fev", "mar", "apr", "may", "iyn",
  "iyl", "avg", "sen", "okt", "noy", "dek",
];

const PAGE_SIZE = 10;

function timeOf(value: string) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Meta qatori: davomiylik · masala · ishtirokchi. */
function ContestMeta({ contest, className }: { contest: PublicContest; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--text-3)]", className)}>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5 text-[var(--text-4)]" />
        <span className="ts-num">{contest.duration_minutes}</span> daqiqa
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ListChecks className="size-3.5 text-[var(--text-4)]" />
        <span className="ts-num">{contest.problem_count}</span> masala
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Users className="size-3.5 text-[var(--text-4)]" />
        <span className="ts-num">{contest.participant_count}</span>
      </span>
      {contest.is_rated ? <Chip tone="brand">reytingli</Chip> : null}
    </span>
  );
}

/* --------------------------------------------------------------------------
   JONLI musobaqa — yashil yuvindili karta. Sahifadagi yagona rangli blok.
   -------------------------------------------------------------------------- */
function LiveCard({ contest }: { contest: PublicContest }) {
  return (
    <div className="wash flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[var(--radius-lg)] p-5">
      <div className="min-w-0 flex-1">
        <p className="ts-label flex items-center gap-2 text-[var(--green-text)]">
          <LiveDot />
          Hozir davom etmoqda
        </p>
        <h2 className="ts-h3 mt-2 text-[var(--text)]">
          <Link href={`/contests/${contest.slug}`} className="ring-focus rounded-[4px]">
            {contest.title_uz}
          </Link>
        </h2>
        <ContestMeta contest={contest} className="mt-2" />
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <div className="text-right">
          <p className="ts-label">Tugashiga</p>
          <Countdown
            target={contest.end_time}
            className="ts-num mt-0.5 block text-[22px] leading-none font-semibold text-[var(--green-text)]"
          />
        </div>
        <LinkButton
          href={`/contests/${contest.slug}`}
          variant="primary"
          size="md"
          iconAfter={<ArrowRight className="size-4" />}
        >
          Kirish
        </LinkButton>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   KUTILAYOTGAN musobaqa — sana plitkasi + nom + amal.
   -------------------------------------------------------------------------- */
function UpcomingRow({ contest, last }: { contest: PublicContest; last: boolean }) {
  const date = new Date(contest.start_time);

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4",
        !last && "border-b border-[var(--line-soft)]",
      )}
    >
      {/* Sana plitkasi — kalendar varag'i kabi */}
      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-sunk)]">
        <span className="ts-num text-[16px] leading-none font-semibold text-[var(--text)]">
          {date.getDate()}
        </span>
        <span className="mt-0.5 text-[10px] font-medium tracking-[0.04em] text-[var(--text-4)] uppercase">
          {MONTHS_SHORT[date.getMonth()]}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/contests/${contest.slug}`}
          className="ring-focus rounded-[4px] text-[15px] font-medium text-[var(--text)] transition-colors hover:text-[var(--green-text)]"
        >
          {contest.title_uz}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="ts-num text-[13px] text-[var(--text-3)]">
            {timeOf(contest.start_time)} da boshlanadi
          </span>
          <ContestMeta contest={contest} />
        </div>
      </div>

      <LinkButton href={`/contests/${contest.slug}`} variant="quiet" size="sm">
        Ro&apos;yxatdan o&apos;tish
      </LinkButton>
    </li>
  );
}

/* --------------------------------------------------------------------------
   TUGAGAN musobaqalar — ixcham jadval (arxiv).
   -------------------------------------------------------------------------- */
function PastTable({ contests }: { contests: PublicContest[] }) {
  return (
    <div className="table-scroll px-2">
      <table className="grid-table">
        <thead>
          <tr>
            <th className="w-24" scope="col">Sana</th>
            <th scope="col">Musobaqa</th>
            <th className="col-num w-24" scope="col">Masala</th>
            <th className="col-num w-28" scope="col">Ishtirokchi</th>
            <th className="w-32 text-right" scope="col">
              <span className="sr-only">Natijalar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {contests.map((contest) => {
            const date = new Date(contest.start_time);
            return (
              <tr key={contest.id}>
                <td className="ts-num w-24 text-[13px] whitespace-nowrap text-[var(--text-4)]">
                  {date.getDate()} {MONTHS_SHORT[date.getMonth()]}
                </td>
                <td>
                  <Link
                    href={`/contests/${contest.slug}`}
                    className="ring-focus rounded-[4px] text-[14px] font-medium text-[var(--text-2)] transition-colors hover:text-[var(--green-text)]"
                  >
                    {contest.title_uz}
                  </Link>
                  {contest.is_rated ? (
                    <Chip tone="neutral" className="ml-2">reytingli</Chip>
                  ) : null}
                </td>
                <td className="col-num w-24 text-[13px] text-[var(--text-3)]">
                  {contest.problem_count}
                </td>
                <td className="col-num w-28 text-[13px] text-[var(--text-3)]">
                  {contest.participant_count}
                </td>
                <td className="w-32 text-right">
                  <LinkButton
                    href={`/contests/${contest.slug}?tab=standings`}
                    variant="ghost"
                    size="sm"
                    icon={<Trophy className="size-3.5" />}
                  >
                    Natijalar
                  </LinkButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Skelet — guruhlangan tartibni takrorlaydi. */
function ContestsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Block className="h-28 rounded-[var(--radius-lg)]" />
      <Pane inset="none">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4">
            <Block className="size-12 rounded-[var(--radius-sm)]" />
            <div className="min-w-0 flex-1">
              <Block className="h-4 w-1/3" />
              <Block className="mt-2 h-3 w-1/2" />
            </div>
            <Block className="h-9 w-32 rounded-[var(--radius-md)]" />
          </div>
        ))}
      </Pane>
    </div>
  );
}

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

  const running = rows.filter((row) => row.computed_status === "running");
  const upcoming = rows.filter((row) => row.computed_status === "scheduled");
  const past = rows.filter(
    (row) => row.computed_status !== "running" && row.computed_status !== "scheduled",
  );

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="Musobaqalar"
        lead="Belgilangan vaqtda boshlanadigan bellashuvlar. Natijalar reytingingizga ta'sir qiladi."
        actions={
          <Segmented value={filter} items={FILTERS} onChange={changeFilter} size="sm" />
        }
        meta={
          <span className="text-[var(--text-3)]">
            Jami{" "}
            <span className="ts-num font-semibold text-[var(--text)]">{data?.count ?? "—"}</span>{" "}
            musobaqa
          </span>
        }
      />

      {/* ------------------------------------------- mening natijalarim */}
      {user && mine?.length ? (
        <div className="scroll-hidden fade-x -mx-1 overflow-x-auto px-1">
          <ul className="flex gap-2.5">
            {mine.slice(0, 8).map((row) => (
              <li key={row.contest_slug} className="shrink-0">
                <Link
                  href={`/contests/${row.contest_slug}`}
                  className="card-link ring-focus flex w-56 flex-col gap-1 p-3.5"
                >
                  <span className="truncate text-[13px] font-medium text-[var(--text)]">
                    {row.title_uz}
                  </span>
                  <span className="ts-num flex items-center gap-2 text-[12px] text-[var(--text-3)]">
                    {row.rank ? `#${row.rank}` : "—"} · {row.score} ball
                    {row.rating_change ? (
                      <span
                        className={cn(
                          "font-semibold",
                          row.rating_change > 0
                            ? "text-[var(--green-text)]"
                            : "text-[var(--text)]",
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
      ) : null}

      {/* ------------------------------------------------------ kontent */}
      {isLoading ? (
        <ContestsSkeleton />
      ) : isError ? (
        <Alert
          tone="bad"
          title="Musobaqalarni yuklab bo'lmadi"
          action={
            <Button size="sm" onClick={() => void refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Tarmoqda uzilish bo&apos;ldi. Qayta urinib ko&apos;ring.
        </Alert>
      ) : rows.length === 0 ? (
        <Empty
          icon={<Trophy className="size-6" />}
          title="Musobaqa topilmadi"
          description={
            filter ? "Boshqa holatni tanlab ko'ring." : "Hozircha e'lon qilingan musobaqa yo'q."
          }
        />
      ) : (
        <>
          {running.map((contest) => (
            <LiveCard key={contest.id} contest={contest} />
          ))}

          {upcoming.length ? (
            <section>
              <p className="ts-label mb-2">Kutilmoqda</p>
              <Pane inset="none">
                <ul>
                  {upcoming.map((contest, index) => (
                    <UpcomingRow
                      key={contest.id}
                      contest={contest}
                      last={index === upcoming.length - 1}
                    />
                  ))}
                </ul>
              </Pane>
            </section>
          ) : null}

          {past.length ? (
            <section>
              <p className="ts-label mb-2">Tugagan</p>
              <Pane inset="none" className="overflow-hidden pt-3">
                <PastTable contests={past} />
              </Pane>
            </section>
          ) : null}
        </>
      )}

      {!user ? (
        <Alert
          tone="info"
          action={
            <LinkButton href="/login" size="sm" icon={<Lock className="size-4" />}>
              Kirish
            </LinkButton>
          }
        >
          Musobaqada qatnashish uchun hisobingizga kiring — natijalar reytingingizga
          qo&apos;shiladi.
        </Alert>
      ) : null}

      {data && data.total_pages > 1 ? (
        <Pagination
          page={page}
          pageCount={data.total_pages}
          total={data.count}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      ) : null}
    </div>
  );
}

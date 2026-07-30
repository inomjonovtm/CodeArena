"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Alert,
  Block,
  Button,
  Empty,
  PageHead,
  Pagination,
  Pane,
  SearchField,
  Segmented,
} from "@/components/kit";
import { useAuth } from "@/components/providers";
import { RankAvatar, RankBadge, RankLadder } from "@/components/site/rank";
import { publicApi } from "@/lib/public-api";
import type { LeaderboardRow } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const PERIODS = [
  { value: "all", label: "Butun davr" },
  { value: "month", label: "Oy" },
  { value: "week", label: "Hafta" },
] as const;

const SORTS = [
  { value: "points", label: "Ball" },
  { value: "rating", label: "Reyting" },
] as const;

type Period = (typeof PERIODS)[number]["value"];
type Sort = (typeof SORTS)[number]["value"];

const PAGE_SIZE = 20;

/* Podium medallari — rang yagona signal emas, o'rin raqami ham turadi.
   To'ldirma qat'iy (shaffof emas): sirt ostidagi fon bilan aralashmasin. */
const MEDALS: Record<number, { ink: string; fill: string }> = {
  1: { ink: "#8a5a0f", fill: "#f7eedd" },
  2: { ink: "#4b5563", fill: "#eef0f3" },
  3: { ink: "#8d4c1f", fill: "#f6e9df" },
};

/* Jadval ustunlari — sarlavha va qatorlar bir xil to'rda turadi */
const ROW_GRID =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_5rem] items-center gap-3 sm:grid-cols-[3rem_minmax(0,1fr)_5.5rem_5.5rem_5.5rem]";

function StandingsRow({
  row,
  me,
  sort,
}: {
  row: LeaderboardRow;
  me: boolean;
  sort: Sort;
}) {
  return (
    <Link
      href={`/u/${row.username}`}
      className={cn(
        ROW_GRID,
        "row-mark focus-ring px-4 py-2.5 transition-colors hover:bg-[var(--pane-hover)] sm:px-5",
        me && "bg-[var(--brand-wash)]",
      )}
      data-active={me ? "true" : undefined}
    >
      <span
        className={cn(
          "t-num text-[13px] font-semibold",
          row.position <= 3 ? "text-[var(--ink)]" : "text-[var(--ink-4)]",
        )}
      >
        {row.position}
      </span>

      <span className="flex min-w-0 items-center gap-3">
        <RankAvatar src={row.avatar_url} name={row.full_name || row.username} size={36} rank={row.rank} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[14px] font-medium text-[var(--ink)]">
              {row.username}
            </span>
            {me ? (
              <span className="shrink-0 text-[11px] font-semibold text-[var(--brand-ink)]">siz</span>
            ) : null}
            <RankBadge rank={row.rank} size="xs" className="hidden md:inline-flex" />
          </span>
          {row.full_name ? (
            <span className="t-meta block truncate text-[var(--ink-4)]">{row.full_name}</span>
          ) : null}
        </span>
      </span>

      <span className="t-num hidden text-right text-[13.5px] text-[var(--ink-3)] sm:block">
        {row.problems_solved}
      </span>
      <span
        className={cn(
          "t-num hidden text-right text-[13.5px] sm:block",
          sort === "rating" ? "font-semibold text-[var(--brand-ink)]" : "text-[var(--ink-3)]",
        )}
      >
        {row.rating}
      </span>
      <span
        className={cn(
          "t-num text-right text-[13.5px]",
          sort === "points" ? "font-semibold text-[var(--brand-ink)]" : "text-[var(--ink-3)]",
        )}
      >
        {formatNumber(row.total_points)}
      </span>
    </Link>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("all");
  const [sort, setSort] = useState<Sort>("points");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  // Har bir harf uchun so'rov yubormaslik uchun kichik kechikish
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-leaderboard", period, sort, page, query],
    queryFn: () =>
      publicApi.leaderboard({
        period,
        sort,
        page,
        page_size: PAGE_SIZE,
        ...(query ? { q: query } : {}),
      }),
    placeholderData: (previous) => previous,
  });

  const rows = data?.results ?? [];

  // Filtr o'zgarsa birinchi sahifaga qaytamiz — aks holda 5-sahifada
  // bo'sh ro'yxat ko'rinib qolardi.
  const changePeriod = (next: Period) => {
    setPeriod(next);
    setPage(1);
  };
  const changeSort = (next: Sort) => {
    setSort(next);
    setPage(1);
  };

  const { data: myRank } = useQuery({
    queryKey: ["my-rank", sort],
    queryFn: () => publicApi.myRank(sort),
    enabled: Boolean(user),
  });

  // Foydalanuvchi ro'yxatning ko'rinadigan qismida bo'lsa, alohida qator shart emas
  const inTopList = Boolean(user && rows.some((row) => row.username === user.username));

  // Podium faqat toza birinchi sahifada — qidiruv yoki sahifalashda oddiy jadval
  const showPodium = page === 1 && !query && rows.length >= 3;
  const podium = showPodium ? rows.slice(0, 3) : [];
  const tableRows = showPodium ? rows.slice(3) : rows;

  return (
    <div className="flex flex-col gap-7">
      {/* --------------------------------------------- 1. sahifa sarlavhasi */}
      <PageHead
        eyebrow="Hamjamiyat"
        title="Reyting"
        lead="Eng ko'p ball to'plagan va eng yuqori reytingga ega ishtirokchilar."
        meta={
          data ? (
            <p className="t-meta text-[var(--ink-4)]">
              Jami <span className="t-num text-[var(--ink-2)]">{formatNumber(data.count)}</span> ishtirokchi
            </p>
          ) : null
        }
      />

      {/* ------------------------------------------------- 2. asboblar paneli */}
      <Pane className="enter" inset="md">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            value={search}
            onValueChange={setSearch}
            placeholder="Username bo'yicha qidirish..."
            className="min-w-56 flex-1 sm:max-w-xs"
          />
          <Segmented value={period} items={[...PERIODS]} onChange={changePeriod} size="sm" />
          <Segmented value={sort} items={[...SORTS]} onChange={changeSort} size="sm" />
        </div>

        {query ? (
          <p className="t-meta mt-4 border-t border-[var(--edge)] pt-4 text-[var(--ink-3)]">
            «{query}» bo&apos;yicha{" "}
            <span className="t-num text-[var(--ink)]">{formatNumber(data?.count ?? 0)}</span> ta natija
          </p>
        ) : null}
      </Pane>

      {/* -------------------------------------------------- 3. ranklar zinasi */}
      <RankLadder />

      {isLoading ? (
        /* Skelet — haqiqiy jadval qatorlarini takrorlaydi */
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <div className="divide-y divide-[var(--edge-soft)]">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className={cn(ROW_GRID, "px-4 py-3 sm:px-5")}>
                <Block className="h-3.5 w-6" />
                <div className="flex items-center gap-3">
                  <Block className="size-9 shrink-0 rounded-full" />
                  <Block className="h-3.5 w-32" />
                </div>
                <Block className="ml-auto h-3.5 w-10" />
              </div>
            ))}
          </div>
        </Pane>
      ) : isError ? (
        <Alert
          tone="bad"
          title="Reytingni yuklab bo'lmadi"
          action={
            <Button size="sm" onClick={() => refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Tarmoqni tekshirib, qayta urinib ko&apos;ring.
        </Alert>
      ) : rows.length === 0 ? (
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            icon={<Trophy className="size-5" />}
            title={query ? "Hech kim topilmadi" : "Hozircha bo'sh"}
            description={
              query
                ? `«${query}» so'roviga mos ishtirokchi yo'q.`
                : "Tanlangan davrda faol ishtirokchi topilmadi."
            }
          />
        </Pane>
      ) : (
        <>
          {/* --------------------------------------------- 4. top-3: podium
              Alohida karta: uchta yetakchi jadvaldan ajralib turadi. */}
          {showPodium ? (
            <Pane
              tone="solid"
              inset="none"
              className="enter grid divide-y divide-[var(--edge)] overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-y-0"
            >
              {podium.map((row) => {
                const medal = MEDALS[row.position];
                return (
                  <Link
                    key={row.username}
                    href={`/u/${row.username}`}
                    className="focus-ring flex items-center gap-3 px-4 py-5 transition-colors hover:bg-[var(--pane-hover)] sm:px-5"
                  >
                    <span
                      className="t-num flex size-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold"
                      style={{ color: medal.ink, backgroundColor: medal.fill }}
                    >
                      {row.position}
                    </span>
                    <RankAvatar
                      src={row.avatar_url}
                      name={row.full_name || row.username}
                      size={40}
                      rank={row.rank}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-[var(--ink)]">
                        {row.username}
                      </span>
                      <RankBadge rank={row.rank} size="xs" className="mt-0.5" />
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="t-num block text-[15px] font-semibold text-[var(--ink)]">
                        {formatNumber(sort === "rating" ? row.rating : row.total_points)}
                      </span>
                      <span className="t-meta text-[var(--ink-4)]">
                        {sort === "rating" ? "reyting" : "ball"}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </Pane>
          ) : null}

          {/* ----------------------------------------------- 5. asosiy jadval */}
          <Pane tone="solid" inset="none" className="overflow-hidden">
            <div className={cn(ROW_GRID, "t-eyebrow border-b border-[var(--edge)] px-4 py-2.5 sm:px-5")}>
              <span>#</span>
              <span>Ishtirokchi</span>
              <span className="hidden text-right sm:block">Yechildi</span>
              <span className="hidden text-right sm:block">Reyting</span>
              <span className="text-right">Ball</span>
            </div>

            <div className="enter-stagger divide-y divide-[var(--edge-soft)]">
              {tableRows.map((row) => (
                <StandingsRow
                  key={row.username}
                  row={row}
                  me={user?.username === row.username}
                  sort={sort}
                />
              ))}
            </div>

            {/* ----------------------------- o'z o'rningiz — pastga yopishgan */}
            {/* Mobilda pastda `MobileTabBar` turadi — yopishqoq qator uning
                ostida qolib ketmasligi uchun shuncha ko'tariladi. */}
            {myRank && !inTopList ? (
              <div className="edge-brand sticky bottom-[var(--tabbar)] border-t border-[var(--edge)] bg-[var(--pane-solid)] lg:bottom-0">
                <Link
                  href={`/u/${myRank.username}`}
                  className={cn(ROW_GRID, "focus-ring bg-[var(--brand-wash)] px-4 py-3 sm:px-5")}
                >
                  <span className="t-num text-[13px] font-semibold text-[var(--brand-ink)]">
                    {myRank.position}
                  </span>
                  <span className="flex min-w-0 items-center gap-3">
                    <RankAvatar
                      src={myRank.avatar_url}
                      name={myRank.full_name || myRank.username}
                      size={36}
                      rank={myRank.rank}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium text-[var(--ink)]">
                          {myRank.username}
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-[var(--brand-ink)]">
                          siz
                        </span>
                      </span>
                      <span className="t-meta block truncate text-[var(--ink-4)]">
                        {formatNumber(myRank.total)} ishtirokchi orasida
                      </span>
                    </span>
                  </span>
                  <span className="t-num hidden text-right text-[13.5px] text-[var(--ink-3)] sm:block">
                    {myRank.problems_solved}
                  </span>
                  <span className="t-num hidden text-right text-[13.5px] text-[var(--ink-3)] sm:block">
                    {myRank.rating}
                  </span>
                  <span className="t-num text-right text-[13.5px] font-semibold text-[var(--brand-ink)]">
                    {formatNumber(myRank.total_points)}
                  </span>
                </Link>
              </div>
            ) : null}
          </Pane>
        </>
      )}

      {/* -------------------------------------------------- 6. sahifalash
          Kartasiz: sahifalash ro'yxatning davomi, alohida blok emas
          (boshqa ro'yxat sahifalari bilan bir xil). */}
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

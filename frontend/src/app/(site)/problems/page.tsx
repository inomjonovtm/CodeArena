"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpDown,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Check,
  Flame,
  ListChecks,
  Shuffle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/providers";
import {
  Alert,
  Block,
  Button,
  Chip,
  ChipRail,
  DifficultyMark,
  Divider,
  Empty,
  LinkButton,
  MenuItem,
  Meter,
  PageHead,
  Pagination,
  Pane,
  Popover,
  SearchField,
  Segmented,
  SplitLayout,
} from "@/components/kit";
import { publicApi } from "@/lib/public-api";
import type { Difficulty, PublicProblemListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

type StatusFilter = "" | "todo" | "attempted" | "solved" | "bookmarked";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "Hammasi" },
  { value: "todo", label: "Yechilmagan" },
  { value: "attempted", label: "Urinilgan" },
  { value: "solved", label: "Yechilgan" },
  { value: "bookmarked", label: "Saqlangan" },
];

const SORTS: { value: string; label: string }[] = [
  { value: "-created_at", label: "Yangilari" },
  { value: "created_at", label: "Eskilari" },
  { value: "points", label: "Ball: kamdan" },
  { value: "-points", label: "Ball: ko'pdan" },
  { value: "-total_submissions", label: "Ommabop" },
  { value: "title_uz", label: "Nomi bo'yicha" },
];

/* Qator va sarlavha bir xil ustun o'lchamlarini bo'lishadi */
const COL_ACCEPT = "hidden w-14 text-right sm:block";
const COL_POINTS = "hidden w-12 text-right md:block";
const COL_DIFF = "w-21 shrink-0";
const COL_MARK = "w-7 shrink-0";
const COL_SAVE = "w-8 shrink-0";

/** Ro'yxat skeleti — haqiqiy qator tartibini takrorlaydi. */
function RowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--edge-soft)]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <span className={cn(COL_MARK, "flex justify-center")}>
            <Block className="size-2 rounded-full" />
          </span>
          <Block className="h-3.5 w-1/3" />
          <Block className={cn(COL_ACCEPT, "ml-auto h-3")} />
          <Block className={cn(COL_POINTS, "h-3")} />
          <Block className={cn(COL_DIFF, "h-3.5")} />
          <span className={COL_SAVE} aria-hidden />
        </div>
      ))}
    </div>
  );
}

/** Saralash menyusi — kit tugmasi + suzuvchi ro'yxat. */
function SortMenu({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [open, setOpen] = useState(false);
  // Popover tashqi bosishda yopiladi; tugma bosilganda qayta ochilib
  // ketmasligi uchun mousedown paytidagi holatni eslab qolamiz
  const wasOpenRef = useRef(false);
  const current = SORTS.find((item) => item.value === value);

  return (
    <div className="relative">
      <Button
        variant="quiet"
        icon={<ArrowUpDown className="size-4 text-[var(--ink-4)]" />}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={() => {
          wasOpenRef.current = open;
        }}
        onClick={() => setOpen(!wasOpenRef.current)}
      >
        {current?.label ?? "Saralash"}
      </Button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {SORTS.map((item) => (
          <MenuItem
            key={item.value}
            icon={
              item.value === value ? (
                <Check className="size-4 text-[var(--brand)]" />
              ) : (
                <span className="block size-4" />
              )
            }
            onClick={() => {
              onChange(item.value);
              setOpen(false);
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Popover>
    </div>
  );
}

/** Faol filtr chipi — bosilsa olib tashlanadi. */
function FilterChip({ label, onClear }: { label: React.ReactNode; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--r-chip)] border px-2.5 py-1",
        "border-[var(--brand-edge)] bg-[var(--brand-wash)] text-[12px] font-medium text-[var(--brand-ink)]",
        "transition-colors duration-[var(--t-fast)] hover:bg-[var(--brand-wash-strong)] focus-ring",
      )}
    >
      {label}
      <X className="size-3" />
    </button>
  );
}

/** Bitta masala qatori — nuqta/belgi, nom, qiyinlik, qabul va saqlash. */
function ProblemRow({
  problem,
  onToggleBookmark,
  authenticated,
}: {
  problem: PublicProblemListItem;
  onToggleBookmark: (slug: string) => void;
  authenticated: boolean;
}) {
  return (
    <div className="group row-mark relative flex items-center gap-3 px-4 py-3 transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)] sm:px-5">
      {/* Holat: yechilgan — belgi, urinilgan — to'q nuqta, qolgani — bo'sh halqa */}
      <span className={cn(COL_MARK, "flex justify-center")} aria-hidden>
        {problem.is_solved ? (
          <Check className="size-4 text-[var(--ok)]" strokeWidth={3} />
        ) : problem.is_attempted ? (
          <span className="size-2 rounded-full bg-[var(--warn)]" />
        ) : (
          <span className="size-2 rounded-full border-[1.5px] border-[var(--edge-strong)]" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <Link href={`/problems/${problem.slug}`} className="focus-ring rounded-[6px]">
          <span className="absolute inset-0" aria-hidden />
          <span className="block truncate text-[13.5px] font-medium text-[var(--ink)] transition-colors group-hover:text-[var(--brand)]">
            {problem.title_uz}
          </span>
        </Link>
        {problem.tags.length ? (
          <p className="t-meta mt-0.5 truncate text-[var(--ink-4)]">
            {problem.tags.slice(0, 3).map((item) => item.name_uz).join(" · ")}
            {problem.tags.length > 3 ? ` · +${problem.tags.length - 3}` : ""}
          </p>
        ) : null}
      </div>

      <span className={cn(COL_ACCEPT, "t-num text-[12.5px] text-[var(--ink-3)]")}>
        {Math.round(problem.acceptance_rate)}%
      </span>
      <span className={cn(COL_POINTS, "t-num text-[12.5px] text-[var(--ink-3)]")}>
        {problem.points}
      </span>

      <span className={COL_DIFF}>
        <DifficultyMark value={problem.difficulty} label={DIFF_LABEL[problem.difficulty]} />
      </span>

      <span className={cn(COL_SAVE, "flex justify-center")}>
        {authenticated ? (
          <button
            type="button"
            aria-label={
              problem.is_bookmarked ? "Saqlanganlardan olib tashlash" : "Saqlanganlarga qo'shish"
            }
            title={problem.is_bookmarked ? "Saqlanganlardan olib tashlash" : "Saqlanganlarga qo'shish"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleBookmark(problem.slug);
            }}
            className={cn(
              "relative z-10 flex size-8 items-center justify-center rounded-[var(--r-ctl)] focus-ring",
              "transition-[opacity,background-color,color] duration-[var(--t-fast)]",
              problem.is_bookmarked
                ? "text-[var(--brand)] hover:bg-[var(--brand-wash)]"
                : cn(
                    "text-[var(--ink-4)] hover:bg-[var(--canvas-deep)] hover:text-[var(--ink-2)]",
                    // Saqlash tugmasi faqat hoverda ko'rinadi; sensor ekranda doim
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
                  ),
            )}
          >
            {problem.is_bookmarked ? (
              <BookmarkCheck className="size-4" />
            ) : (
              <Bookmark className="size-4" />
            )}
          </button>
        ) : null}
      </span>
    </div>
  );
}

function ProblemsInner() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const urlParams = useSearchParams();

  // Boshlang'ich filtrlar manzildan olinadi: `/problems?tag=graph&difficulty=hard`
  const [searchDraft, setSearchDraft] = useState(() => urlParams.get("search") ?? "");
  const [search, setSearch] = useState(() => urlParams.get("search") ?? "");
  const [difficulty, setDifficulty] = useState(() => urlParams.get("difficulty") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    () => (urlParams.get("status") as StatusFilter) ?? "",
  );
  const [tag, setTag] = useState(() => urlParams.get("tag") ?? "");
  const [ordering, setOrdering] = useState(() => urlParams.get("ordering") ?? "-created_at");
  const [page, setPage] = useState(() => Math.max(1, Number(urlParams.get("page")) || 1));

  // Qidiruvni kechiktiramiz — har harfda so'rov ketmasin
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  /* Filtrlar manzilga yoziladi.
     Ilgari ular faqat O'QILARDI: tanlangan teg yoki qiyinlikni ulashib
     bo'lmasdi, brauzerning "orqaga" tugmasi esa ro'yxatni tiklamasdi.
     `replace` ishlatiladi — har bir chip bosilishi tarixga yangi yozuv
     qo'shmasligi kerak. */
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (difficulty) next.set("difficulty", difficulty);
    if (tag) next.set("tag", tag);
    if (statusFilter) next.set("status", statusFilter);
    if (ordering !== "-created_at") next.set("ordering", ordering);
    if (page > 1) next.set("page", String(page));

    const query = next.toString();
    const target = query ? `/problems?${query}` : "/problems";
    if (`${window.location.pathname}${window.location.search}` !== target) {
      router.replace(target, { scroll: false });
    }
  }, [search, difficulty, tag, statusFilter, ordering, page, router]);

  // Kirmagan foydalanuvchida shaxsiy filtrlar mantiqsiz
  useEffect(() => {
    if (!user && statusFilter) setStatusFilter("");
  }, [user, statusFilter]);

  const params = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      ordering,
      ...(search ? { search } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(tag ? { tag } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [page, ordering, search, difficulty, tag, statusFilter],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-problems", params],
    queryFn: () => publicApi.problems.list(params),
    placeholderData: (previous) => previous,
  });

  const { data: tags } = useQuery({
    queryKey: ["public-tags"],
    queryFn: () => publicApi.tags(),
    staleTime: 10 * 60_000,
  });

  const { data: daily } = useQuery({
    queryKey: ["public-daily", 7],
    queryFn: () => publicApi.dailyChallenge(7),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const { data: progress } = useQuery({
    queryKey: ["my-progress"],
    queryFn: () => publicApi.progress(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const bookmarkMutation = useMutation({
    mutationFn: (slug: string) => publicApi.problems.toggleBookmark(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["public-problems"] });
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const hasFilters = Boolean(search || difficulty || tag || statusFilter);
  const rows = data?.results ?? [];

  const resetFilters = () => {
    setSearchDraft("");
    setSearch("");
    setDifficulty("");
    setTag("");
    setStatusFilter("");
    setOrdering("-created_at");
    setPage(1);
  };

  // Tasodifiy masala — joriy sahifadagi ro'yxatdan tanlanadi
  const randomPick = () => {
    if (!rows.length) return;
    const target = rows[Math.floor(Math.random() * rows.length)];
    router.push(`/problems/${target.slug}`);
  };

  const solvedTotal = progress ? progress.total_solved : 0;
  const problemsTotal = progress ? progress.total_problems : 0;
  const activeTagName = tags?.find((item) => item.slug === tag)?.name_uz ?? tag;

  return (
    <div className="flex flex-col gap-7">
      {/* --------------------------------------------- 1. sahifa sarlavhasi */}
      <PageHead
        eyebrow="Katalog"
        title="Masalalar"
        lead="Qiyinlik yoki mavzu bo'yicha tanlang va yechishni boshlang."
        actions={
          <LinkButton
            href="/daily"
            icon={<CalendarDays className="size-4 text-[var(--brand)]" />}
          >
            Kunlik masala
          </LinkButton>
        }
        meta={
          <>
            <Chip tone="neutral">
              Jami <span className="t-num font-semibold">{data?.count ?? "—"}</span> ta masala
            </Chip>
            {user && progress ? (
              <>
                <Meter
                  value={solvedTotal}
                  max={problemsTotal}
                  label={
                    <>
                      Yechilgan: <span className="t-num">{solvedTotal}</span> /{" "}
                      <span className="t-num">{problemsTotal}</span>
                    </>
                  }
                  tone="ok"
                  className="w-56"
                />
                <Chip tone="warn" icon={<Flame className="size-3.5" />}>
                  <span className="t-num">{progress.current_streak}</span> kun seriya
                </Chip>
              </>
            ) : null}
          </>
        }
      />

      <SplitLayout
        className="gap-5"
        aside={
          <div className="enter flex flex-col gap-5">
            {/* ------------------------------------------------ shaxsiy jarayon */}
            {user && progress ? (
              <Pane inset="md">
                <p className="t-eyebrow">Mening jarayonim</p>
                <Meter value={solvedTotal} max={problemsTotal} label="Umumiy" tone="ok" className="mt-4" />
                <div className="mt-5 flex flex-col gap-3">
                  {(Object.keys(DIFF_LABEL) as Difficulty[]).map((level) => (
                    <div key={level} className="flex items-center justify-between gap-3">
                      <DifficultyMark value={level} label={DIFF_LABEL[level]} />
                      <span className="t-num text-[12.5px] text-[var(--ink-3)]">
                        <span className="font-semibold text-[var(--ink)]">
                          {progress.solved[level] ?? 0}
                        </span>{" "}
                        / {progress.totals[level] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
                <Divider className="my-4" />
                <div className="flex items-center justify-between gap-3">
                  <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-3)]">
                    <Flame className="size-4 text-[var(--warn)]" />
                    Seriya
                  </span>
                  <span className="t-num text-[13px] font-semibold text-[var(--ink)]">
                    {progress.current_streak} kun
                  </span>
                </div>
              </Pane>
            ) : null}

            {/* ------------------------------------------------- kunlik masala
                Sahifadagi yagona to'yingan ko'k blok — asosiy chaqiriq. */}
            {daily?.problem_slug ? (
              <Link href="/daily" className="focus-ring block rounded-[var(--r-pane)]">
                <div
                  className={cn(
                    "pane-brand rounded-[var(--r-pane)] p-5",
                    "transition-colors duration-[var(--t-base)] ease-[var(--ease-soft)]",
                    "hover:bg-[var(--brand-hover)]",
                  )}
                >
                  <p className="t-eyebrow text-[var(--brand-wash)]">
                    Bugungi masala
                    {daily.bonus_points ? ` · +${daily.bonus_points} ball` : ""}
                  </p>
                  <p className="mt-2.5 truncate text-[15px] font-semibold text-[var(--ink-on-brand)]">
                    {daily.problem_title}
                  </p>
                  <div className="mt-3.5 flex items-center justify-between gap-3">
                    {daily.problem_difficulty ? (
                      <span className="text-[12.5px] font-medium text-[var(--brand-wash)]">
                        {DIFF_LABEL[daily.problem_difficulty]}
                      </span>
                    ) : (
                      <span />
                    )}
                    {daily.is_solved ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[var(--r-chip)] px-2.5 py-1",
                          "bg-[var(--ink-on-brand)] text-[12px] font-semibold text-[var(--brand-ink)]",
                        )}
                      >
                        <Check className="size-3" strokeWidth={3} />
                        Yechilgan
                      </span>
                    ) : (
                      <ArrowRight className="size-4 text-[var(--ink-on-brand)]" />
                    )}
                  </div>
                </div>
              </Link>
            ) : null}

            {!user ? (
              <Pane inset="md">
                <p className="t-meta text-[var(--ink-2)]">
                  Jarayoningizni kuzatish va masalalarni saqlash uchun hisobingizga kiring.
                </p>
                <LinkButton href="/login" size="sm" variant="brand-soft" className="mt-4 w-full">
                  Kirish
                </LinkButton>
              </Pane>
            ) : null}
          </div>
        }
      >
        <div className="flex min-w-0 flex-col gap-5">
          {/* ------------------------------------------- 2. boshqaruv paneli */}
          <Pane className="enter" inset="md">
            {/* 1-qator: qidiruv va ro'yxat boshqaruvi.
                Saralash/tasodifiy guruh `sm:ml-auto` bilan — tor ekranda
                o'ralib, o'ng chekkada yolg'iz qator bo'lib qolmaydi. */}
            <div className="flex flex-wrap items-center gap-2.5">
              <SearchField
                value={searchDraft}
                onValueChange={setSearchDraft}
                placeholder="Masala nomi bo'yicha..."
                className="min-w-56 flex-1 sm:max-w-xs"
              />
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <SortMenu
                  value={ordering}
                  onChange={(next) => {
                    setOrdering(next);
                    setPage(1);
                  }}
                />
                {/* Omadni sinash — ro'yxatdan tasodifiy masala */}
                <Button
                  variant="quiet"
                  icon={<Shuffle className="size-4 text-[var(--ink-4)]" />}
                  onClick={randomPick}
                  disabled={!rows.length}
                >
                  Tasodifiy masala
                </Button>
              </div>
            </div>

            {/* 2-qator: holat va qiyinlik — ikkalasi ham ixcham, yonma-yon sig'adi */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2.5 border-t border-[var(--edge)] pt-4">
              {user ? (
                <Segmented
                  size="sm"
                  value={statusFilter}
                  items={STATUS_FILTERS}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                />
              ) : null}
              {user ? <Divider vertical className="h-5 max-sm:hidden" /> : null}
              <ChipRail
                value={difficulty ? [difficulty] : []}
                items={(Object.keys(DIFF_LABEL) as Difficulty[]).map((level) => ({
                  value: level as string,
                  label: DIFF_LABEL[level],
                }))}
                onChange={(next) => {
                  // Bitta qiyinlik tanlanadi: yangisi eskisini almashtiradi
                  setDifficulty(next.find((value) => value !== difficulty) ?? "");
                  setPage(1);
                }}
                className="shrink-0"
              />
            </div>

            {/* 3-qator: mavzular — BUTUN kenglik.
                Ilgari ular qiyinlik chiplari bilan bitta qatorni bo'lishardi
                va sig'magan teglarga (ro'yxatning yarmiga) yetib bo'lmasdi. */}
            {tags?.length ? (
              <div className="mt-3">
                <ChipRail
                  value={tag ? [tag] : []}
                  items={tags.slice(0, 24).map((item) => ({
                    value: item.slug,
                    label: item.name_uz,
                    count: item.problem_count || undefined,
                  }))}
                  onChange={(next) => {
                    // Bitta teg tanlanadi
                    setTag(next.find((value) => value !== tag) ?? "");
                    setPage(1);
                  }}
                />
              </div>
            ) : null}

            {/* ----------------------------------------------- faol filtrlar */}
            {hasFilters ? (
              <div className="enter mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--edge)] pt-4">
                {search ? (
                  <FilterChip label={`«${search}»`} onClear={() => setSearchDraft("")} />
                ) : null}
                {difficulty ? (
                  <FilterChip
                    label={DIFF_LABEL[difficulty as Difficulty] ?? difficulty}
                    onClear={() => {
                      setDifficulty("");
                      setPage(1);
                    }}
                  />
                ) : null}
                {tag ? (
                  <FilterChip
                    label={activeTagName}
                    onClear={() => {
                      setTag("");
                      setPage(1);
                    }}
                  />
                ) : null}
                {statusFilter ? (
                  <FilterChip
                    label={STATUS_FILTERS.find((item) => item.value === statusFilter)?.label}
                    onClear={() => {
                      setStatusFilter("");
                      setPage(1);
                    }}
                  />
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<X className="size-3.5" />}
                  onClick={resetFilters}
                >
                  Tozalash
                </Button>
              </div>
            ) : null}
          </Pane>

          {/* ----------------------------------------------------- 3. ro'yxat */}
          {isLoading ? (
            <Pane tone="solid" inset="none">
              <RowsSkeleton rows={8} />
            </Pane>
          ) : isError ? (
            <Alert
              tone="bad"
              title="Masalalarni yuklab bo'lmadi"
              action={
                <Button size="sm" onClick={() => refetch()}>
                  Qayta urinish
                </Button>
              }
            >
              Internet aloqasini tekshirib, qayta urinib ko&apos;ring.
            </Alert>
          ) : rows.length === 0 ? (
            /* Bo'sh holat kartaning O'ZIDA turadi — karta ichida karta yo'q */
            <Pane tone="solid" inset="none" className="overflow-hidden">
              <Empty
                icon={<ListChecks className="size-[18px]" />}
                title="Masala topilmadi"
                description={
                  hasFilters
                    ? "Filtrlarni o'zgartirib ko'ring."
                    : "Hozircha chop etilgan masala yo'q."
                }
                action={
                  hasFilters ? (
                    <Button onClick={resetFilters} icon={<X className="size-4" />}>
                      Filtrlarni tozalash
                    </Button>
                  ) : undefined
                }
              />
            </Pane>
          ) : (
            <Pane tone="solid" inset="none" className="enter">
              {/* Yopishqoq ro'yxat sarlavhasi — sayt paneli ostida qoladi.
                  Kartada `overflow-hidden` BO'LMAYDI: u kartani yopishqoq
                  elementning scroll konteyneriga aylantiradi va `top: var(--bar)`
                  oyna emas, KARTA chekkasidan hisoblanadi — sarlavha 60px pastga
                  surilib, birinchi qatorlarni bosib qolardi. Burchaklarni
                  qatorlar o'ramining o'zi qirqadi. */}
              <div
                className="sticky-edge flex items-center gap-3 rounded-t-[calc(var(--r-pane)-1px)] border-b border-[var(--edge)] px-4 py-2 sm:px-5"
                style={{ top: "var(--bar)" }}
              >
                <span className={COL_MARK} aria-hidden />
                <span className="t-eyebrow flex-1">Masala</span>
                <span className={cn(COL_ACCEPT, "t-eyebrow")}>Qabul</span>
                <span className={cn(COL_POINTS, "t-eyebrow")}>Ball</span>
                <span className={cn(COL_DIFF, "t-eyebrow")}>Qiyinlik</span>
                <span className={COL_SAVE} aria-hidden />
              </div>

              <div className="enter-stagger divide-y divide-[var(--edge-soft)] overflow-hidden rounded-b-[calc(var(--r-pane)-1px)]">
                {rows.map((problem) => (
                  <ProblemRow
                    key={problem.id}
                    problem={problem}
                    authenticated={Boolean(user)}
                    onToggleBookmark={(slug) => bookmarkMutation.mutate(slug)}
                  />
                ))}
              </div>
            </Pane>
          )}

          {/* -------------------------------------------------- 4. sahifalash
              Kartasiz: sahifalash ro'yxatning davomi, alohida blok emas. */}
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
      </SplitLayout>
    </div>
  );
}

export default function ProblemsPage() {
  return (
    <Suspense
      fallback={
        /* Skelet ham kartalar ritmini takrorlaydi */
        <div className="flex flex-col gap-5">
          <Block className="h-40 rounded-[var(--r-pane)]" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-5">
              <Block className="h-32 rounded-[var(--r-pane)]" />
              <Block className="h-[28rem] rounded-[var(--r-pane)]" />
            </div>
            <Block className="h-64 rounded-[var(--r-pane)]" />
          </div>
        </div>
      }
    >
      <ProblemsInner />
    </Suspense>
  );
}

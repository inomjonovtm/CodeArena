"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpDown,
  Bookmark,
  BookmarkCheck,
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
  DifficultyMark,
  Empty,
  FilterSelect,
  LinkButton,
  MenuItem,
  PageHead,
  Pagination,
  Pane,
  Popover,
  SearchField,
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

/* Ustun kengliklari — sarlavha va qator bitta manbadan oladi.
   Tor ustunlar `w-*` bilan qotiriladi, "Masala" ustuni esa qolgan
   bo'shliqni to'liq egallaydi: uzun sarlavhalar shu yerda nafas oladi. */
const COL_NO = "w-14";
const COL_DIFF = "w-32";
const COL_ACCEPT = "w-24";
const COL_POINTS = "w-20";
const COL_SAVE = "w-12";

/** Jadval skeleti — haqiqiy ustun tartibini takrorlaydi. */
function RowsSkeleton({ rows = 8, authenticated }: { rows?: number; authenticated: boolean }) {
  return (
    <table className="grid-table">
      <tbody>
        {Array.from({ length: rows }).map((_, index) => (
          <tr key={index}>
            <td className={COL_NO}>
              <Block className="size-7 rounded-full" />
            </td>
            <td>
              <Block className="h-3.5 w-1/3" />
            </td>
            <td className={COL_DIFF}>
              <Block className="h-3.5 w-16" />
            </td>
            <td className={COL_ACCEPT}>
              <Block className="ml-auto h-3 w-10" />
            </td>
            <td className={COL_POINTS}>
              <Block className="ml-auto h-3 w-8" />
            </td>
            {authenticated ? <td className={COL_SAVE} /> : null}
          </tr>
        ))}
      </tbody>
    </table>
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
        icon={<ArrowUpDown className="size-4 text-[var(--text-4)]" />}
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
                <Check className="size-4 text-[var(--green)]" />
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

/* ==========================================================================
   MASALALAR JADVALI
   --------------------------------------------------------------------------
   Ilgari ro'yxat erkin qatorlardan iborat edi: qabul foizi, ball va
   qiyinlik qatorning o'ng chetiga "yopishtirilgan" bo'lib, ustun sarlavhasi
   yo'q edi — foydalanuvchi 63% nimani anglatishini faqat taxmin qilardi.

   Endi bu HAQIQIY jadval: har bir ustun atalgan, raqamlar o'ngdan
   tekislangan va `tabular-nums` bilan tik turadi. Ko'z ustun bo'ylab
   pastga yugurib, eng arzon yoki eng ko'p qabul qilingan masalani darhol
   topadi.

   Birinchi ustun — TARTIB RAQAMI, ustidan holat belgisi tushadi: yechilgan
   masalada raqam o'rniga yashil belgi turadi, ya'ni bitta katakda ikkita
   ma'lumot.
   ========================================================================== */
function ProblemRow({
  problem,
  index,
  onToggleBookmark,
  authenticated,
}: {
  problem: PublicProblemListItem;
  /** Sahifadagi tartib raqami (1 dan boshlanadi). */
  index: number;
  onToggleBookmark: (slug: string) => void;
  authenticated: boolean;
}) {
  return (
    <tr className="group">
      {/* Raqam yoki holat: yechilgan — yashil belgi, urinilgan — halqa */}
      <td className={COL_NO}>
        {problem.is_solved ? (
          <span
            className="grid size-7 place-items-center rounded-full bg-[var(--green)]"
            title="Yechilgan"
          >
            <Check className="size-4 text-[var(--text-on-green)]" strokeWidth={3} />
          </span>
        ) : (
          <span
            className={cn(
              "ts-num grid size-7 place-items-center rounded-full text-[13px] font-semibold",
              problem.is_attempted
                ? "bg-[var(--green-wash)] text-[var(--green-text)] ring-1 ring-[var(--green-line)] ring-inset"
                : "text-[var(--text-4)]",
            )}
            title={problem.is_attempted ? "Urinilgan" : undefined}
          >
            {index}
          </span>
        )}
      </td>

      <td className="min-w-64">
        <Link
          href={`/problems/${problem.slug}`}
          className="ring-focus block truncate rounded-[6px] text-[16px] font-medium text-[var(--text)] transition-colors group-hover:text-[var(--green)]"
        >
          {problem.title_uz}
        </Link>
        {problem.tags.length ? (
          <p className="mt-1 truncate text-[13px] text-[var(--text-4)]">
            {problem.tags.slice(0, 3).map((item) => item.name_uz).join(" · ")}
            {problem.tags.length > 3 ? ` · +${problem.tags.length - 3}` : ""}
          </p>
        ) : null}
      </td>

      <td className={COL_DIFF}>
        <DifficultyMark value={problem.difficulty} label={DIFF_LABEL[problem.difficulty]} />
      </td>

      <td className={cn(COL_ACCEPT, "col-num text-[14px] text-[var(--text-3)]")}>
        {Math.round(problem.acceptance_rate)}%
      </td>

      <td className={cn(COL_POINTS, "col-num text-[14px] font-medium text-[var(--text-2)]")}>
        {problem.points}
      </td>

      {authenticated ? (
        <td className={COL_SAVE}>
          <button
            type="button"
            aria-label={
              problem.is_bookmarked ? "Saqlanganlardan olib tashlash" : "Saqlanganlarga qo'shish"
            }
            title={problem.is_bookmarked ? "Saqlanganlardan olib tashlash" : "Saqlanganlarga qo'shish"}
            onClick={() => onToggleBookmark(problem.slug)}
            className={cn(
              "ring-focus flex size-9 items-center justify-center rounded-full",
              "transition-[opacity,background-color,color] duration-[var(--dur-1)]",
              problem.is_bookmarked
                ? "text-[var(--green)] hover:bg-[var(--surface-hover)]"
                : cn(
                    "text-[var(--text-4)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
                    // Saqlash tugmasi faqat hoverda ko'rinadi; sensor ekranda doim
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
                  ),
            )}
          >
            {problem.is_bookmarked ? (
              <BookmarkCheck className="size-[18px]" />
            ) : (
              <Bookmark className="size-[18px]" />
            )}
          </button>
        </td>
      ) : null}
    </tr>
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
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------ sahifa sarlavhasi
          Amallar sarlavha QATORIDA, ko'rsatkichlar chegarali chiplarda. */}
      <PageHead
        title="Masalalar"
        lead="Qiyinlik yoki mavzu bo'yicha tanlang va yechishni boshlang."
        actions={
          <Button
            variant="quiet"
            size="sm"
            icon={<Shuffle className="size-4" />}
            onClick={randomPick}
            disabled={!rows.length}
          >
            Tasodifiy
          </Button>
        }
        meta={
          <>
            <span className="text-[var(--text-3)]">
              Jami{" "}
              <span className="ts-num font-semibold text-[var(--text)]">{data?.count ?? "—"}</span>
            </span>
            {user && progress ? (
              <span className="text-[var(--text-3)]">
                Yechilgan{" "}
                <span className="ts-num font-semibold text-[var(--green-text)]">{solvedTotal}</span>
                <span className="ts-num text-[var(--text-4)]"> / {problemsTotal}</span>
              </span>
            ) : null}
            {user && progress ? (
              <span className="text-[var(--text-3)]">
                <Flame className="size-3.5 text-[var(--green)]" />
                <span className="ts-num font-semibold text-[var(--text)]">
                  {progress.current_streak}
                </span>
                kun seriya
              </span>
            ) : null}
          </>
        }
      />

      {/* ------------------------------------------------- bugungi masala
          Yashil lenta EMAS — oq karta, chapida yashil qirra. Sahifadagi
          asosiy ish ro'yxat; kunlik masala unga xalaqit bermaydigan
          eslatma bo'lib turadi. */}
      {daily?.problem_slug ? (
        <Link
          href="/daily"
          className="edge-green card-link ring-focus flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5"
        >
          <span className="min-w-0 flex-1">
            <span className="ts-label block text-[var(--green-text)]">
              Bugungi masala
              {daily.bonus_points ? ` · +${daily.bonus_points} ball` : ""}
            </span>
            <span className="mt-0.5 block truncate text-[15px] font-medium text-[var(--text)]">
              {daily.problem_title}
              {daily.problem_difficulty ? (
                <span className="ml-2 text-[13px] font-normal text-[var(--text-4)]">
                  {DIFF_LABEL[daily.problem_difficulty]}
                </span>
              ) : null}
            </span>
          </span>
          {daily.is_solved ? (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--green-text)]">
              <Check className="size-4" strokeWidth={2.5} />
              Yechilgan
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--green-text)]">
              Yechish
              <ArrowRight className="size-3.5" />
            </span>
          )}
        </Link>
      ) : null}

      {/* --------------------------------------- katalog: BITTA karta ichida
          Tepada asboblar qatori (qidiruv + ochiluvchi filtrlar + saralash),
          ostida jadval, eng pastda sahifalash. Filtrlar endi chap relsda
          emas: yon panel navigatsiyani egallagani uchun ikkinchi ustun
          sahifani torlashtirardi. */}
      <Pane inset="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] p-3">
          <SearchField
            value={searchDraft}
            onValueChange={setSearchDraft}
            placeholder="Masala nomi..."
            className="w-full sm:w-60"
          />
          {user ? (
            <FilterSelect
              value={statusFilter}
              onChange={(next) => {
                setStatusFilter(next as StatusFilter);
                setPage(1);
              }}
              options={STATUS_FILTERS.filter((item) => item.value).map((item) => ({
                value: item.value,
                label: item.label,
              }))}
              allLabel="Holat: hammasi"
            />
          ) : null}
          <FilterSelect
            value={difficulty}
            onChange={(next) => {
              setDifficulty(next);
              setPage(1);
            }}
            options={(Object.keys(DIFF_LABEL) as Difficulty[]).map((level) => ({
              value: level,
              label: DIFF_LABEL[level],
            }))}
            allLabel="Qiyinlik: hammasi"
          />
          {tags?.length ? (
            <FilterSelect
              value={tag}
              onChange={(next) => {
                setTag(next);
                setPage(1);
              }}
              options={tags.map((item) => ({
                value: item.slug,
                label: item.problem_count ? `${item.name_uz} (${item.problem_count})` : item.name_uz,
              }))}
              allLabel="Mavzu: hammasi"
              searchable
            />
          ) : null}
          {hasFilters ? (
            <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={resetFilters}>
              Tozalash
            </Button>
          ) : null}
          <span className="ms-auto" />
          <SortMenu
            value={ordering}
            onChange={(next) => {
              setOrdering(next);
              setPage(1);
            }}
          />
        </div>

        {isLoading ? (
          <div className="px-2">
            <RowsSkeleton rows={8} authenticated={Boolean(user)} />
          </div>
        ) : isError ? (
          <Alert
            tone="bad"
            title="Masalalarni yuklab bo'lmadi"
            className="m-4"
            action={
              <Button size="sm" onClick={() => refetch()}>
                Qayta urinish
              </Button>
            }
          >
            Internet aloqasini tekshirib, qayta urinib ko&apos;ring.
          </Alert>
        ) : rows.length === 0 ? (
          <Empty
            icon={<ListChecks className="size-6" />}
            title="Masala topilmadi"
            compact
            description={
              hasFilters ? "Filtrlarni o'zgartirib ko'ring." : "Hozircha chop etilgan masala yo'q."
            }
            action={
              hasFilters ? (
                <Button onClick={resetFilters} icon={<X className="size-4" />}>
                  Filtrlarni tozalash
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-scroll px-2">
            <table className="grid-table">
              <thead>
                <tr>
                  <th className={COL_NO} scope="col">
                    №
                  </th>
                  <th scope="col">
                    Masala
                    {tag && activeTagName ? (
                      <span className="ml-2 font-normal normal-case tracking-normal text-[var(--text-4)]">
                        · {activeTagName}
                      </span>
                    ) : null}
                  </th>
                  <th className={COL_DIFF} scope="col">
                    Qiyinlik
                  </th>
                  <th className={cn(COL_ACCEPT, "col-num")} scope="col">
                    Qabul
                  </th>
                  <th className={cn(COL_POINTS, "col-num")} scope="col">
                    Ball
                  </th>
                  {user ? (
                    <th className={COL_SAVE} scope="col">
                      <span className="sr-only">Saqlash</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((problem, index) => (
                  <ProblemRow
                    key={problem.id}
                    problem={problem}
                    index={(page - 1) * PAGE_SIZE + index + 1}
                    authenticated={Boolean(user)}
                    onToggleBookmark={(slug) => bookmarkMutation.mutate(slug)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total_pages > 1 ? (
          <div className="border-t border-[var(--line)] px-4 py-3">
            <Pagination
              page={page}
              pageCount={data.total_pages}
              total={data.count}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </div>
        ) : null}
      </Pane>

      {!user ? (
        <Alert
          tone="info"
          action={
            <LinkButton href="/login" size="sm" variant="primary">
              Kirish
            </LinkButton>
          }
        >
          Jarayoningizni kuzatish va masalalarni saqlash uchun hisobingizga kiring.
        </Alert>
      ) : null}
    </div>
  );
}

export default function ProblemsPage() {
  return (
    <Suspense
      fallback={
        /* Skelet yangi tartibni takrorlaydi: chapda rels, o'ngda ro'yxat */
        <div className="flex flex-col gap-14">
          <Block className="h-40 rounded-[var(--radius-lg)]" />
          <div className="grid gap-12 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-16">
            <Block className="h-[26rem] rounded-[var(--radius-lg)]" />
            <Block className="h-[32rem] rounded-[var(--radius-lg)]" />
          </div>
        </div>
      }
    >
      <ProblemsInner />
    </Suspense>
  );
}

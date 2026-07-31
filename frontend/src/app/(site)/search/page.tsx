"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, Swords, Terminal, User as UserIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Block,
  Button,
  Count,
  DifficultyMark,
  Empty,
  PageHead,
  Pane,
  Segmented,
  fieldBase,
} from "@/components/kit";
import { publicApi } from "@/lib/public-api";
import type { Difficulty, SiteSearchItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type TypeFilter = "" | SiteSearchItem["type"];

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

/* Guruhlar tartibi — natijalar shu ketma-ketlikda chiqadi */
const TYPE_ORDER: SiteSearchItem["type"][] = ["problem", "contest", "user"];

const TYPE_META: Record<
  SiteSearchItem["type"],
  { label: string; icon: React.ReactNode; wash: string }
> = {
  problem: {
    label: "Masala",
    icon: <Terminal className="size-4" />,
    wash: "bg-[var(--brand-wash)] text-[var(--brand)]",
  },
  contest: {
    label: "Musobaqa",
    icon: <Swords className="size-4" />,
    wash: "bg-[var(--note-wash)] text-[var(--note)]",
  },
  user: {
    label: "Foydalanuvchi",
    icon: <UserIcon className="size-4" />,
    wash: "bg-[var(--pane-sunken)] text-[var(--ink-3)]",
  },
};

/** Natija skeleti — haqiqiy qator tartibini takrorlaydi. */
function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--edge-soft)]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
          <Block className="size-9 shrink-0 rounded-[var(--r-ctl)]" />
          <div className="min-w-0 flex-1">
            <Block className="h-3.5 w-2/5" />
            <Block className="mt-2 h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Foydalanuvchi yuzi — rasm bo'lmasa bosh harflar. */
function Face({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");

  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-wash)] text-[12px] font-semibold uppercase text-[var(--brand-ink)]">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";

  const [draft, setDraft] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [type, setType] = useState<TypeFilter>("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draft.trim()), 350);
    return () => clearTimeout(timer);
  }, [draft]);

  // Qidiruv matnini manzilda saqlaymiz — havola ulashsa bo'ladi
  useEffect(() => {
    const next = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    router.replace(next, { scroll: false });
  }, [query, router]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["site-search", query],
    queryFn: () => publicApi.search(query, 12),
    enabled: query.length >= 2,
  });

  const results = (data?.results ?? []).filter((row) => !type || row.type === type);
  const counts = data?.counts ?? {};

  // Guruhlangan ko'rinish va klaviatura uchun tekis ro'yxat
  const groups = useMemo(
    () =>
      TYPE_ORDER.map((key) => ({
        type: key,
        rows: results.filter((row) => row.type === key),
      })).filter((group) => group.rows.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, type],
  );
  const flat = useMemo(() => groups.flatMap((group) => group.rows), [groups]);

  // Natija o'zgarganda belgilangan qator boshiga qaytadi
  useEffect(() => setActive(0), [query, type, data]);

  // Belgilangan qator doim ko'rinib tursin
  useEffect(() => {
    document.getElementById(`search-hit-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!flat.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(flat.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      const hit = flat[active];
      if (hit) router.push(hit.url);
    }
  };

  let offset = 0;

  return (
    <div className="mx-auto flex w-full max-w-[var(--page-tight)] flex-col gap-7">
      {/* --------------------------------------------- 1. sahifa sarlavhasi */}
      <PageHead
        eyebrow="Buyruq markazi"
        title="Qidiruv"
        lead="Masala, musobaqa, maqola yoki foydalanuvchi — hammasi bir joyda."
      />

      {/* ------------------------------------- 2. qidiruv maydoni va turlar */}
      <Pane className="enter" inset="md">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4.5 size-5 -translate-y-1/2 text-[var(--ink-4)]" />
          <input
            autoFocus
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeys}
            placeholder="Nimani qidiryapsiz?"
            aria-label="Qidiruv"
            className={cn(
              fieldBase,
              "h-14 pl-12 text-[15.5px]",
              draft ? "pr-12" : "pr-4",
              "[&::-webkit-search-cancel-button]:hidden",
            )}
          />
          {draft ? (
            <button
              type="button"
              onClick={() => setDraft("")}
              aria-label="Tozalash"
              className={cn(
                "absolute top-1/2 right-3.5 flex size-7 -translate-y-1/2 items-center justify-center",
                "rounded-[var(--r-chip)] text-[var(--ink-4)] transition-colors",
                "hover:bg-[var(--pane-hover)] hover:text-[var(--ink-2)] focus-ring",
              )}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {/* --------------------------------------------------- tur bo'yicha */}
        {query.length >= 2 && data ? (
          <Segmented
            size="sm"
            className="mt-4"
            value={type}
            onChange={setType}
            items={[
              { value: "" as TypeFilter, label: "Hammasi", count: data.results.length },
              ...TYPE_ORDER.filter((key) => counts[key]).map((key) => ({
                value: key as TypeFilter,
                label: TYPE_META[key].label,
                count: counts[key],
              })),
            ]}
          />
        ) : null}

        {/* Klaviatura bilan ishlash eslatmasi */}
        {flat.length ? (
          <p className="t-meta mt-4 border-t border-[var(--edge)] pt-4 text-[var(--ink-4)]">
            <kbd className="rounded-[6px] bg-[var(--pane-sunken)] px-1.5 py-0.5 font-sans text-[11px] font-medium">↑↓</kbd>{" "}
            tanlash ·{" "}
            <kbd className="rounded-[6px] bg-[var(--pane-sunken)] px-1.5 py-0.5 font-sans text-[11px] font-medium">Enter</kbd>{" "}
            o&apos;tish
          </p>
        ) : null}
      </Pane>

      {/* -------------------------------------------------- 3. natijalar */}
      {query.length < 2 ? (
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            icon={<Search className="size-5" />}
            title="Qidirishni boshlang"
            description="Kamida 2 ta harf kiriting."
          />
        </Pane>
      ) : isLoading ? (
        /* Faqat birinchi yuklashda skelet: `isFetching` fondagi yangilashda
           ham rost bo'lib, tayyor natijalarni miltillatib yuborardi. */
        <Pane tone="solid" inset="none">
          <RowsSkeleton rows={5} />
        </Pane>
      ) : isError ? (
        <Alert
          tone="bad"
          title="Qidiruvni bajarib bo'lmadi"
          action={
            <Button size="sm" onClick={() => refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Internet aloqasini tekshirib, qayta urinib ko&apos;ring.
        </Alert>
      ) : flat.length === 0 ? (
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            icon={<Search className="size-5" />}
            title="Hech narsa topilmadi"
            description={`«${query}» bo'yicha natija yo'q. Boshqacha yozib ko'ring.`}
          />
        </Pane>
      ) : (
        <div className="enter flex flex-col gap-5">
          {groups.map((group) => {
            const start = offset;
            offset += group.rows.length;
            const meta = TYPE_META[group.type];

            return (
              <Pane key={group.type} tone="solid" inset="none" className="min-w-0">
                {/* Guruh sarlavhasi karta ichida — kanvasda yalang'och matn qolmasin */}
                <div className="flex items-center gap-2 border-b border-[var(--edge)] px-4 py-3 sm:px-5">
                  <p className="t-eyebrow">{meta.label}</p>
                  <Count value={group.rows.length} />
                </div>

                <ul className="enter-stagger divide-y divide-[var(--edge-soft)]">
                  {group.rows.map((row, index) => {
                    const flatIndex = start + index;
                    const selected = flatIndex === active;
                    return (
                      <li key={`${row.type}-${row.id}`} id={`search-hit-${flatIndex}`}>
                        <Link
                          href={row.url}
                          onMouseMove={() => setActive(flatIndex)}
                          className={cn(
                            "group flex items-center gap-3.5 px-4 py-3 focus-ring sm:px-5",
                            "transition-colors duration-[var(--t-fast)]",
                            selected && "bg-[var(--pane-sunken)]",
                          )}
                        >
                          {row.type === "user" ? (
                            <Face src={row.avatar_url} name={row.title} />
                          ) : (
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-[var(--r-ctl)]",
                                meta.wash,
                              )}
                            >
                              {meta.icon}
                            </span>
                          )}

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-[var(--ink)]">
                              {row.title}
                            </span>
                            {row.subtitle ? (
                              <span className="t-meta mt-0.5 block truncate text-[var(--ink-4)]">
                                {row.subtitle}
                              </span>
                            ) : null}
                          </span>

                          {row.difficulty ? (
                            <DifficultyMark
                              value={row.difficulty}
                              label={DIFF_LABEL[row.difficulty]}
                              className="shrink-0"
                            />
                          ) : null}
                          <ArrowRight
                            className={cn(
                              "size-4 shrink-0 text-[var(--ink-4)] transition-opacity duration-[var(--t-fast)]",
                              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                            )}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Pane>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        /* Skelet kartalar ritmini takrorlaydi */
        <div className="mx-auto flex w-full max-w-[var(--page-tight)] flex-col gap-5">
          <Block className="h-36 rounded-[var(--r-pane)]" />
          <Block className="h-24 rounded-[var(--r-pane)]" />
          <Block className="h-64 rounded-[var(--r-pane)]" />
        </div>
      }
    >
      <SearchInner />
    </Suspense>
  );
}

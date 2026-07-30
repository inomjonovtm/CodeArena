"use client";

import { useQuery } from "@tanstack/react-query";
import { Code2, ListChecks, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Block,
  Button,
  Chip,
  DifficultyMark,
  Empty,
  LinkButton,
  Modal,
  PageHead,
  Pagination,
  Pane,
  SearchField,
  Segmented,
  Spinner,
} from "@/components/kit";
import { useAuth, useI18n } from "@/components/providers";
import { CodeEditor } from "@/components/ui/code-editor";
import { publicApi } from "@/lib/public-api";
import type { Language, SubmissionStatus } from "@/lib/types";
import { cn, formatBytes, formatDate, formatDuration, formatRelative } from "@/lib/utils";

const PAGE_SIZE = 20;

const LANGUAGE_LABEL: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

type StatusTab = "" | "ACCEPTED" | "WRONG_ANSWER" | "other";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "", label: "Hammasi" },
  { value: "ACCEPTED", label: "Qabul qilingan" },
  { value: "WRONG_ANSWER", label: "Noto'g'ri javob" },
  { value: "other", label: "Boshqa xatolar" },
];

const OTHER_STATUSES: SubmissionStatus[] = [
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "COMPILE_ERROR",
  "SYSTEM_ERROR",
];

type ChipTone = "neutral" | "brand" | "ok" | "warn" | "bad" | "note";

/* Holat → chip toni. Rang yagona signal emas — nuqta + matn birga yuradi. */
const STATUS_TONE: Record<string, ChipTone> = {
  ACCEPTED: "ok",
  WRONG_ANSWER: "bad",
  TIME_LIMIT_EXCEEDED: "warn",
  MEMORY_LIMIT_EXCEEDED: "warn",
  RUNTIME_ERROR: "bad",
  COMPILE_ERROR: "bad",
  SYSTEM_ERROR: "bad",
  PENDING: "neutral",
  JUDGING: "brand",
  EXECUTED: "note",
};

const BUSY_STATUSES = new Set(["PENDING", "JUDGING"]);

function StatusChip({ value }: { value: SubmissionStatus | string }) {
  const { t } = useI18n();
  const label = (t.site.status as Record<string, string>)[value] ?? value;
  const busy = BUSY_STATUSES.has(value);
  return (
    <Chip
      tone={STATUS_TONE[value] ?? "neutral"}
      dot={!busy}
      icon={busy ? <Loader2 className="size-3 animate-spin" /> : undefined}
    >
      {label}
    </Chip>
  );
}

/* Jadval ustunlari — sarlavha va qatorlar bitta to'rda */
const ROW_GRID =
  "md:grid md:grid-cols-[minmax(0,1fr)_9rem_4rem_4.5rem_4.5rem_6rem] md:items-center md:gap-4";

export default function SubmissionsPage() {
  const { user, loading: authLoading } = useAuth();

  const [statusTab, setStatusTab] = useState<StatusTab>("");
  const [language, setLanguage] = useState<"" | Language>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => setPage(1), [statusTab, language]);

  const params = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      ...(statusTab && statusTab !== "other" ? { status: statusTab } : {}),
      ...(language ? { language } : {}),
    }),
    [page, statusTab, language],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-submissions", params],
    queryFn: () => publicApi.submissions.list(params),
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["submission-full", openId],
    queryFn: () => publicApi.submissions.full(openId as string),
    enabled: Boolean(openId),
  });

  const rows = useMemo(() => {
    let list = data?.results ?? [];
    if (statusTab === "other") {
      list = list.filter((row) => OTHER_STATUSES.includes(row.status));
    }
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((row) => row.problem_title_uz.toLowerCase().includes(term));
    }
    return list;
  }, [data, statusTab, search]);

  if (authLoading) {
    return (
      <Pane inset="lg">
        <Spinner label="Yuklanmoqda..." />
      </Pane>
    );
  }

  if (!user) {
    return (
      <Pane tone="solid" inset="none" className="overflow-hidden">
        <Empty
          icon={<ListChecks className="size-5" />}
          title="Yechimlar tarixi shaxsiy"
          description="Yuborgan yechimlaringizni ko'rish uchun hisobingizga kiring."
          action={<LinkButton href="/login" variant="primary">Kirish</LinkButton>}
        />
      </Pane>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {/* --------------------------------------------- 1. sahifa sarlavhasi */}
      <PageHead
        eyebrow="Tarix"
        title="Yechimlarim"
        lead="Yuborgan barcha kodlaringiz, natijalari va tezligi."
        meta={
          data ? (
            <p className="t-meta text-[var(--ink-4)]">
              Jami <span className="t-num text-[var(--ink-2)]">{data.count}</span> ta yuborish
            </p>
          ) : null
        }
      />

      {/* ------------------------------------------------- 2. asboblar paneli */}
      <Pane className="enter" inset="md">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented value={statusTab} items={STATUS_TABS} onChange={setStatusTab} size="sm" />

          {/* Til filtri — yakka tanlovli chiplar */}
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Dasturlash tili">
            {(
              [
                { value: "" as const, label: "Barcha tillar" },
                ...(Object.entries(LANGUAGE_LABEL) as [Language, string][]).map(([value, label]) => ({
                  value,
                  label,
                })),
              ] as { value: "" | Language; label: string }[]
            ).map((item) => {
              const active = language === item.value;
              return (
                <button
                  key={item.value || "all"}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLanguage(item.value)}
                  className={cn(
                    "focus-ring inline-flex shrink-0 items-center rounded-[var(--r-chip)] border px-3 py-1.5",
                    "text-[12.5px] font-medium whitespace-nowrap",
                    "transition-[background-color,border-color,color] duration-[var(--t-fast)]",
                    active
                      ? "border-[var(--brand-edge)] bg-[var(--brand-wash)] text-[var(--brand-ink)]"
                      : "border-[var(--edge)] bg-[var(--pane-sunken)] text-[var(--ink-3)] hover:border-[var(--edge-strong)] hover:text-[var(--ink)]",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <SearchField
            value={search}
            onValueChange={setSearch}
            placeholder="Masala nomi..."
            className="ml-auto min-w-48 flex-1 sm:max-w-xs"
          />
        </div>
      </Pane>

      {/* ----------------------------------------------------- 3. ro'yxat */}
      {isLoading ? (
        /* Skelet — jadval qatorlari shaklida */
        <Pane tone="solid" inset="none">
          <div className="divide-y divide-[var(--edge-soft)]">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={cn(ROW_GRID, "px-4 py-3.5 sm:px-5")}>
                <div className="flex items-center gap-2.5">
                  <Block className="h-3 w-6" />
                  <Block className="h-3.5 w-44" />
                </div>
                <Block className="mt-2 h-6 w-24 rounded-[var(--r-chip)] md:mt-0" />
                <Block className="hidden h-3 w-8 md:block" />
                <Block className="hidden h-3 w-10 md:block" />
                <Block className="hidden h-3 w-10 md:block" />
                <Block className="hidden h-3 w-14 md:block" />
              </div>
            ))}
          </div>
        </Pane>
      ) : isError ? (
        /* Yechim tarixi yo'qolgandek ko'rinmasin — bu tarmoq xatosi */
        <Alert
          tone="bad"
          title="Yechimlarni yuklab bo'lmadi"
          action={
            <Button size="sm" onClick={() => refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Internet aloqasini tekshirib, qayta urinib ko&apos;ring.
        </Alert>
      ) : rows.length === 0 ? (
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            icon={<Code2 className="size-5" />}
            title="Yechim topilmadi"
            description="Filtrlarni o'zgartiring yoki birinchi masalangizni yeching."
            action={
              <LinkButton href="/problems" variant="primary">
                Masalalarga o&apos;tish
              </LinkButton>
            }
          />
        </Pane>
      ) : (
        <Pane tone="solid" inset="none">
          {/* Ustun sarlavhalari — faqat keng ekranda */}
          <div
            className={cn(
              ROW_GRID,
              "t-eyebrow hidden border-b border-[var(--edge)] px-5 py-2.5 md:grid",
            )}
          >
            <span>Masala</span>
            <span>Holat</span>
            <span className="text-right">Testlar</span>
            <span className="text-right">Vaqt</span>
            <span className="text-right">Xotira</span>
            <span className="text-right">Sana</span>
          </div>

          <ul className="enter-stagger divide-y divide-[var(--edge-soft)]">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(row.id)}
                  className={cn(
                    ROW_GRID,
                    "focus-ring flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left",
                    "transition-colors hover:bg-[var(--pane-hover)] sm:px-5",
                  )}
                >
                  <span className="flex w-full min-w-0 items-center gap-2.5 md:w-auto">
                    <DifficultyMark value={row.problem_difficulty} showLabel={false} />
                    <span className="truncate text-[14px] font-medium text-[var(--ink)]">
                      {row.problem_title_uz}
                    </span>
                    {row.contest_slug ? (
                      <Chip tone="note" className="shrink-0 uppercase">
                        contest
                      </Chip>
                    ) : null}
                    <span className="t-meta shrink-0 text-[var(--ink-4)]">
                      {LANGUAGE_LABEL[row.language] ?? row.language}
                    </span>
                  </span>

                  <span>
                    <StatusChip value={row.status} />
                  </span>

                  <span className="t-num t-meta text-[var(--ink-3)] md:text-right">
                    {row.total_tests ? `${row.passed_tests}/${row.total_tests}` : "—"}
                  </span>
                  <span className="t-num t-meta text-[var(--ink-3)] md:text-right">
                    {formatDuration(row.runtime_ms)}
                  </span>
                  <span className="t-num t-meta text-[var(--ink-3)] md:text-right">
                    {formatBytes(row.memory_kb)}
                  </span>
                  <span
                    className="t-meta text-[var(--ink-4)] md:text-right"
                    title={formatDate(row.created_at)}
                  >
                    {formatRelative(row.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Pane>
      )}

      {/* -------------------------------------------------- 4. sahifalash */}
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

      {/* --------------------------------------------------- yechim tafsiloti */}
      <Modal
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        title={detail?.problem_title_uz ?? "Yechim"}
        description={detail ? formatDate(detail.created_at) : undefined}
        size="lg"
        footer={
          detail ? (
            <LinkButton href={`/problems/${detail.problem_slug}`} size="sm">
              Masalaga o&apos;tish
            </LinkButton>
          ) : null
        }
      >
        {detailLoading || !detail ? (
          <Block className="h-64 rounded-[var(--r-pane)]" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <StatusChip value={detail.status} />
              <span className="t-meta text-[var(--ink-3)]">
                {LANGUAGE_LABEL[detail.language] ?? detail.language}
              </span>
              <span className="t-num t-meta text-[var(--ink-3)]">
                {detail.passed_tests}/{detail.total_tests} test
              </span>
              <span className="t-num t-meta text-[var(--ink-3)]">
                {formatDuration(detail.runtime_ms)}
              </span>
              <span className="t-num t-meta text-[var(--ink-3)]">
                {formatBytes(detail.memory_kb)}
              </span>
            </div>

            {/* Kod oq sirtda — sahifa bo'ylab bitta muharrir ko'rinishi */}
            <div className="overflow-hidden rounded-[var(--r-field)] border border-[var(--edge)]">
              <CodeEditor
                value={detail.code}
                language={detail.language}
                height="20rem"
                readOnly
                className="rounded-none border-0"
              />
            </div>

            {detail.compile_output ? (
              <pre className="max-h-40 overflow-auto rounded-[var(--r-field)] bg-[var(--bad-wash)] p-3 font-mono text-[12px] whitespace-pre-wrap text-[var(--bad)]">
                {detail.compile_output}
              </pre>
            ) : null}
            {detail.error_message ? (
              <pre className="pane-sunken max-h-40 overflow-auto rounded-[var(--r-field)] p-3 font-mono text-[12px] whitespace-pre-wrap text-[var(--ink-2)]">
                {detail.error_message}
              </pre>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}

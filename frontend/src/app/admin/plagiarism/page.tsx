"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Globe,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert, Spinner } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge, LanguageBadge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { CodeBlock, ProgressBar } from "@/components/ui/misc";
import { DataTable, FilterCell, type Column } from "@/components/ui/data-table";
import { Checkbox, Field, FilterSelect, Input, SegmentedControl, Textarea } from "@/components/ui/field";
import { Drawer, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { PlagiarismPair, PlagiarismPairDetail, PlagiarismState } from "@/lib/types";
import { cn, formatDate, formatNumber, formatRelative } from "@/lib/utils";

const plagiarism = resource<PlagiarismPair, PlagiarismPairDetail>("plagiarism");

const STATE: Record<PlagiarismState, { tone: BadgeTone; uz: string }> = {
  pending: { tone: "warning", uz: "Ko'rilmagan" },
  cleared: { tone: "success", uz: "Tozalangan" },
  confirmed: { tone: "danger", uz: "Tasdiqlangan" },
};

function similarityTone(value: number) {
  if (value >= 0.95) return "text-[var(--bad)]";
  if (value >= 0.9) return "text-[var(--warn)]";
  return "text-[var(--ink-2)]";
}

/** O'xshashlik chizig'i rangi — matn rangi bilan bir xil signalni beradi. */
function similarityBarTone(value: number) {
  if (value >= 0.95) return "danger" as const;
  if (value >= 0.9) return "warning" as const;
  return "accent" as const;
}

export default function PlagiarismPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const table = useTableQuery({ ordering: "-similarity" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scan, setScan] = useState({ contest: "", problem: "", threshold: "0.85" });
  const [review, setReview] = useState({ note: "", disqualify: false });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["plagiarism", table.params],
    queryFn: () => plagiarism.list(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: ["plagiarism", "summary"],
    queryFn: () =>
      plagiarism.summary<{
        total: number;
        pending: number;
        confirmed: number;
        cleared: number;
        same_ip: number;
        avg_similarity: number | null;
      }>(),
  });

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ["plagiarism", openId],
    queryFn: () => plagiarism.retrieve(openId as string),
    enabled: Boolean(openId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["plagiarism"] });
  };

  const reviewMutation = useCrudMutation(
    ({ id, status, note, disqualify }: { id: string; status: PlagiarismState; note: string; disqualify: boolean }) =>
      plagiarism.action(id, "review", { status, note, disqualify }),
    {
      invalidate: [["plagiarism"]],
      successMessage: "Xulosa saqlandi",
      onSuccess: () => {
        setOpenId(null);
        setReview({ note: "", disqualify: false });
      },
    },
  );

  const scanMutation = useCrudMutation(
    (payload: typeof scan) =>
      plagiarism.collectionAction("scan", {
        contest: payload.contest || undefined,
        problem: payload.problem || undefined,
        threshold: Number(payload.threshold),
      }),
    {
      successMessage: t.plagiarism.scanStarted,
      onSuccess: () => setScanOpen(false),
    },
  );

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => plagiarism.bulk(ids, action),
    { invalidate: [["plagiarism"]] },
  );

  const columns: Column<PlagiarismPair>[] = [
    {
      key: "similarity",
      header: t.plagiarism.similarity,
      sortKey: "similarity",
      align: "right",
      width: "7rem",
      csv: (row) => row.similarity,
      render: (row) => (
        // Raqam + ingichka chiziq: ko'z ustunni skanerlab chiqadi
        <div className="flex flex-col items-end gap-1.5">
          <span className={cn("t-num text-[14px] font-semibold", similarityTone(row.similarity))}>
            {Math.round(row.similarity * 100)}%
          </span>
          <ProgressBar
            value={row.similarity * 100}
            tone={similarityBarTone(row.similarity)}
            className="w-16"
          />
        </div>
      ),
    },
    {
      key: "pair",
      header: t.plagiarism.pair,
      csv: (row) => `${row.user_a_username} <-> ${row.user_b_username}`,
      render: (row) => (
        <div className="flex items-center gap-2 text-[13px]">
          <Link
            href={`/admin/users/${row.user_a}`}
            className="focus-ring rounded-[6px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            {row.user_a_username ?? "—"}
          </Link>
          <span className="text-[var(--ink-4)]">↔</span>
          <Link
            href={`/admin/users/${row.user_b}`}
            className="focus-ring rounded-[6px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            {row.user_b_username ?? "—"}
          </Link>
        </div>
      ),
    },
    {
      key: "problem",
      header: t.submissions.problem,
      csv: (row) => row.problem_title,
      render: (row) => (
        <Link
          href={`/admin/problems/${row.problem}`}
          className="focus-ring block max-w-[14rem] truncate rounded-[6px] text-[12.5px] text-[var(--ink-3)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
        >
          {row.problem_title}
        </Link>
      ),
    },
    {
      key: "contest",
      header: t.submissions.contest,
      hideable: true,
      csv: (row) => row.contest_title,
      render: (row) =>
        row.contest ? (
          <Link
            href={`/admin/contests/${row.contest}`}
            className="focus-ring block max-w-[12rem] truncate rounded-[6px] text-[12.5px] text-[var(--ink-3)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            {row.contest_title}
          </Link>
        ) : (
          <span className="text-[12px] text-[var(--ink-4)]">amaliyot</span>
        ),
    },
    {
      key: "language",
      header: t.submissions.language,
      csv: (row) => row.language,
      render: (row) => <LanguageBadge value={row.language} />,
    },
    {
      key: "signals",
      header: "Signallar",
      csv: (row) => `${row.same_ip ? "same-ip " : ""}${row.time_delta_seconds ?? ""}s`,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.same_ip ? (
            <Badge tone="danger">
              <Globe className="size-3" /> bir IP
            </Badge>
          ) : null}
          {row.time_delta_seconds !== null && row.time_delta_seconds < 300 ? (
            <Badge tone="warning">
              <Clock className="size-3" />{" "}
              <span className="t-num">{Math.round(row.time_delta_seconds / 60)} daq</span>
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: t.common.status,
      csv: (row) => row.status,
      render: (row) => {
        const config = STATE[row.status] ?? STATE.pending;
        return (
          <Badge tone={config.tone} dot>
            {config.uz}
          </Badge>
        );
      },
    },
    {
      key: "created_at",
      header: t.common.createdAt,
      sortKey: "created_at",
      hideable: true,
      csv: (row) => row.created_at,
      render: (row) => (
        <span className="t-num whitespace-nowrap text-[12px] text-[var(--ink-4)]">
          {formatRelative(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "5rem",
      render: (row) => (
        <Button
          variant="outline"
          size="xs"
          aria-label={`${row.user_a_username} ↔ ${row.user_b_username} — ${t.plagiarism.compare}`}
          onClick={(event) => {
            event.stopPropagation();
            setOpenId(row.id);
          }}
        >
          {t.plagiarism.compare}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.plagiarism.title}
        description={t.plagiarism.subtitle}
        actions={
          <Button size="sm" icon={<ScanSearch className="size-4" />} onClick={() => setScanOpen(true)}>
            {t.plagiarism.runScan}
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(summary?.total ?? 0)}
          icon={<ShieldAlert className="size-[18px]" />}
        />
        <StatCard
          label={t.plagiarism.pending}
          value={formatNumber(summary?.pending ?? 0)}
          tone={summary?.pending ? "warning" : "neutral"}
        />
        <StatCard
          label={t.plagiarism.confirmed}
          value={formatNumber(summary?.confirmed ?? 0)}
          tone="danger"
        />
        <StatCard
          label="O'rtacha o'xshashlik"
          value={summary?.avg_similarity ? `${Math.round(summary.avg_similarity * 100)}%` : "—"}
          tone="info"
        />
      </div>

      {/* Ogohlantirish: ro'yxat qaror emas, signal */}
      <Alert tone="info" className="mb-5">
        Bu ro&apos;yxat <strong>avtomatik diskvalifikatsiya emas</strong> — faqat admin ko&apos;rib
        chiqishi uchun signal (13-bo&apos;lim). Har bir juftlikni yonma-yon solishtirib, xulosa
        chiqaring.
      </Alert>

      {isError ? (
        <Alert
          tone="bad"
          title="Juftliklarni yuklab bo'lmadi"
          className="mb-5"
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Tarmoq yoki server xatosi. Qayta urinib ko&apos;ring.
        </Alert>
      ) : null}

      <DataTable
        rows={data?.results ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        page={table.page}
        pageSize={table.pageSize}
        totalCount={data?.count ?? 0}
        totalPages={data?.total_pages ?? 1}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        ordering={table.ordering}
        onOrderingChange={table.setOrdering}
        search={table.search}
        onSearchChange={table.setSearch}
        selectable
        exportName="codearena-plagiat"
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        onRowClick={(row) => setOpenId(row.id)}
        emptyTitle="Shubhali juftlik topilmadi"
        emptyDescription="Tekshiruvni ishga tushiring yoki filtrlarni o'zgartiring."
        emptyAction={
          <Button size="sm" icon={<ScanSearch className="size-4" />} onClick={() => setScanOpen(true)}>
            {t.plagiarism.runScan}
          </Button>
        }
        filtersSlot={
          <>
            <SegmentedControl
              stacked
              label="Holat"
              allLabel={t.common.all}
              value={table.filters.status as string}
              onChange={(next) => table.setFilter("status", next)}
              options={[
                { value: "pending", label: t.plagiarism.pending, tone: "warning" },
                { value: "cleared", label: t.plagiarism.cleared, tone: "success" },
                { value: "confirmed", label: t.plagiarism.confirmed, tone: "danger" },
              ]}
            />
            <SegmentedControl
              stacked
              label="IP"
              allLabel={t.common.all}
              value={table.filters.same_ip as string}
              onChange={(next) => table.setFilter("same_ip", next)}
              options={[
                { value: "true", label: "Bir xil", tone: "danger" },
                { value: "false", label: "Turli", tone: "neutral" },
              ]}
            />
            <FilterSelect
              label="Til"
              allLabel="Barcha tillar"
              value={table.filters.language as string}
              onChange={(next) => table.setFilter("language", next)}
              options={[
                { value: "python", label: "Python" },
                { value: "javascript", label: "JavaScript" },
                { value: "cpp", label: "C++" },
              ]}
            />
            {/* Filtr panelidagi barcha kataklar bir xil ko'rinishda bo'lsin */}
            <FilterCell label="Min o'xshashlik">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="Min o'xshashlik"
                aria-label="Minimal o'xshashlik"
                value={(table.filters.similarity_min as string) ?? ""}
                onChange={(event) => table.setFilter("similarity_min", event.target.value)}
              />
            </FilterCell>
          </>
        }
        bulkActions={[
          {
            key: "clear",
            label: t.plagiarism.clear,
            icon: <CheckCircle2 className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "clear" }).then(invalidate),
          },
          {
            key: "confirm",
            label: t.plagiarism.confirmPlagiarism,
            icon: <XCircle className="size-3.5" />,
            danger: true,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "confirm" }).then(invalidate),
          },
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "delete" }).then(invalidate),
          },
        ]}
      />

      {/* ---------------------------------------------- yonma-yon solishtirish */}
      <Drawer
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        title={
          detail ? (
            <span className="flex items-center gap-2">
              <span className={cn("t-num text-lg font-bold", similarityTone(detail.similarity))}>
                {Math.round(detail.similarity * 100)}%
              </span>
              <span className="truncate">{detail.problem_title}</span>
            </span>
          ) : (
            t.common.loading
          )
        }
        description={
          detail ? `${detail.user_a_username} ↔ ${detail.user_b_username}` : undefined
        }
        width="max-w-6xl"
        footer={
          detail ? (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<ShieldCheck className="size-4" />}
                loading={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    id: detail.id,
                    status: "cleared",
                    note: review.note,
                    disqualify: false,
                  })
                }
              >
                {t.plagiarism.clear}
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<ShieldAlert className="size-4" />}
                loading={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    id: detail.id,
                    status: "confirmed",
                    note: review.note,
                    disqualify: review.disqualify,
                  })
                }
              >
                {t.plagiarism.confirmPlagiarism}
              </Button>
            </>
          ) : null
        }
      >
        {detailLoading && !detail ? (
          <Spinner label={t.common.loading} />
        ) : detail ? (
          <div className="flex flex-col gap-4">
            {/* 1-blok: signal ko'rsatkichlari — oq karta, ichida botiq kataklar */}
            <div className="pane rounded-[var(--r-pane)] p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="pane-sunken rounded-[var(--r-field)] p-4">
                  <p className="t-eyebrow">{t.plagiarism.similarity}</p>
                  <p
                    className={cn(
                      "t-num mt-2 text-[22px] leading-none font-semibold",
                      similarityTone(detail.similarity),
                    )}
                  >
                    {Math.round(detail.similarity * 100)}%
                  </p>
                  <ProgressBar
                    value={detail.similarity * 100}
                    tone={similarityBarTone(detail.similarity)}
                    className="mt-3"
                  />
                </div>
                <div className="pane-sunken rounded-[var(--r-field)] p-4">
                  <p className="t-eyebrow">{t.plagiarism.timeDelta}</p>
                  <p className="t-num mt-2 text-[22px] leading-none font-semibold text-[var(--ink)]">
                    {detail.time_delta_seconds !== null
                      ? `${Math.round(detail.time_delta_seconds / 60)} daq`
                      : "—"}
                  </p>
                </div>
                <div className="pane-sunken rounded-[var(--r-field)] p-4">
                  <p className="t-eyebrow">IP</p>
                  <p className="mt-2">
                    {detail.same_ip ? (
                      <Badge tone="danger" dot>
                        Bir xil IP
                      </Badge>
                    ) : (
                      <Badge tone="neutral" dot>
                        Turli IP
                      </Badge>
                    )}
                  </p>
                  <p className="t-num mt-2 font-mono text-[11px] text-[var(--ink-4)]">
                    {detail.ip_a ?? "—"} / {detail.ip_b ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2-blok: kod juftligi — oq karta, kod maydonlari yonma-yon */}
            <div className="pane rounded-[var(--r-pane)] p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="t-eyebrow">{t.plagiarism.matchedLines}</p>
                <p className="t-meta text-[var(--ink-3)]">
                  <span className="t-num">{detail.matched_lines.length}</span> ta mos qator sariq
                  bilan belgilangan
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {[
                  {
                    user: detail.user_a_username,
                    userId: detail.user_a,
                    code: detail.code_a,
                    at: detail.submitted_a_at,
                    lines: detail.matched_lines.map((row) => row.line_a),
                  },
                  {
                    user: detail.user_b_username,
                    userId: detail.user_b,
                    code: detail.code_b,
                    at: detail.submitted_b_at,
                    lines: detail.matched_lines.map((row) => row.line_b),
                  },
                ].map((side, index) => (
                  <div key={index} className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/users/${side.userId}`}
                        className="focus-ring truncate rounded-[6px] text-[13px] font-semibold text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
                      >
                        {side.user ?? "—"}
                      </Link>
                      <span className="t-num shrink-0 text-[11px] text-[var(--ink-4)]">
                        {formatDate(side.at)}
                      </span>
                    </div>
                    <CodeBlock
                      code={side.code}
                      language={detail.language}
                      maxHeight="28rem"
                      highlightLines={side.lines}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Xulosa — oq karta, amallar Drawer footerida */}
            <Card>
              <CardBody className="flex flex-col gap-4">
                <Field label={t.plagiarism.reviewNote}>
                  <Textarea
                    rows={3}
                    value={review.note}
                    onChange={(event) => setReview({ ...review, note: event.target.value })}
                    placeholder="Xulosangiz — nima uchun plagiat / yolg'on signal deb hisoblaysiz?"
                    aria-label={t.plagiarism.reviewNote}
                  />
                </Field>
                {detail.contest ? (
                  <Checkbox
                    checked={review.disqualify}
                    onChange={(event) => setReview({ ...review, disqualify: event.target.checked })}
                    label={t.plagiarism.alsoDisqualify}
                    description="Ikkala ishtirokchi contest natijalaridan chiqariladi"
                  />
                ) : null}
                {detail.review_note ? (
                  <p className="rounded-[var(--r-field)] bg-[var(--pane-sunken)] p-3 text-[12.5px] text-[var(--ink-3)]">
                    <strong className="text-[var(--ink)]">{detail.reviewed_by_username}</strong>:{" "}
                    {detail.review_note}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          </div>
        ) : null}
      </Drawer>

      {/* ------------------------------------------------------- skan modal */}
      <Modal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        title={t.plagiarism.runScan}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setScanOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              disabled={!scan.contest && !scan.problem}
              loading={scanMutation.isPending}
              onClick={() => scanMutation.mutate(scan)}
            >
              {t.plagiarism.runScan}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-[var(--ink-3)]">
            Contest yoki masala ID sini kiriting. Barcha Accepted submissionlar juft-juft
            solishtiriladi (winnowing algoritmi).
          </p>
          <Field label="Contest ID" hint="Contest sahifasidagi URL'dan oling">
            <Input
              value={scan.contest}
              onChange={(event) => setScan({ ...scan, contest: event.target.value, problem: "" })}
              className="font-mono"
              aria-label="Contest ID"
              placeholder="uuid"
            />
          </Field>
          <Field label="yoki Masala ID">
            <Input
              value={scan.problem}
              onChange={(event) => setScan({ ...scan, problem: event.target.value, contest: "" })}
              className="font-mono"
              aria-label="Masala ID"
              placeholder="uuid"
            />
          </Field>
          <Field label={t.plagiarism.threshold} hint="0.85 = 85% o'xshashlik">
            <Input
              type="number"
              step="0.01"
              min="0.5"
              max="1"
              aria-label={t.plagiarism.threshold}
              value={scan.threshold}
              onChange={(event) => setScan({ ...scan, threshold: event.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}

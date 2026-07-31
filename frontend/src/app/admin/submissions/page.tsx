"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock, Eye, Gauge, RefreshCw, Server, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Chip } from "@/components/kit";
import { useCan, useConfirm, useI18n } from "@/components/providers";
import { Badge, DifficultyBadge, LanguageBadge, StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { CodeBlock, StatRow } from "@/components/ui/misc";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterSelect, Input, SegmentedControl } from "@/components/ui/field";
import { Drawer } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { api, resource } from "@/lib/api";
import type { AdminSubmission, AdminSubmissionDetail } from "@/lib/types";
import { formatBytes, formatDate, formatDuration, formatNumber, formatRelative } from "@/lib/utils";

const submissions = resource<AdminSubmission, AdminSubmissionDetail>("submissions");

interface SubmissionSummary {
  total: number;
  today: number;
  pending: number;
  accepted: number;
  by_status: { status: string; count: number }[];
  by_language: { language: string; count: number }[];
  avg_runtime_ms: number | null;
}

export default function SubmissionsPage() {
  const { t } = useI18n();
  const can = useCan();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const table = useTableQuery();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["submissions", table.params],
    queryFn: () => submissions.list(table.params),
    refetchInterval: 20_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["submissions", "summary"],
    queryFn: () => submissions.summary<SubmissionSummary>(),
    refetchInterval: 30_000,
  });

  const { data: judgeHealth } = useQuery({
    queryKey: ["submissions", "judge-health"],
    queryFn: () =>
      api.get<{ judge0_url: string; available: boolean; queued: number }>(
        "/admin/submissions/judge-health/",
      ),
    refetchInterval: 30_000,
  });

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ["submissions", openId],
    queryFn: () => submissions.retrieve(openId as string),
    enabled: Boolean(openId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["submissions"] });
  };

  const rejudgeMutation = useCrudMutation((id: string) => submissions.action(id, "rejudge"), {
    invalidate: [["submissions"]],
    successMessage: t.submissions.rejudgeQueued,
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => submissions.bulk(ids, action),
    { invalidate: [["submissions"]] },
  );

  const columns: Column<AdminSubmission>[] = [
    {
      key: "user",
      header: t.submissions.user,
      csv: (row) => row.username,
      mobilePrimary: true,
      render: (row) => (
        <Link
          href={`/admin/users/${row.user_id}`}
          className="focus-ring rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          onClick={(event) => event.stopPropagation()}
        >
          {row.username}
        </Link>
      ),
    },
    {
      key: "problem",
      header: t.submissions.problem,
      csv: (row) => row.problem_title,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <DifficultyBadge value={row.problem_difficulty} />
          <Link
            href={`/admin/problems/${row.problem}`}
            className="focus-ring max-w-[14rem] truncate rounded-[6px] text-[13px] text-[var(--ink-3)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
            onClick={(event) => event.stopPropagation()}
          >
            {row.problem_title}
          </Link>
        </div>
      ),
    },
    {
      key: "language",
      header: t.submissions.language,
      csv: (row) => row.language,
      render: (row) => <LanguageBadge value={row.language} />,
    },
    {
      key: "status",
      header: t.common.status,
      csv: (row) => row.status,
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: "tests",
      header: t.submissions.tests,
      align: "center",
      csv: (row) => `${row.passed_tests}/${row.total_tests}`,
      render: (row) => (
        <span className="t-num text-[12.5px] text-[var(--ink-3)]">
          {row.passed_tests}/{row.total_tests || "—"}
          {row.failed_test_index ? (
            <span className="ml-1 text-[var(--bad)]">#{row.failed_test_index}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "runtime",
      header: t.submissions.runtime,
      sortKey: "runtime_ms",
      align: "right",
      csv: (row) => row.runtime_ms,
      render: (row) => (
        <span className="t-num text-[12.5px] text-[var(--ink-3)]">
          {formatDuration(row.runtime_ms)}
        </span>
      ),
    },
    {
      key: "memory",
      header: t.submissions.memory,
      sortKey: "memory_kb",
      align: "right",
      hideable: true,
      csv: (row) => row.memory_kb,
      render: (row) => (
        <span className="t-num text-[12.5px] text-[var(--ink-3)]">{formatBytes(row.memory_kb)}</span>
      ),
    },
    {
      key: "mode",
      header: "Rejim",
      hideable: true,
      defaultHidden: true,
      csv: (row) => (row.is_practice ? "practice" : "contest"),
      render: (row) =>
        row.is_practice ? (
          <Badge tone="neutral">{t.submissions.practice}</Badge>
        ) : (
          <Badge tone="info">{row.contest_title ?? t.submissions.contest}</Badge>
        ),
    },
    {
      key: "ip",
      header: t.submissions.ipAddress,
      hideable: true,
      defaultHidden: true,
      csv: (row) => row.ip_address,
      render: (row) => (
        <span className="font-mono text-[11px] text-[var(--ink-4)]">{row.ip_address ?? "—"}</span>
      ),
    },
    {
      key: "created_at",
      header: t.common.createdAt,
      sortKey: "created_at",
      csv: (row) => row.created_at,
      render: (row) => (
        <span className="text-[12px] whitespace-nowrap text-[var(--ink-4)]">
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
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={(event) => {
              event.stopPropagation();
              setOpenId(row.id);
            }}
            aria-label={t.common.view}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={(event) => {
              event.stopPropagation();
              rejudgeMutation.mutate(row.id);
            }}
            aria-label={t.submissions.rejudge}
            title={t.submissions.rejudge}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.submissions.title}
        description={t.submissions.subtitle}
        actions={
          // Judge holati sarlavha yonida — sahifa ochilishi bilan ko'rinadi
          <Chip
            tone={judgeHealth?.available ? "ok" : "bad"}
            dot
            icon={<Server className="size-3.5" />}
            className="h-8 px-3"
          >
            Judge0: {judgeHealth?.available ? t.dashboard.online : t.dashboard.offline}
            {judgeHealth?.queued ? ` · ${judgeHealth.queued} navbatda` : ""}
          </Chip>
        }
      />

      {/* --------------------------------------------------- KPI qatori */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(summary?.total ?? 0)}
          hint={`${summary?.today ?? 0} bugun`}
          icon={<Activity className="size-[17px]" />}
        />
        <StatCard
          label="Accepted"
          value={formatNumber(summary?.accepted ?? 0)}
          tone="accent"
          icon={<CheckCircle2 className="size-[17px]" />}
        />
        <StatCard
          label={t.submissions.queued}
          value={formatNumber(summary?.pending ?? 0)}
          tone={summary?.pending ? "warning" : "neutral"}
          icon={<Clock className="size-[17px]" />}
        />
        <StatCard
          label="O'rtacha vaqt"
          value={summary?.avg_runtime_ms ? `${Math.round(summary.avg_runtime_ms)} ms` : "—"}
          tone="info"
          icon={<Gauge className="size-[17px]" />}
        />
      </div>

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
        searchPlaceholder="Username, masala yoki kod bo'yicha..."
        selectable={can("submissions.delete")}
        serverExportUrl="/admin/submissions/export"
        exportParams={table.params as Record<string, unknown>}
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        onRowClick={(row) => setOpenId(row.id)}
        emptyTitle="Submission topilmadi"
        emptyDescription="Filtrlarni o'zgartiring — navbat bo'sh bo'lishi ham mumkin."
        filtersSlot={
          <>
            <FilterSelect
              label="Holat"
              allLabel="Barcha holatlar"
              value={table.filters.status as string}
              onChange={(next) => table.setFilter("status", next)}
              options={[
                { value: "ACCEPTED", label: "Accepted" },
                { value: "WRONG_ANSWER", label: "Wrong Answer" },
                { value: "TIME_LIMIT_EXCEEDED", label: "Time Limit" },
                { value: "MEMORY_LIMIT_EXCEEDED", label: "Memory Limit" },
                { value: "RUNTIME_ERROR", label: "Runtime Error" },
                { value: "COMPILE_ERROR", label: "Compile Error" },
                { value: "PENDING", label: "Pending" },
                { value: "JUDGING", label: "Judging" },
                { value: "SYSTEM_ERROR", label: "System Error" },
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
            <SegmentedControl
              stacked
              label="Rejim"
              allLabel={t.common.all}
              value={table.filters.is_practice as string}
              onChange={(next) => table.setFilter("is_practice", next)}
              options={[
                { value: "true", label: t.submissions.practice, tone: "neutral" },
                { value: "false", label: t.submissions.contest, tone: "accent" },
              ]}
            />
            <Input
              placeholder="Username..."
              aria-label={t.submissions.user}
              value={(table.filters.username as string) ?? ""}
              onChange={(event) => table.setFilter("username", event.target.value)}
            />
          </>
        }
        bulkActions={
          can("submissions.delete")
            ? [
                {
                  key: "rejudge",
                  label: t.submissions.rejudge,
                  icon: <RefreshCw className="size-3.5" />,
                  onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "rejudge" }).then(invalidate),
                },
                {
                  key: "delete",
                  label: t.common.delete,
                  icon: <Trash2 className="size-3.5" />,
                  danger: true,
                  onRun: async (ids) => {
                    const ok = await confirm({
                      title: `${ids.length} ta submissionni o'chirish`,
                      message: "Tanlangan yuborilgan yechimlar butunlay o'chiriladi.",
                      confirmLabel: t.common.delete,
                      danger: true,
                    });
                    if (!ok) return;
                    return bulkMutation.mutateAsync({ ids, action: "delete" }).then(invalidate);
                  },
                },
              ]
            : undefined
        }
      />

      {/* ------------------------------------------------------ detail drawer */}
      <Drawer
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        title={
          detail ? (
            <span className="flex items-center gap-2">
              <StatusBadge value={detail.status} />
              <span className="truncate">{detail.problem_title}</span>
            </span>
          ) : (
            t.common.loading
          )
        }
        description={detail ? `${detail.username} · ${formatDate(detail.created_at)}` : undefined}
        width="max-w-3xl"
        footer={
          detail ? (
            <>
              <ButtonLink href={`/admin/users/${detail.user_id}`} variant="outline" size="sm">
                {t.common.profile}
              </ButtonLink>
              <Button
                size="sm"
                icon={<RefreshCw className="size-4" />}
                loading={rejudgeMutation.isPending}
                onClick={() => rejudgeMutation.mutate(detail.id)}
              >
                {t.submissions.rejudge}
              </Button>
            </>
          ) : null
        }
      >
        {detailLoading && !detail ? (
          <p className="t-meta text-[var(--ink-3)]">{t.common.loading}</p>
        ) : detail ? (
          <div className="flex flex-col gap-4">
            {/* O'lchovlar — botiq maydon, ikki ustunli ro'yxat */}
            <div className="pane-sunken grid gap-x-6 rounded-[var(--r-field)] p-4 sm:grid-cols-2">
              <StatRow
                label={t.submissions.language}
                value={<LanguageBadge value={detail.language} />}
              />
              <StatRow label={t.submissions.runtime} value={formatDuration(detail.runtime_ms)} />
              <StatRow label={t.submissions.memory} value={formatBytes(detail.memory_kb)} />
              <StatRow
                label={t.submissions.tests}
                value={`${detail.passed_tests}/${detail.total_tests}`}
              />
              <StatRow label="Ball" value={`${detail.score}%`} />
              <StatRow label={t.submissions.ipAddress} value={detail.ip_address ?? "—"} />
              <StatRow label="Kod hajmi" value={`${detail.code_length} bayt`} />
              <StatRow
                label="Judge vaqti"
                value={detail.judged_at ? formatDate(detail.judged_at) : "—"}
              />
            </div>

            {detail.compile_output ? (
              <div>
                <p className="t-eyebrow mb-2">{t.submissions.compileOutput}</p>
                <pre
                  className="scrollbar-thin max-h-40 overflow-auto rounded-[var(--r-field)] p-3 font-mono text-[12px] whitespace-pre-wrap text-[var(--bad)]"
                  style={{ backgroundColor: "var(--bad-wash)" }}
                >
                  {detail.compile_output}
                </pre>
              </div>
            ) : null}

            {detail.error_message ? (
              <div>
                <p className="t-eyebrow mb-2">{t.submissions.errorMessage}</p>
                <pre
                  className="scrollbar-thin max-h-40 overflow-auto rounded-[var(--r-field)] p-3 font-mono text-[12px] whitespace-pre-wrap text-[var(--bad)]"
                  style={{ backgroundColor: "var(--bad-wash)" }}
                >
                  {detail.error_message}
                </pre>
              </div>
            ) : null}

            <div>
              <p className="t-eyebrow mb-2">{t.submissions.code}</p>
              <CodeBlock code={detail.code} language={detail.language} maxHeight="26rem" />
            </div>

            {detail.test_results?.length ? (
              <div className="pane-solid overflow-hidden rounded-[var(--r-pane)]">
                <p className="t-eyebrow border-b border-[var(--edge)] px-4 py-3">
                  {t.submissions.testResults}
                </p>
                <div className="scrollbar-thin max-h-72 overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[var(--pane-sunken)]">
                      <tr className="border-b border-[var(--edge)] text-left">
                        <th className="t-eyebrow px-3 py-2">#</th>
                        <th className="t-eyebrow px-3 py-2">{t.common.status}</th>
                        <th className="t-eyebrow px-3 py-2 text-right">{t.submissions.runtime}</th>
                        <th className="t-eyebrow px-3 py-2 text-right">{t.submissions.memory}</th>
                        <th className="t-eyebrow px-3 py-2">Turi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--edge-soft)]">
                      {detail.test_results.map((row) => (
                        <tr key={row.id}>
                          <td className="t-num px-3 py-2 font-mono text-[12px] text-[var(--ink-4)]">
                            {row.order}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge value={row.status} />
                          </td>
                          <td className="t-num px-3 py-2 text-right text-[12px] text-[var(--ink-3)]">
                            {formatDuration(row.runtime_ms)}
                          </td>
                          <td className="t-num px-3 py-2 text-right text-[12px] text-[var(--ink-3)]">
                            {formatBytes(row.memory_kb)}
                          </td>
                          <td className="px-3 py-2">
                            {row.is_sample ? (
                              <Badge tone="accent">namuna</Badge>
                            ) : (
                              <Badge tone="neutral">yashirin</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-[var(--edge)] px-4 py-2.5 text-[11px] text-[var(--ink-4)]">
                  Yashirin testlarning kirish/chiqishi saqlanmaydi (8-bo&apos;lim).
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

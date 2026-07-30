"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Flag, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterSelect, SegmentedControl } from "@/components/ui/field";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { ContentReport } from "@/lib/types";
import { formatNumber, formatRelative } from "@/lib/utils";

const reports = resource<ContentReport>("reports");

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  abuse: "Haqorat",
  solution_leak: "Yechim tarqatish",
  offtopic: "Mavzudan tashqari",
  other: "Boshqa",
};

export default function ReportsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const table = useTableQuery({ ordering: "-created_at" });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports", table.params],
    queryFn: () => reports.list(table.params),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["reports"] });
  };

  const resolveMutation = useCrudMutation((id: number) => reports.action(id, "resolve"), {
    invalidate: [["reports"]],
    successMessage: "Hal qilingan deb belgilandi",
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => reports.bulk(ids, action),
    { invalidate: [["reports"]] },
  );

  // Navbat ko'rsatkichlari mavjud so'rovdan olinadi: "Jami" serverdagi `count`,
  // ochiq/hal qilingan esa joriy sahifadagi qatorlardan ("shu sahifada").
  const rows = data?.results ?? [];
  const openOnPage = rows.filter((row) => !row.is_resolved).length;
  const resolvedOnPage = rows.filter((row) => row.is_resolved).length;

  const columns: Column<ContentReport>[] = [
    {
      key: "reason",
      header: t.discussions.reason,
      csv: (row) => row.reason,
      render: (row) => (
        <Badge tone={row.reason === "abuse" ? "danger" : "warning"}>
          <Flag className="size-3" />
          {REASON_LABELS[row.reason] ?? row.reason}
        </Badge>
      ),
    },
    {
      key: "content",
      header: "Kontent",
      csv: (row) => row.discussion_title ?? row.comment_excerpt ?? "",
      render: (row) => (
        <span className="line-clamp-2 max-w-md text-[13px] leading-relaxed text-[var(--ink-2)]">
          {row.discussion_title ?? row.comment_excerpt ?? "—"}
        </span>
      ),
    },
    {
      key: "reporter",
      header: "Shikoyatchi",
      csv: (row) => row.reporter_username,
      render: (row) =>
        row.reporter ? (
          <Link
            href={`/admin/users/${row.reporter}`}
            className="focus-ring rounded-[6px] text-[13px] text-[var(--ink-2)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            {row.reporter_username}
          </Link>
        ) : (
          <span className="text-[13px] text-[var(--ink-4)]">—</span>
        ),
    },
    {
      key: "note",
      header: "Izoh",
      hideable: true,
      csv: (row) => row.note,
      render: (row) => (
        <span className="line-clamp-1 max-w-xs text-[13px] text-[var(--ink-4)]">
          {row.note || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: t.common.status,
      csv: (row) => (row.is_resolved ? "resolved" : "open"),
      render: (row) =>
        row.is_resolved ? (
          <Badge tone="success" dot>
            {t.discussions.resolved}
          </Badge>
        ) : (
          <Badge tone="warning" dot>
            {t.discussions.unresolved}
          </Badge>
        ),
    },
    {
      key: "created_at",
      header: t.common.createdAt,
      sortKey: "created_at",
      csv: (row) => row.created_at,
      render: (row) => (
        <span className="t-num whitespace-nowrap text-[12.5px] text-[var(--ink-4)]">
          {formatRelative(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "4rem",
      render: (row) =>
        row.is_resolved ? null : (
          <Button
            variant="ghost"
            size="iconSm"
            className="text-[var(--ok)] hover:bg-[var(--ok-wash)] hover:text-[var(--ok)]"
            onClick={() => resolveMutation.mutate(row.id)}
            title={t.discussions.resolve}
            aria-label={t.discussions.resolve}
          >
            <CheckCircle2 className="size-3.5" />
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader title={t.nav.reports} description="Foydalanuvchi shikoyatlari navbati" />

      {/* Uchta ko'rsatkich — navbat holati bir qarashda ko'rinsin */}
      <div className="enter-stagger mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t.common.total}
          value={formatNumber(data?.count ?? 0)}
          hint="filtrga mos jami shikoyat"
          icon={<Flag className="size-4" />}
        />
        <StatCard
          label={t.discussions.unresolved}
          value={formatNumber(openOnPage)}
          hint="shu sahifada"
          tone="warning"
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label={t.discussions.resolved}
          value={formatNumber(resolvedOnPage)}
          hint="shu sahifada"
          tone="accent"
          icon={<CheckCircle2 className="size-4" />}
        />
      </div>

      {isError ? (
        <Alert
          tone="bad"
          title={t.common.error}
          className="mb-5"
          action={
            <Button size="xs" variant="outline" onClick={() => void refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Shikoyatlar navbatini yuklab bo&apos;lmadi.
        </Alert>
      ) : null}

      <DataTable
        rows={rows}
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
        exportName="codearena-shikoyatlar"
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        emptyTitle="Shikoyat yo'q"
        emptyDescription="Hozircha ko'rib chiqilishi kerak bo'lgan shikoyat yo'q."
        filtersSlot={
          <>
            <SegmentedControl
              stacked
              label="Holat"
              allLabel={t.common.all}
              value={table.filters.is_resolved as string}
              onChange={(next) => table.setFilter("is_resolved", next)}
              options={[
                { value: "false", label: t.discussions.unresolved, tone: "warning" },
                { value: "true", label: t.discussions.resolved, tone: "success" },
              ]}
            />
            <FilterSelect
              allLabel="Barcha sabablar"
              value={table.filters.reason as string}
              onChange={(next) => table.setFilter("reason", next)}
              options={Object.entries(REASON_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </>
        }
        bulkActions={[
          {
            key: "resolve",
            label: t.discussions.resolve,
            icon: <CheckCircle2 className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "resolve" }).then(invalidate),
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
    </>
  );
}

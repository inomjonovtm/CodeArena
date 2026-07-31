"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarClock, Play, Plus, Trash2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { LinkButton } from "@/components/kit";
import { useConfirm, useI18n } from "@/components/providers";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterSelect, SegmentedControl } from "@/components/ui/field";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { Contest, ContestState } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const contests = resource<Contest>("contests");

const STATE: Record<ContestState, { tone: BadgeTone; uz: string; en: string }> = {
  draft: { tone: "neutral", uz: "Qoralama", en: "Draft" },
  scheduled: { tone: "info", uz: "Rejalashtirilgan", en: "Scheduled" },
  running: { tone: "success", uz: "Davom etmoqda", en: "Running" },
  finished: { tone: "outline", uz: "Tugagan", en: "Finished" },
  cancelled: { tone: "danger", uz: "Bekor qilingan", en: "Cancelled" },
};

export default function ContestsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const table = useTableQuery({ ordering: "-start_time" });

  const { data, isLoading } = useQuery({
    queryKey: ["contests", table.params],
    queryFn: () => contests.list(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: ["contests", "summary"],
    queryFn: () =>
      contests.summary<{
        total: number;
        upcoming: number;
        running: number;
        finished: number;
        draft: number;
        total_participants: number;
      }>(),
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => contests.bulk(ids, action),
    { invalidate: [["contests"]] },
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["contests"] });
  };

  const columns: Column<Contest>[] = [
    {
      key: "title",
      header: t.contests.title,
      sortKey: "title_uz",
      csv: (row) => row.title_uz,
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <Link
            href={`/admin/contests/${row.id}`}
            className="focus-ring block max-w-sm truncate rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            {row.title_uz}
          </Link>
          <span className="block truncate font-mono text-[11px] text-[var(--ink-4)]">
            {row.slug}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: t.common.status,
      csv: (row) => row.computed_status,
      render: (row) => {
        const config = STATE[row.computed_status] ?? STATE.draft;
        return (
          <Badge tone={config.tone} dot>
            {config.uz}
          </Badge>
        );
      },
    },
    {
      key: "start",
      header: t.contests.startTime,
      sortKey: "start_time",
      csv: (row) => row.start_time,
      render: (row) => (
        <span className="t-num text-[12.5px] whitespace-nowrap text-[var(--ink-3)]">
          {formatDate(row.start_time)}
        </span>
      ),
    },
    {
      key: "duration",
      header: t.contests.duration,
      align: "right",
      hideable: true,
      csv: (row) => row.duration_minutes,
      render: (row) => (
        <span className="t-num text-[12.5px] text-[var(--ink-3)]">{row.duration_minutes} daq</span>
      ),
    },
    {
      key: "problems",
      header: t.contests.problems,
      align: "center",
      csv: (row) => row.problem_count,
      render: (row) => <span className="t-num text-[var(--ink-3)]">{row.problem_count}</span>,
    },
    {
      key: "participants",
      header: t.contests.participants,
      align: "center",
      csv: (row) => row.participant_count,
      render: (row) => (
        <span className="t-num inline-flex items-center gap-1 text-[var(--ink-3)]">
          <Users className="size-3.5 text-[var(--ink-4)]" />
          {row.participant_count}
        </span>
      ),
    },
    {
      key: "rated",
      header: t.contests.isRated,
      align: "center",
      csv: (row) => (row.is_rated ? "ha" : "yo'q"),
      render: (row) =>
        row.is_rated ? (
          <Badge tone={row.ratings_applied_at ? "success" : "accent"}>
            {row.ratings_applied_at ? t.contests.ratingsApplied : t.contests.isRated}
          </Badge>
        ) : (
          <span className="text-[12px] text-[var(--ink-4)]">—</span>
        ),
    },
    {
      key: "created_by",
      header: "Muallif",
      hideable: true,
      defaultHidden: true,
      csv: (row) => row.created_by_username,
      render: (row) => (
        <span className="text-[12.5px] text-[var(--ink-3)]">{row.created_by_username ?? "—"}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.contests.title}
        description={t.contests.subtitle}
        actions={
          <LinkButton
            href="/admin/contests/new"
            variant="primary"
            size="sm"
            icon={<Plus className="size-4" />}
          >
            {t.contests.newContest}
          </LinkButton>
        }
      />

      {/* --------------------------------------------------- KPI qatori */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(summary?.total ?? 0)}
          hint={`${formatNumber(summary?.draft ?? 0)} qoralama`}
          icon={<Trophy className="size-[17px]" />}
        />
        <StatCard
          label={t.contests.running}
          value={formatNumber(summary?.running ?? 0)}
          tone="accent"
          icon={<Play className="size-[17px]" />}
        />
        <StatCard
          label="Kutilmoqda"
          value={formatNumber(summary?.upcoming ?? 0)}
          tone="info"
          icon={<CalendarClock className="size-[17px]" />}
        />
        <StatCard
          label={t.contests.participants}
          value={formatNumber(summary?.total_participants ?? 0)}
          tone="neutral"
          icon={<Users className="size-[17px]" />}
          hint={`${formatNumber(summary?.finished ?? 0)} tugagan contest`}
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
        selectable
        serverExportUrl="/admin/contests/export"
        exportParams={table.params as Record<string, unknown>}
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        onRowClick={(row) => router.push(`/admin/contests/${row.id}`)}
        emptyTitle="Contest topilmadi"
        emptyDescription="Filtrlarni o'zgartiring yoki yangi musobaqa yarating."
        emptyAction={
          <LinkButton
            href="/admin/contests/new"
            variant="primary"
            size="sm"
            icon={<Plus className="size-4" />}
          >
            {t.contests.newContest}
          </LinkButton>
        }
        filtersSlot={
          <>
            <FilterSelect
              allLabel="Barcha holatlar"
              value={table.filters.status as string}
              onChange={(next) => table.setFilter("status", next)}
              options={[
                { value: "draft", label: t.problems.draft },
                { value: "scheduled", label: t.contests.scheduled },
                { value: "running", label: t.contests.running },
                { value: "finished", label: t.contests.finished },
                { value: "cancelled", label: t.contests.cancelled },
              ]}
            />
            <SegmentedControl
              stacked
              label="Reyting"
              allLabel={t.common.all}
              value={table.filters.is_rated as string}
              onChange={(next) => table.setFilter("is_rated", next)}
              options={[
                { value: "true", label: t.contests.isRated, tone: "accent" },
                { value: "false", label: "Reytingsiz", tone: "neutral" },
              ]}
            />
            <SegmentedControl
              stacked
              label="Ko‘rinish"
              allLabel={t.common.all}
              value={table.filters.visibility as string}
              onChange={(next) => table.setFilter("visibility", next)}
              options={[
                { value: "public", label: t.contests.public, tone: "success" },
                { value: "private", label: t.contests.private, tone: "neutral" },
              ]}
            />
          </>
        }
        bulkActions={[
          {
            key: "schedule",
            label: t.contests.scheduled,
            icon: <CalendarClock className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "schedule" }).then(invalidate),
          },
          {
            key: "cancel",
            label: t.contests.cancelled,
            icon: <Ban className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "cancel" }).then(invalidate),
          },
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: async (ids) => {
              const ok = await confirm({
                title: `${ids.length} ta musobaqani o'chirish`,
                message: "Musobaqalar ishtirokchilari va natijalari bilan birga o'chiriladi.",
                confirmLabel: t.common.delete,
                danger: true,
              });
              if (!ok) return;
              return bulkMutation.mutateAsync({ ids, action: "delete" }).then(invalidate);
            },
          },
        ]}
      />
    </>
  );
}

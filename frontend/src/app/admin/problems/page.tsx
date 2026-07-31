"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  Copy,
  Eye,
  FlaskConical,
  MoreHorizontal,
  Pencil,
  Plus,
  Puzzle,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProblemImportDialog } from "@/components/admin/import-dialog";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Button as KitButton, LinkButton } from "@/components/kit";
import { useConfirm, useI18n, useToast } from "@/components/providers";
import { Badge, DifficultyBadge, PublishBadge, TagChip } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterSelect, SegmentedControl } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { DropdownMenu } from "@/components/ui/popover";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { api, resource } from "@/lib/api";
import type { ProblemListItem, Tag } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const problems = resource<ProblemListItem>("problems");

export default function ProblemsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const table = useTableQuery();
  const [deleteTarget, setDeleteTarget] = useState<ProblemListItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["problems", table.params],
    queryFn: () => problems.list(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: ["problems", "summary"],
    queryFn: () =>
      problems.summary<{
        total: number;
        published: number;
        draft: number;
        archived: number;
        without_test_cases: number;
      }>(),
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<Tag[]>("/admin/tags/"),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["problems"] });
  };

  const removeMutation = useCrudMutation((id: string) => problems.remove(id), {
    invalidate: [["problems"]],
    successMessage: "Masala o'chirildi",
    onSuccess: () => setDeleteTarget(null),
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action, payload }: { ids: (string | number)[]; action: string; payload?: Record<string, unknown> }) =>
      problems.bulk(ids, action, payload),
    { invalidate: [["problems"]] },
  );

  const publishMutation = useCrudMutation((id: string) => problems.action(id, "publish"), {
    invalidate: [["problems"]],
    successMessage: t.problems.publishedSuccess,
  });

  const duplicateMutation = useCrudMutation(
    (id: string) => problems.action<ProblemListItem>(id, "duplicate"),
    {
      invalidate: [["problems"]],
      successMessage: t.problems.duplicatedSuccess,
      onSuccess: (created) => router.push(`/admin/problems/${created.id}`),
    },
  );

  const columns: Column<ProblemListItem>[] = [
    {
      key: "title",
      header: t.problems.titleUz,
      sortKey: "title_uz",
      csv: (row) => row.title_uz,
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <Link
            href={`/admin/problems/${row.id}`}
            className="focus-ring block max-w-md truncate rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            {row.title_uz}
          </Link>
          <span className="block max-w-md truncate font-mono text-[11px] text-[var(--ink-4)]">
            {row.slug}
          </span>
        </div>
      ),
    },
    {
      key: "difficulty",
      header: t.problems.difficulty,
      sortKey: "difficulty",
      csv: (row) => row.difficulty,
      render: (row) => <DifficultyBadge value={row.difficulty} />,
    },
    {
      key: "status",
      header: t.common.status,
      csv: (row) => row.status,
      render: (row) => <PublishBadge value={row.status} />,
    },
    {
      key: "tags",
      header: t.problems.tags,
      hideable: true,
      csv: (row) => row.tags.map((tag) => tag.name_uz).join(" | "),
      render: (row) => (
        <div className="flex max-w-[13rem] flex-wrap gap-1">
          {row.tags.slice(0, 2).map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
          {row.tags.length > 2 ? (
            <span className="t-num text-[11px] text-[var(--ink-4)]">+{row.tags.length - 2}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "points",
      header: t.problems.points,
      sortKey: "points",
      align: "right",
      hideable: true,
      csv: (row) => row.points,
      render: (row) => <span className="t-num text-[var(--ink-3)]">{row.points}</span>,
    },
    {
      key: "tests",
      header: t.problems.testCases,
      align: "center",
      csv: (row) => row.test_case_count,
      render: (row) =>
        row.test_case_count > 0 ? (
          <span className="t-num inline-flex items-center gap-1 text-[13px] text-[var(--ink-3)]">
            <FlaskConical className="size-3.5 text-[var(--ink-4)]" />
            {row.test_case_count}
          </span>
        ) : (
          <Badge tone="danger">0</Badge>
        ),
    },
    {
      key: "submissions",
      header: t.problems.submissions,
      sortKey: "total_submissions",
      align: "right",
      hideable: true,
      csv: (row) => row.total_submissions,
      render: (row) => (
        <span className="t-num text-[var(--ink-3)]">{formatNumber(row.total_submissions)}</span>
      ),
    },
    {
      key: "acceptance",
      header: t.problems.acceptance,
      align: "right",
      csv: (row) => row.acceptance_rate,
      render: (row) => <span className="t-num text-[var(--ink-3)]">{row.acceptance_rate}%</span>,
    },
    {
      key: "created_at",
      header: t.common.createdAt,
      sortKey: "created_at",
      hideable: true,
      defaultHidden: true,
      csv: (row) => row.created_at,
      render: (row) => (
        <span className="t-num text-[12px] whitespace-nowrap text-[var(--ink-4)]">
          {formatDate(row.created_at, false)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "5.5rem",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
          <ButtonLink
            href={`/admin/problems/${row.id}`}
            variant="ghost"
            size="iconSm"
            aria-label={t.common.edit}
            title={t.common.edit}
          >
            <Pencil className="size-3.5" />
          </ButtonLink>
          <DropdownMenu
            trigger={<MoreHorizontal className="size-3.5" />}
            triggerLabel={t.common.actions}
            items={[
              row.status !== "published"
                ? {
                    key: "publish",
                    label: t.problems.publish,
                    icon: <CheckCircle2 className="size-3.5 text-[var(--ok)]" />,
                    onSelect: () => publishMutation.mutate(row.id),
                  }
                : {
                    key: "unpublish",
                    label: t.problems.unpublish,
                    icon: <XCircle className="size-3.5" />,
                    onSelect: () => bulkMutation.mutate({ ids: [row.id], action: "unpublish" }),
                  },
              {
                key: "duplicate",
                label: t.common.duplicate,
                icon: <Copy className="size-3.5" />,
                onSelect: () => duplicateMutation.mutate(row.id),
              },
              {
                key: "preview",
                label: t.common.preview,
                icon: <Eye className="size-3.5" />,
                href: `/problems/${row.slug}`,
                external: true,
              },
              {
                key: "delete",
                label: t.common.delete,
                icon: <Trash2 className="size-3.5" />,
                danger: true,
                separatorBefore: true,
                onSelect: () => setDeleteTarget(row),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.problems.title}
        description={t.problems.subtitle}
        actions={
          <>
            <KitButton
              variant="quiet"
              size="sm"
              icon={<Upload className="size-4" />}
              onClick={() => setImportOpen(true)}
            >
              Import
            </KitButton>
            <LinkButton
              href="/admin/problems/new"
              variant="primary"
              size="sm"
              icon={<Plus className="size-4" />}
            >
              {t.problems.newProblem}
            </LinkButton>
          </>
        }
      />

      <ProblemImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={invalidate}
      />

      {/* --------------------------------------------------- KPI qatori */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(summary?.total ?? 0)}
          icon={<Puzzle className="size-[17px]" />}
          hint={`${formatNumber(summary?.archived ?? 0)} arxivlangan`}
        />
        <StatCard
          label={t.problems.published}
          value={formatNumber(summary?.published ?? 0)}
          tone="accent"
        />
        <StatCard
          label={t.problems.draft}
          value={formatNumber(summary?.draft ?? 0)}
          tone="neutral"
        />
        <StatCard
          label={t.problems.withoutTests}
          value={formatNumber(summary?.without_test_cases ?? 0)}
          tone={summary?.without_test_cases ? "danger" : "neutral"}
          hint={summary?.without_test_cases ? "chop etib bo'lmaydi" : undefined}
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
        searchPlaceholder="Sarlavha yoki slug bo'yicha..."
        selectable
        serverExportUrl="/admin/problems/export"
        exportParams={table.params as Record<string, unknown>}
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        emptyTitle="Masala topilmadi"
        emptyDescription="Filtrlarni o'zgartiring yoki yangi masala qo'shing."
        emptyAction={
          <LinkButton
            href="/admin/problems/new"
            variant="primary"
            size="sm"
            icon={<Plus className="size-4" />}
          >
            {t.problems.newProblem}
          </LinkButton>
        }
        filtersSlot={
          <>
            <SegmentedControl
              stacked
              label="Qiyinlik"
              allLabel={t.common.all}
              value={table.filters.difficulty as string}
              onChange={(next) => table.setFilter("difficulty", next)}
              options={[
                { value: "easy", label: t.problems.easy, tone: "success" },
                { value: "medium", label: t.problems.medium, tone: "warning" },
                { value: "hard", label: t.problems.hard, tone: "danger" },
              ]}
            />
            <SegmentedControl
              stacked
              label="Holat"
              allLabel={t.common.all}
              value={table.filters.status as string}
              onChange={(next) => table.setFilter("status", next)}
              options={[
                { value: "draft", label: t.problems.draft, tone: "neutral" },
                { value: "published", label: t.problems.published, tone: "success" },
                { value: "archived", label: t.problems.archived, tone: "warning" },
              ]}
            />
            <FilterSelect
              allLabel="Barcha teglar"
              value={table.filters.tag_slug as string}
              onChange={(next) => table.setFilter("tag_slug", next)}
              options={(tags ?? []).map((tag) => ({
                value: tag.slug,
                label: tag.name_uz,
              }))}
            />
            <SegmentedControl
              stacked
              label="Testlar"
              allLabel={t.common.all}
              value={table.filters.has_test_cases as string}
              onChange={(next) => table.setFilter("has_test_cases", next)}
              options={[
                { value: "true", label: "Bor", tone: "success" },
                { value: "false", label: "Yo‘q", tone: "danger" },
              ]}
            />
          </>
        }
        bulkActions={[
          {
            key: "publish",
            label: t.problems.publish,
            icon: <CheckCircle2 className="size-3.5" />,
            onRun: (ids) =>
              bulkMutation.mutateAsync({ ids, action: "publish" }).then(() => {
                toast.success(`${ids.length} ta masala chop etildi`);
                invalidate();
              }),
          },
          {
            key: "unpublish",
            label: t.problems.unpublish,
            icon: <XCircle className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "unpublish" }).then(invalidate),
          },
          {
            key: "archive",
            label: t.problems.archive,
            icon: <Archive className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "archive" }).then(invalidate),
          },
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: async (ids) => {
              const ok = await confirm({
                title: `${ids.length} ta masalani o'chirish`,
                message: "Masalalar test-case va submissionlari bilan birga o'chiriladi.",
                confirmLabel: t.common.delete,
                danger: true,
              });
              if (!ok) return;
              return bulkMutation.mutateAsync({ ids, action: "delete" }).then(invalidate);
            },
          },
        ]}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMutation.mutate(deleteTarget.id)}
        loading={removeMutation.isPending}
        title={t.common.delete}
        message={
          <>
            <strong>{deleteTarget ? deleteTarget.title_uz : ""}</strong>{" "}
            masalasi, uning barcha test-case va submissionlari bilan birga o&apos;chiriladi.
          </>
        }
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

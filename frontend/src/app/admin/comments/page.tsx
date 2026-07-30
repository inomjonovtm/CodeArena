"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Flag, MessageSquare, ThumbsUp, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useConfirm, useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SegmentedControl } from "@/components/ui/field";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { Comment } from "@/lib/types";
import { formatNumber, formatRelative } from "@/lib/utils";

const comments = resource<Comment>("comments");

export default function CommentsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const table = useTableQuery();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["comments", table.params],
    queryFn: () => comments.list(table.params),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["comments"] });
  };

  const updateMutation = useCrudMutation(
    ({ id, patch }: { id: string; patch: Partial<Comment> }) => comments.update(id, patch),
    { invalidate: [["comments"]], successMessage: "Saqlandi" },
  );

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => comments.bulk(ids, action),
    { invalidate: [["comments"]] },
  );

  // KPI'lar faqat mavjud so'rovdan hisoblanadi — yangi so'rov qo'shilmagan.
  // "Jami" serverdan (`count`), qolgan uchtasi joriy sahifadagi qatorlardan,
  // shuning uchun ularda "shu sahifada" izohi turadi.
  const rows = data?.results ?? [];
  const visibleOnPage = rows.filter((row) => row.status === "visible").length;
  const hiddenOnPage = rows.filter((row) => row.status === "hidden").length;
  const flaggedOnPage = rows.filter((row) => row.flagged_count > 0).length;

  const columns: Column<Comment>[] = [
    {
      key: "body",
      header: "Izoh",
      csv: (row) => row.body_md,
      render: (row) => (
        <p className="line-clamp-2 max-w-lg text-[13px] leading-relaxed text-[var(--ink-2)]">
          {row.body_md}
        </p>
      ),
    },
    {
      key: "author",
      header: t.discussions.author,
      csv: (row) => row.author_username,
      render: (row) =>
        row.author ? (
          <Link
            href={`/admin/users/${row.author}`}
            className="focus-ring rounded-[6px] text-[13px] text-[var(--ink-2)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            {row.author_username}
          </Link>
        ) : (
          <span className="text-[13px] text-[var(--ink-4)]">—</span>
        ),
    },
    {
      key: "discussion",
      header: "Mavzu",
      hideable: true,
      csv: (row) => row.discussion_title,
      render: (row) => (
        <span className="line-clamp-1 max-w-[14rem] text-[13px] text-[var(--ink-4)]">
          {row.discussion_title}
        </span>
      ),
    },
    {
      key: "status",
      header: t.common.status,
      csv: (row) => row.status,
      render: (row) =>
        row.status === "visible" ? (
          <Badge tone="success" dot>
            {t.discussions.visible}
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            {t.discussions.hidden}
          </Badge>
        ),
    },
    {
      key: "upvotes",
      header: t.discussions.upvotes,
      sortKey: "upvotes",
      align: "right",
      csv: (row) => row.upvotes,
      render: (row) => (
        <span className="t-num inline-flex items-center gap-1 text-[13px] text-[var(--ink-2)]">
          <ThumbsUp className="size-3.5 text-[var(--ink-4)]" />
          {row.upvotes}
        </span>
      ),
    },
    {
      key: "flagged",
      header: t.discussions.flagged,
      sortKey: "flagged_count",
      align: "right",
      csv: (row) => row.flagged_count,
      render: (row) =>
        row.flagged_count ? (
          <Badge tone="danger">
            <Flag className="size-3" />
            <span className="t-num">{row.flagged_count}</span>
          </Badge>
        ) : (
          <span className="text-[13px] text-[var(--ink-4)]">—</span>
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
      render: (row) => (
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() =>
            updateMutation.mutate({
              id: row.id,
              patch: { status: row.status === "visible" ? "hidden" : "visible" },
            })
          }
          title={row.status === "visible" ? t.discussions.hide : t.discussions.show}
          aria-label={row.status === "visible" ? t.discussions.hide : t.discussions.show}
        >
          {row.status === "visible" ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.nav.comments} description="Izohlarni moderatsiya qilish" />

      <div className="enter-stagger mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(data?.count ?? 0)}
          hint="filtrga mos jami izoh"
          icon={<MessageSquare className="size-4" />}
        />
        <StatCard
          label={t.discussions.visible}
          value={formatNumber(visibleOnPage)}
          hint="shu sahifada"
          tone="info"
          icon={<Eye className="size-4" />}
        />
        <StatCard
          label={t.discussions.hidden}
          value={formatNumber(hiddenOnPage)}
          hint="shu sahifada"
          tone="neutral"
          icon={<EyeOff className="size-4" />}
        />
        <StatCard
          label={t.discussions.flagged}
          value={formatNumber(flaggedOnPage)}
          hint="shu sahifada"
          tone="danger"
          icon={<Flag className="size-4" />}
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
          Izohlar ro&apos;yxatini yuklab bo&apos;lmadi.
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
        exportName="codearena-izohlar"
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        emptyTitle="Izoh topilmadi"
        emptyDescription="Tanlangan holat bo'yicha izoh yo'q — filtrlarni tozalab ko'ring."
        filtersSlot={
          <SegmentedControl
            stacked
            label="Holat"
            allLabel={t.common.all}
            value={table.filters.status as string}
            onChange={(next) => table.setFilter("status", next)}
            options={[
              { value: "visible", label: t.discussions.visible, tone: "success" },
              { value: "hidden", label: t.discussions.hidden, tone: "neutral" },
              { value: "flagged", label: t.discussions.flagged, tone: "warning" },
            ]}
          />
        }
        bulkActions={[
          {
            key: "hide",
            label: t.discussions.hide,
            icon: <EyeOff className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "hide" }).then(invalidate),
          },
          {
            key: "show",
            label: t.discussions.show,
            icon: <Eye className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "show" }).then(invalidate),
          },
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: async (ids) => {
              const ok = await confirm({
                title: `${ids.length} ta izohni o'chirish`,
                message: "Tanlangan izohlar butunlay o'chiriladi.",
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

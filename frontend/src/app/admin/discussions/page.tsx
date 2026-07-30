"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Flag,
  Lock,
  MessageSquare,
  Pin,
  ThumbsUp,
  Trash2,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useConfirm, useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, SegmentedControl, Switch, Textarea } from "@/components/ui/field";
import { Markdown } from "@/components/ui/markdown";
import { Drawer } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { api, resource } from "@/lib/api";
import type { Comment, Discussion } from "@/lib/types";
import { formatDate, formatNumber, formatRelative } from "@/lib/utils";

const discussions = resource<Discussion>("discussions");

// Drawer ichidagi har bir blok o'z oq kartasida turadi; kartaning ICHIDAGI
// elementlar esa botiq (`pane-sunken`) — oq ustiga oq karta qo'yilmaydi.
const BAND = "pane rounded-[var(--r-pane)] p-4";

interface ModerationDraft {
  status: Discussion["status"];
  is_pinned: boolean;
  is_locked: boolean;
  moderation_note: string;
}

export default function DiscussionsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const table = useTableQuery();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["discussions", table.params],
    queryFn: () => discussions.list(table.params),
  });

  const { data: detail } = useQuery({
    queryKey: ["discussions", openId],
    queryFn: () => discussions.retrieve(openId as string),
    enabled: Boolean(openId),
  });

  const { data: comments } = useQuery({
    queryKey: ["discussions", openId, "comments"],
    queryFn: () => api.get<Comment[]>(`/admin/discussions/${openId}/comments/`),
    enabled: Boolean(openId),
  });

  // Moderatsiya formasi lokal holatda turadi. Ilgari u `queryClient.setQueryData`
  // orqali kesh ichida saqlanardi — refetch bo'lishi bilan saqlanmagan
  // o'zgarishlar sezdirmasdan yo'qolib ketardi.
  const [draft, setDraft] = useState<ModerationDraft | null>(null);

  useEffect(() => {
    if (!detail) {
      setDraft(null);
      return;
    }
    setDraft({
      status: detail.status,
      is_pinned: detail.is_pinned,
      is_locked: detail.is_locked,
      moderation_note: detail.moderation_note ?? "",
    });
    // Faqat boshqa muhokama ochilganda tiklaymiz — fon refetch'i
    // yozilayotgan matnni o'chirib yubormasligi kerak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id]);

  const isDirty = Boolean(
    detail &&
      draft &&
      (draft.status !== detail.status ||
        draft.is_pinned !== detail.is_pinned ||
        draft.is_locked !== detail.is_locked ||
        draft.moderation_note !== (detail.moderation_note ?? "")),
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["discussions"] });
  };

  const updateMutation = useCrudMutation(
    ({ id, patch }: { id: string; patch: Partial<Discussion> }) => discussions.update(id, patch),
    { invalidate: [["discussions"]], successMessage: "Saqlandi" },
  );

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => discussions.bulk(ids, action),
    { invalidate: [["discussions"]] },
  );

  // KPI'lar mavjud ro'yxat so'rovidan hisoblanadi — yangi so'rov qo'shilmagan.
  const rows = data?.results ?? [];
  const visibleOnPage = rows.filter((row) => row.status === "visible").length;
  const flaggedOnPage = rows.filter((row) => row.flagged_count > 0).length;
  const lockedOnPage = rows.filter((row) => row.is_locked).length;

  const columns: Column<Discussion>[] = [
    {
      key: "title",
      header: "Mavzu",
      csv: (row) => row.title,
      render: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setOpenId(row.id)}
            className="focus-ring flex items-center gap-1.5 rounded-[6px] text-left"
            title="Moderatsiya panelini ochish"
            aria-label={`${row.title} — moderatsiya`}
          >
            {row.is_pinned ? (
              <Pin className="size-3 shrink-0 text-[var(--brand)]" />
            ) : null}
            {row.is_locked ? <Lock className="size-3 shrink-0 text-[var(--ink-4)]" /> : null}
            <span className="max-w-sm truncate text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]">
              {row.title}
            </span>
          </button>
        </div>
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
      key: "status",
      header: t.common.status,
      csv: (row) => row.status,
      render: (row) =>
        row.status === "visible" ? (
          <Badge tone="success" dot>
            {t.discussions.visible}
          </Badge>
        ) : row.status === "flagged" ? (
          <Badge tone="warning" dot>
            {t.discussions.flagged}
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
      key: "comments",
      header: t.discussions.commentCount,
      sortKey: "comment_count",
      align: "right",
      csv: (row) => row.comment_count,
      render: (row) => (
        <span className="t-num inline-flex items-center gap-1 text-[13px] text-[var(--ink-2)]">
          <MessageSquare className="size-3.5 text-[var(--ink-4)]" />
          {row.comment_count}
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
      width: "6rem",
      render: (row) => (
        <div className="flex justify-end gap-0.5">
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
            {row.status === "visible" ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() =>
              updateMutation.mutate({ id: row.id, patch: { is_locked: !row.is_locked } })
            }
            title={row.is_locked ? t.discussions.unlock : t.discussions.lock}
            aria-label={row.is_locked ? t.discussions.unlock : t.discussions.lock}
          >
            {row.is_locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.discussions.title} description={t.discussions.subtitle} />

      <div className="enter-stagger mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(data?.count ?? 0)}
          hint="filtrga mos jami muhokama"
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
          label={t.discussions.flagged}
          value={formatNumber(flaggedOnPage)}
          hint="shu sahifada"
          tone="danger"
          icon={<Flag className="size-4" />}
        />
        <StatCard
          label={t.discussions.lock}
          value={formatNumber(lockedOnPage)}
          hint="shu sahifada"
          tone="neutral"
          icon={<Lock className="size-4" />}
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
          Muhokamalar ro&apos;yxatini yuklab bo&apos;lmadi.
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
        exportName="codearena-muhokamalar"
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        emptyTitle="Muhokama topilmadi"
        emptyDescription="Tanlangan filtrlarga mos muhokama yo'q."
        filtersSlot={
          <>
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
            <SegmentedControl
              stacked
              label="Qadalgan"
              allLabel={t.common.all}
              value={table.filters.is_pinned as string}
              onChange={(next) => table.setFilter("is_pinned", next)}
              options={[
                { value: "true", label: "Ha", tone: "accent" },
                { value: "false", label: "Yo‘q", tone: "neutral" },
              ]}
            />
            <SegmentedControl
              stacked
              label="Yozish"
              allLabel={t.common.all}
              value={table.filters.is_locked as string}
              onChange={(next) => table.setFilter("is_locked", next)}
              options={[
                { value: "false", label: "Ochiq", tone: "success" },
                { value: "true", label: "Yopilgan", tone: "neutral" },
              ]}
            />
          </>
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
            key: "lock",
            label: t.discussions.lock,
            icon: <Lock className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "lock" }).then(invalidate),
          },
          {
            key: "pin",
            label: t.discussions.pin,
            icon: <Pin className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "pin" }).then(invalidate),
          },
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: async (ids) => {
              const ok = await confirm({
                title: `${ids.length} ta muhokamani o'chirish`,
                message: "Muhokamalar barcha izohlari bilan birga o'chiriladi.",
                confirmLabel: t.common.delete,
                danger: true,
              });
              if (!ok) return;
              return bulkMutation.mutateAsync({ ids, action: "delete" }).then(invalidate);
            },
          },
        ]}
      />

      <Drawer
        open={Boolean(openId)}
        onClose={async () => {
          if (isDirty) {
            const ok = await confirm({
              title: "Saqlanmagan o'zgarishlar",
              message: "Moderatsiya o'zgarishlari saqlanmagan. Yopilsinmi?",
              confirmLabel: "Yopish",
              cancelLabel: "Tahrirni davom ettirish",
              danger: true,
            });
            if (!ok) return;
          }
          setOpenId(null);
        }}
        title={detail?.title ?? t.common.loading}
        description={
          detail ? `${detail.author_username ?? "—"} · ${formatDate(detail.created_at)}` : undefined
        }
        width="max-w-2xl"
        footer={
          detail && draft ? (
            <>
              {isDirty ? (
                <span className="mr-auto text-[12.5px] text-[var(--warn)]">
                  Saqlanmagan o&apos;zgarishlar bor
                </span>
              ) : null}
              <Button
                size="sm"
                disabled={!isDirty}
                loading={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: detail.id, patch: draft })}
                title={t.common.save}
              >
                {t.common.save}
              </Button>
            </>
          ) : null
        }
      >
        {detail && draft ? (
          <div className="flex flex-col gap-4">
            <div className={BAND}>
              <Markdown source={detail.body_md} />
            </div>

            <div className={BAND}>
              <p className="t-eyebrow mb-4">Moderatsiya</p>
              <div className="flex flex-col gap-4">
                <Field label={t.common.status}>
                  <SegmentedControl
                    stacked
                    value={draft.status}
                    onChange={(next) =>
                      setDraft({ ...draft, status: next as Discussion["status"] })
                    }
                    ariaLabel={t.common.status}
                    options={[
                      { value: "visible", label: t.discussions.visible, tone: "success" },
                      { value: "hidden", label: t.discussions.hidden, tone: "neutral" },
                      { value: "flagged", label: t.discussions.flagged, tone: "warning" },
                    ]}
                  />
                </Field>
                <Switch
                  checked={draft.is_pinned}
                  onChange={(next) => setDraft({ ...draft, is_pinned: next })}
                  label={t.discussions.pin}
                />
                <Switch
                  checked={draft.is_locked}
                  onChange={(next) => setDraft({ ...draft, is_locked: next })}
                  label={t.discussions.lock}
                  description="Yangi izoh qo'shib bo'lmaydi"
                />
                <Field label={t.discussions.moderationNote}>
                  <Textarea
                    rows={2}
                    value={draft.moderation_note}
                    onChange={(event) =>
                      setDraft({ ...draft, moderation_note: event.target.value })
                    }
                  />
                </Field>
              </div>
            </div>

            <div className={BAND}>
              <p className="t-eyebrow mb-3">
                {t.nav.comments} <span className="t-num">({comments?.length ?? 0})</span>
              </p>
              {/* Karta ichida botiq kataklar — karta ichida karta emas */}
              <div className="flex flex-col gap-2.5">
                {comments?.length ? (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="pane-sunken rounded-[var(--r-ctl)] px-3.5 py-3"
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="font-medium text-[var(--ink)]">
                          {comment.author_username ?? "—"}
                        </span>
                        <span className="t-num text-[var(--ink-4)]">
                          {formatRelative(comment.created_at)}
                        </span>
                        {comment.status !== "visible" ? (
                          <Badge tone="neutral">{comment.status}</Badge>
                        ) : null}
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--ink-2)]">
                        {comment.body_md}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="t-meta text-[var(--ink-4)]">{t.common.noData}</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

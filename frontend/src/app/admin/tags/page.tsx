"use client";

import { useQuery } from "@tanstack/react-query";
import { Hash, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Button as KitButton } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api, resource } from "@/lib/api";
import type { Tag } from "@/lib/types";
import { cn, formatDate, formatNumber, slugify } from "@/lib/utils";

const tags = resource<Tag>("tags");

/* Teg ranglari — brend ko'kdan boshlab, semantik va neytral ottenkalar. */
const PRESET_COLORS = [
  "#1f6feb", "#1a479c", "#4f46e5", "#7c3aed", "#0e7490", "#0f766e",
  "#14804a", "#65a30d", "#b45309", "#c2410c", "#c2323c", "#736f66",
];

interface TagDraft {
  id?: number;
  name_uz: string;
  slug: string;
  color: string;
  description: string;
}

const emptyDraft: TagDraft = {
  name_uz: "",
  slug: "",
  color: "#1f6feb",
  description: "",
};

export default function TagsPage() {
  const { t } = useI18n();
  const [draft, setDraft] = useState<TagDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tags", search],
    queryFn: () => api.get<Tag[]>("/admin/tags/", { search: search || undefined }),
  });

  const saveMutation = useCrudMutation(
    (payload: TagDraft) => {
      // Backendda `name_en` hali majburiy (ustun bazada qoldirilgan), lekin
      // panelda ikkinchi til maydoni yo'q — qiymat o'zbekchasidan olinadi.
      const body = { ...payload, name_en: payload.name_uz };
      return payload.id ? tags.update(payload.id, body) : tags.create(body);
    },
    {
      invalidate: [["tags"]],
      successMessage: "Teg saqlandi",
      onSuccess: () => setDraft(null),
    },
  );

  const deleteMutation = useCrudMutation((id: number) => tags.remove(id), {
    invalidate: [["tags"]],
    successMessage: "Teg o'chirildi",
    onSuccess: () => setDeleteTarget(null),
  });

  // KPI faqat filtrsiz ko'rinishda — qidiruv natijasi jami sonni buzmasin
  const linked = (data ?? []).reduce((sum, row) => sum + row.problem_count, 0);
  const unused = (data ?? []).filter((row) => row.problem_count === 0).length;

  const columns: Column<Tag>[] = [
    {
      key: "name",
      header: "Nomi",
      csv: (row) => row.name_uz,
      mobilePrimary: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[var(--ink)]">
              {row.name_uz}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      csv: (row) => row.slug,
      render: (row) => (
        <span className="font-mono text-[12px] text-[var(--ink-3)]">{row.slug}</span>
      ),
    },
    {
      key: "description",
      header: "Tavsif",
      hideable: true,
      csv: (row) => row.description,
      render: (row) => (
        <span className="line-clamp-1 max-w-sm text-[12.5px] text-[var(--ink-3)]">
          {row.description || "—"}
        </span>
      ),
    },
    {
      key: "problem_count",
      header: t.nav.problems,
      align: "right",
      csv: (row) => row.problem_count,
      render: (row) => (
        <span
          className={cn(
            "t-num",
            row.problem_count > 0 ? "text-[var(--ink-2)]" : "text-[var(--ink-4)]",
          )}
        >
          {row.problem_count}
        </span>
      ),
    },
    {
      key: "created_at",
      header: t.common.createdAt,
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
      align: "right",
      width: "5rem",
      render: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setDraft({ ...row })}
            aria-label={t.common.edit}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
            onClick={() => setDeleteTarget(row)}
            aria-label={t.common.delete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.tags}
        description="Masalalarni turkumlash uchun teglar"
        actions={
          <KitButton
            variant="primary"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => setDraft({ ...emptyDraft })}
          >
            {t.common.create}
          </KitButton>
        }
      />

      {!search && data ? (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t.common.total}
            value={formatNumber(data.length)}
            icon={<Hash className="size-[17px]" />}
          />
          <StatCard
            label="Masalaga biriktirilgan"
            value={formatNumber(linked)}
            tone="accent"
            hint="teg–masala bog'lanishlari"
          />
          <StatCard
            label="Ishlatilmagan"
            value={formatNumber(unused)}
            tone={unused ? "warning" : "neutral"}
          />
        </div>
      ) : null}

      <DataTable
        rows={data ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        exportName="codearena-teglar"
        emptyTitle="Teg topilmadi"
        emptyDescription="Yangi teg qo'shing yoki qidiruvni tozalang."
        emptyAction={
          <KitButton
            variant="primary"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => setDraft({ ...emptyDraft })}
          >
            {t.common.create}
          </KitButton>
        }
      />

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? t.common.edit : t.common.create}
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={saveMutation.isPending}
              onClick={() => draft && saveMutation.mutate(draft)}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="flex flex-col gap-4">
            <Field label="Nomi" required>
              <Input
                autoFocus
                value={draft.name_uz}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    name_uz: event.target.value,
                    // Slug faqat yangi tegda avtomatik: mavjud tegning
                    // manzilini o'zgartirish eski havolalarni buzardi.
                    slug: draft.id ? draft.slug : slugify(event.target.value),
                  })
                }
                placeholder="Massiv"
              />
            </Field>

            <Field label="Slug" hint="Bo'sh qoldirilsa avtomatik yaratiladi">
              <Input
                value={draft.slug}
                onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                className="font-mono"
                placeholder="array"
              />
            </Field>

            {/* Rang tanlash — botiq maydonda, tanlangani halqa bilan */}
            <div className="pane-sunken rounded-[var(--r-field)] p-4">
              <p className="t-eyebrow mb-3">Rang</p>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setDraft({ ...draft, color })}
                    className={cn(
                      "focus-ring size-7 rounded-full transition-shadow duration-[var(--t-fast)]",
                      draft.color === color
                        ? "shadow-[0_0_0_2px_var(--pane),0_0_0_4px_var(--ink)]"
                        : "shadow-[0_0_0_2px_var(--pane),0_0_0_3px_var(--edge)]",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                    aria-pressed={draft.color === color}
                  />
                ))}
                <Input
                  value={draft.color}
                  onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                  className="ml-2 w-28 font-mono"
                  aria-label="Rang kodi"
                />
              </div>
            </div>

            <Field label="Tavsif">
              <Textarea
                rows={2}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={t.common.delete}
        message={`"${deleteTarget?.name_uz}" tegi o'chiriladi. Masalalardan ham olib tashlanadi.`}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Star,
  Terminal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge, PublishBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { AdminCourse, CourseLanguage, CourseLevel } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const courses = resource<AdminCourse>("courses");

const LANGUAGES: { value: CourseLanguage; label: string; badge: string; color: string }[] = [
  { value: "python", label: "Python", badge: "Py", color: "#3776ab" },
  { value: "javascript", label: "JavaScript", badge: "JS", color: "#f7df1e" },
  { value: "cpp", label: "C++", badge: "C++", color: "#00599c" },
];

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "beginner", label: "Boshlang'ich" },
  { value: "intermediate", label: "O'rta" },
  { value: "advanced", label: "Yuqori" },
];

interface Draft {
  id?: string;
  slug: string;
  title_uz: string;
  subtitle_uz: string;
  description_uz: string;
  language: CourseLanguage;
  level: CourseLevel;
  status: string;
  badge: string;
  accent_color: string;
  order: number;
  is_featured: boolean;
  estimated_hours: number;
}

const emptyDraft: Draft = {
  slug: "",
  title_uz: "",
  subtitle_uz: "",
  description_uz: "",
  language: "python",
  level: "beginner",
  status: "draft",
  badge: "Py",
  accent_color: "#3776ab",
  order: 0,
  is_featured: false,
  estimated_hours: 0,
};

const toDraft = (row: AdminCourse): Draft => ({
  id: row.id,
  slug: row.slug,
  title_uz: row.title_uz,
  subtitle_uz: row.subtitle_uz,
  description_uz: row.description_uz,
  language: row.language,
  level: row.level,
  status: row.status,
  badge: row.badge,
  accent_color: row.accent_color,
  order: row.order,
  is_featured: row.is_featured,
  estimated_hours: row.estimated_hours,
});

/** Sarlavhadan slug yasaydi — o'zbekcha apostrof va bo'shliqlarni tozalaydi. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

export default function AdminCoursesPage() {
  const { t } = useI18n();
  const table = useTableQuery();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCourse | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-courses", table.params],
    queryFn: () => courses.list(table.params),
  });

  const saveMutation = useCrudMutation(
    (payload: Draft) => {
      const body = { ...payload };
      return payload.id ? courses.update(payload.id, body) : courses.create(body);
    },
    {
      invalidate: [["admin-courses"]],
      successMessage: "Saqlandi",
      onSuccess: () => setDraft(null),
    },
  );

  const deleteMutation = useCrudMutation((id: string) => courses.remove(id), {
    invalidate: [["admin-courses"]],
    successMessage: "Savatchaga ko'chirildi",
    onSuccess: () => setDeleteTarget(null),
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => courses.bulk(ids, action),
    { invalidate: [["admin-courses"]] },
  );

  const rows = data?.results ?? [];
  const published = rows.filter((row) => row.status === "published").length;
  const lessons = rows.reduce((sum, row) => sum + row.lesson_count, 0);
  const exercises = rows.reduce((sum, row) => sum + row.exercise_count, 0);

  const columns: Column<AdminCourse>[] = [
    {
      key: "title",
      header: "Kurs",
      sortKey: "title_uz",
      mobilePrimary: true,
      csv: (row) => row.title_uz,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="t-num grid size-8 shrink-0 place-items-center rounded-[var(--r-ctl)] text-[11px] font-bold"
            style={{
              color: row.accent_color || "var(--brand)",
              backgroundColor: `color-mix(in oklab, ${row.accent_color || "var(--brand)"} 14%, transparent)`,
            }}
          >
            {row.badge || row.language.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <Link
              href={`/admin/courses/${row.id}`}
              className="focus-ring block truncate text-[13px] font-medium text-[var(--ink)] hover:text-[var(--brand)]"
            >
              {row.title_uz}
              {row.is_featured ? (
                <Star className="ml-1.5 inline size-3 fill-[var(--warn)] text-[var(--warn)]" />
              ) : null}
            </Link>
            <p className="t-num truncate text-[11.5px] text-[var(--ink-4)]">/{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "language",
      header: "Til",
      csv: (row) => row.language,
      render: (row) => (
        <Badge tone="neutral">
          {LANGUAGES.find((item) => item.value === row.language)?.label ?? row.language}
        </Badge>
      ),
    },
    {
      key: "structure",
      header: "Tuzilma",
      align: "center",
      csv: (row) => `${row.module_count}/${row.lesson_count}/${row.exercise_count}`,
      render: (row) => (
        <span className="t-num inline-flex items-center gap-3 text-[12px] text-[var(--ink-3)]">
          <span title="Bo'limlar" className="inline-flex items-center gap-1">
            <Layers className="size-3.5 text-[var(--ink-4)]" />
            {row.module_count}
          </span>
          <span title="Mavzular" className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5 text-[var(--ink-4)]" />
            {row.lesson_count}
          </span>
          <span title="Topshiriqlar" className="inline-flex items-center gap-1">
            <Terminal className="size-3.5 text-[var(--ink-4)]" />
            {row.exercise_count}
          </span>
        </span>
      ),
    },
    {
      key: "enrollments",
      header: "O'quvchilar",
      align: "center",
      hideable: true,
      csv: (row) => row.enrollment_count,
      render: (row) => (
        <span className="t-num text-[12.5px] text-[var(--ink-2)]">
          {formatNumber(row.enrollment_count)}
        </span>
      ),
    },
    {
      key: "status",
      header: t.common.status,
      align: "center",
      csv: (row) => row.status,
      render: (row) => <PublishBadge value={row.status} />,
    },
    {
      key: "updated",
      header: t.common.updatedAt,
      sortKey: "created_at",
      hideable: true,
      csv: (row) => row.updated_at,
      render: (row) => (
        <span className="t-num whitespace-nowrap text-[12px] text-[var(--ink-3)]">
          {formatDate(row.updated_at, false)}
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
            title="Sozlamalarni tahrirlash"
            aria-label="Tahrirlash"
            onClick={() => setDraft(toDraft(row))}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            title={t.common.delete}
            aria-label={t.common.delete}
            className="text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
            onClick={() => setDeleteTarget(row)}
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
        title="Kurslar"
        description="Dasturlash tillari bo'yicha o'quv kurslari — bo'lim, mavzu, misol, test va topshiriqlar"
        actions={
          <Button
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => setDraft({ ...emptyDraft })}
          >
            Yangi kurs
          </Button>
        }
      />

      {isError ? (
        <Alert
          tone="bad"
          title="Kurslarni yuklab bo'lmadi"
          className="mb-5"
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Server bilan bog&apos;lanishda xatolik yuz berdi.
        </Alert>
      ) : null}

      <div className="enter-stagger mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jami kurslar"
          value={data?.count ?? 0}
          icon={<GraduationCap className="size-[18px]" />}
        />
        <StatCard
          label="Chop etilgan"
          value={published}
          hint="saytda ko'rinadi"
          icon={<BookOpen className="size-[18px]" />}
          tone={published ? "info" : "neutral"}
        />
        <StatCard
          label="Mavzular"
          value={lessons}
          hint="shu sahifadagi kurslarda"
          icon={<Layers className="size-[18px]" />}
          tone="neutral"
        />
        <StatCard
          label="Topshiriqlar"
          value={exercises}
          hint="kod yoziladigan mashqlar"
          icon={<Terminal className="size-[18px]" />}
          tone="neutral"
        />
      </div>

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
        exportName="codearena-kurslar"
        emptyTitle="Kurs yo'q"
        emptyDescription="Birinchi kursni yarating yoki tayyor kurslarni `python manage.py seed_courses` bilan yuklang."
        emptyAction={
          <Button
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => setDraft({ ...emptyDraft })}
          >
            Yangi kurs
          </Button>
        }
        bulkActions={[
          {
            key: "publish",
            label: "Chop etish",
            icon: <BookOpen className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "publish" }),
          },
          {
            key: "unpublish",
            label: "Qoralamaga qaytarish",
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "unpublish" }),
          },
          {
            key: "feature",
            label: "Ajratib ko'rsatish",
            icon: <Star className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "feature" }),
          },
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "delete" }),
          },
        ]}
      />

      {/* ------------------------------------------------------ kurs formasi */}
      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Kursni tahrirlash" : "Yangi kurs"}
        description="Mavzular va topshiriqlar kurs yaratilgandan keyin muharrirda qo'shiladi."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={saveMutation.isPending}
              disabled={!draft?.title_uz.trim() || !draft?.slug.trim()}
              onClick={() => draft && saveMutation.mutate(draft)}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nomi" required>
                <Input
                  autoFocus
                  value={draft.title_uz}
                  onChange={(event) => {
                    const title = event.target.value;
                    setDraft({
                      ...draft,
                      title_uz: title,
                      // Slug faqat YANGI kursda avtomatik yangilanadi: mavjud
                      // kursda uni o'zgartirish saytdagi havolalarni buzadi.
                      slug: draft.id ? draft.slug : slugify(title),
                    });
                  }}
                />
              </Field>
              <Field label="Slug (manzil)" required hint={`/courses/${draft.slug || "..."}`}>
                <Input
                  value={draft.slug}
                  onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Qisqa izoh" hint="Katalogdagi kartada bir qatorda ko'rinadi">
              <Input
                value={draft.subtitle_uz}
                onChange={(event) => setDraft({ ...draft, subtitle_uz: event.target.value })}
              />
            </Field>

            <Field label="Tavsif" hint="Markdown — kurs sahifasidagi «Kurs haqida» bloki">
              <Textarea
                rows={5}
                value={draft.description_uz}
                onChange={(event) => setDraft({ ...draft, description_uz: event.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Til" hint="Topshiriqlar shu tilda bajariladi">
                <Select
                  value={draft.language}
                  onChange={(event) => {
                    const language = event.target.value as CourseLanguage;
                    const preset = LANGUAGES.find((item) => item.value === language);
                    setDraft({
                      ...draft,
                      language,
                      badge: preset?.badge ?? draft.badge,
                      accent_color: preset?.color ?? draft.accent_color,
                    });
                  }}
                  options={LANGUAGES.map((item) => ({ value: item.value, label: item.label }))}
                />
              </Field>
              <Field label="Daraja">
                <Select
                  value={draft.level}
                  onChange={(event) =>
                    setDraft({ ...draft, level: event.target.value as CourseLevel })
                  }
                  options={LEVELS}
                />
              </Field>
              <Field label="Holat">
                <Select
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                  options={[
                    { value: "draft", label: "Qoralama" },
                    { value: "published", label: "Chop etilgan" },
                    { value: "archived", label: "Arxiv" },
                  ]}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Belgi" hint="Py, JS, C++">
                <Input
                  maxLength={6}
                  value={draft.badge}
                  onChange={(event) => setDraft({ ...draft, badge: event.target.value })}
                />
              </Field>
              <Field label="Urg'u rangi">
                <Input
                  type="color"
                  className="h-10 p-1"
                  value={draft.accent_color || "#1e5eff"}
                  onChange={(event) => setDraft({ ...draft, accent_color: event.target.value })}
                />
              </Field>
              <Field label="Taxminiy soat">
                <Input
                  type="number"
                  min={0}
                  value={draft.estimated_hours}
                  onChange={(event) =>
                    setDraft({ ...draft, estimated_hours: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Tartib" hint="Katalogdagi o'rni">
                <Input
                  type="number"
                  min={0}
                  value={draft.order}
                  onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) })}
                />
              </Field>
            </div>

            <Switch
              checked={draft.is_featured}
              onChange={(next) => setDraft({ ...draft, is_featured: next })}
              label="Ajratib ko'rsatish"
              description="Katalog tepasida birinchi bo'lib chiqadi"
            />

            {draft.id ? (
              <Alert tone="info" title="Mavzularni tahrirlash">
                Bo&apos;lim, mavzu, misol, test va topshiriqlar kurs muharririda —{" "}
                <Link
                  href={`/admin/courses/${draft.id}`}
                  className="font-semibold text-[var(--brand)] underline"
                >
                  muharrirni ochish
                </Link>
                .
              </Alert>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Kursni o'chirish"
        message={`«${deleteTarget?.title_uz}» savatchaga ko'chiriladi. Uni 30 kun ichida tiklash mumkin.`}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

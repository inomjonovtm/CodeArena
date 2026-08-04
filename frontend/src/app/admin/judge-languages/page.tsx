"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Pencil, Plus, RefreshCw, Terminal, Trash2 } from "lucide-react";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useCan, useI18n, useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Switch } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api, resource } from "@/lib/api";
import type { JudgeLanguage } from "@/lib/types";
import { cn } from "@/lib/utils";

const languages = resource<JudgeLanguage>("judge-languages");

interface Draft {
  id?: number;
  key: string;
  label: string;
  judge0_id: number;
  version: string;
  monaco_id: string;
  file_extension: string;
  starter_template: string;
  is_active: boolean;
  order: number;
}

const emptyDraft: Draft = {
  key: "",
  label: "",
  judge0_id: 71,
  version: "",
  monaco_id: "",
  file_extension: "",
  starter_template: "",
  is_active: true,
  order: 0,
};

export default function JudgeLanguagesPage() {
  const { t } = useI18n();
  const can = useCan();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JudgeLanguage | null>(null);
  const [available, setAvailable] = useState<{ judge0_id: number; name: string }[] | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["judge-languages"],
    queryFn: () => api.get<JudgeLanguage[]>("/admin/judge-languages/"),
  });

  const saveMutation = useCrudMutation(
    (payload: Draft) =>
      payload.id ? languages.update(payload.id, payload) : languages.create(payload),
    {
      invalidate: [["judge-languages"]],
      successMessage: "Saqlandi",
      onSuccess: () => setDraft(null),
    },
  );

  const deleteMutation = useCrudMutation((id: number) => languages.remove(id), {
    invalidate: [["judge-languages"]],
    successMessage: "O'chirildi",
    onSuccess: () => setDeleteTarget(null),
  });

  const syncMutation = useCrudMutation(
    () =>
      languages.collectionAction<{
        available: { judge0_id: number; name: string }[];
        detail: string;
      }>("sync"),
    {
      onSuccess: (result) => {
        setAvailable(result.available);
        toast.success(result.detail);
      },
    },
  );

  // KPI — mavjud ro'yxatdan hisoblanadi, qo'shimcha so'rov yo'q
  const totalLanguages = data?.length ?? 0;
  const activeLanguages = data?.filter((row) => row.is_active).length ?? 0;

  const columns: Column<JudgeLanguage>[] = [
    {
      key: "label",
      header: "Til",
      mobilePrimary: true,
      csv: (row) => row.label,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-ctl)] bg-[var(--brand-wash)] font-mono text-[11px] font-bold text-[var(--brand)]">
            {row.file_extension?.replace(".", "").slice(0, 3) || row.key.slice(0, 3)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[var(--ink)]">{row.label}</p>
            <p className="truncate font-mono text-[11px] text-[var(--ink-4)]">
              {row.key} · {row.version || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "judge0_id",
      header: "Judge0 ID",
      align: "center",
      csv: (row) => row.judge0_id,
      render: (row) => (
        <span className="t-num font-mono text-[12.5px] text-[var(--ink-3)]">#{row.judge0_id}</span>
      ),
    },
    {
      key: "monaco",
      header: "Monaco",
      hideable: true,
      csv: (row) => row.monaco_id,
      render: (row) => (
        <span className="font-mono text-[12px] text-[var(--ink-3)]">{row.monaco_id || "—"}</span>
      ),
    },
    {
      key: "is_active",
      header: t.common.status,
      csv: (row) => (row.is_active ? "faol" : "o'chiq"),
      render: (row) =>
        row.is_active ? (
          <Badge tone="success" dot>
            Faol
          </Badge>
        ) : (
          <Badge tone="neutral">O&apos;chiq</Badge>
        ),
    },
    {
      key: "order",
      header: "Tartib",
      align: "center",
      hideable: true,
      csv: (row) => row.order,
      render: (row) => <span className="t-num text-[var(--ink-3)]">{row.order}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "5rem",
      render: (row) =>
        can("judge.edit") ? (
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="iconSm"
              title={t.common.edit}
              aria-label={`${row.label} — tahrirlash`}
              onClick={() => setDraft({ ...row })}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              title={t.common.delete}
              aria-label={`${row.label} — o'chirish`}
              className="text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.judgeLanguages}
        description="Judge0 tillari — kodga tegmasdan yangi til qo'shish"
        actions={
          can("judge.edit") ? (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="size-4" />}
                loading={syncMutation.isPending}
                onClick={() => syncMutation.mutate(undefined as never)}
              >
                Judge0 dan olish
              </Button>
              <Button
                size="sm"
                icon={<Plus className="size-4" />}
                onClick={() => setDraft({ ...emptyDraft, order: (data?.length ?? 0) + 1 })}
              >
                Til qo&apos;shish
              </Button>
            </>
          ) : null
        }
      />

      {isError ? (
        <Alert
          tone="bad"
          title="Tillarni yuklab bo'lmadi"
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

      <div className="enter-stagger mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sozlangan tillar"
          value={totalLanguages}
          icon={<Terminal className="size-[18px]" />}
        />
        <StatCard
          label="Faol"
          value={activeLanguages}
          hint="foydalanuvchilar tanlay oladi"
          tone={activeLanguages ? "info" : "neutral"}
        />
        <StatCard
          label="O'chiq"
          value={totalLanguages - activeLanguages}
          tone={totalLanguages - activeLanguages ? "warning" : "neutral"}
        />
      </div>

      {available ? (
        // Sinxronizatsiya natijasi — OQ karta, ichida botiq maydondagi chiplar
        <section className="pane mb-5 rounded-[var(--r-pane)] p-5" aria-label="Judge0 da mavjud tillar">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="t-section text-[var(--ink)]">Judge0 da mavjud tillar</h2>
              <p className="t-meta mt-1 text-[var(--ink-3)]">
                <span className="t-num">{available.length}</span> ta til topildi — kerakligini
                panelga qo&apos;shing
              </p>
            </div>
            <Button variant="ghost" size="xs" onClick={() => setAvailable(null)}>
              Yopish
            </Button>
          </div>
          <div className="pane-sunken flex flex-wrap gap-1.5 rounded-[var(--r-field)] p-3">
            {available.map((row) => {
              const configured = data?.some((item) => item.judge0_id === row.judge0_id);
              return (
                <button
                  key={row.judge0_id}
                  type="button"
                  disabled={configured}
                  aria-label={
                    configured ? `${row.name} — allaqachon qo'shilgan` : `${row.name} — qo'shish`
                  }
                  title={configured ? "Allaqachon qo'shilgan" : "Panelga qo'shish"}
                  onClick={() =>
                    setDraft({
                      ...emptyDraft,
                      label: row.name,
                      judge0_id: row.judge0_id,
                      key: row.name.toLowerCase().split(" ")[0].replace(/[^a-z0-9]/g, ""),
                      order: (data?.length ?? 0) + 1,
                    })
                  }
                  className={cn(
                    "focus-ring inline-flex items-center gap-1.5 rounded-[var(--r-chip)] border px-2.5 py-1",
                    "text-[11.5px] transition-colors duration-[var(--t-fast)]",
                    configured
                      ? "border-dashed border-[var(--edge-strong)] bg-[var(--pane-sunken)] text-[var(--ink-4)] disabled:opacity-70"
                      : "border-[var(--edge)] bg-[var(--pane-solid)] text-[var(--ink-2)] hover:border-[var(--brand-edge)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-ink)]",
                  )}
                >
                  {configured ? <Check className="size-3 text-[var(--ok)]" /> : null}
                  {row.name}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <DataTable
        title={t.nav.judgeLanguages}
        rows={data ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        exportName="codearena-judge-tillari"
        emptyTitle="Til qo'shilmagan"
        emptyDescription="Judge0 da mavjud tillarni olish uchun yuqoridagi tugmani bosing."
      />

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={
          <span className="flex items-center gap-2">
            <Terminal className="size-4 text-[var(--brand)]" />
            {draft?.id ? "Tilni tahrirlash" : "Yangi til"}
          </span>
        }
        size="lg"
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
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kalit (key)" required hint="python, cpp, javascript ...">
                <Input
                  autoFocus
                  value={draft.key}
                  onChange={(event) => setDraft({ ...draft, key: event.target.value })}
                  className="font-mono"
                />
              </Field>
              <Field label="Ko'rinadigan nom" required>
                <Input
                  value={draft.label}
                  onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                  placeholder="Python 3"
                />
              </Field>
              <Field label="Judge0 language_id" required>
                <Input
                  type="number"
                  value={draft.judge0_id}
                  onChange={(event) =>
                    setDraft({ ...draft, judge0_id: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Versiya">
                <Input
                  value={draft.version}
                  onChange={(event) => setDraft({ ...draft, version: event.target.value })}
                  placeholder="3.8.1"
                />
              </Field>
              <Field label="Monaco tili" hint="Muharrirda sintaksis uchun">
                <Input
                  value={draft.monaco_id}
                  onChange={(event) => setDraft({ ...draft, monaco_id: event.target.value })}
                  className="font-mono"
                  placeholder="python"
                />
              </Field>
              <Field label="Fayl kengaytmasi">
                <Input
                  value={draft.file_extension}
                  onChange={(event) => setDraft({ ...draft, file_extension: event.target.value })}
                  className="font-mono"
                  placeholder=".py"
                />
              </Field>
            </div>

            <div className="border-t border-[var(--edge)] pt-4">
              <Field label="Standart starter shablon" hint="Yangi masala yaratilganda avtomatik qo'yiladi">
                <CodeEditor
                  language={draft.monaco_id || "plaintext"}
                  height="12rem"
                  value={draft.starter_template}
                  onChange={(next) => setDraft({ ...draft, starter_template: next })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tartib raqami">
                <Input
                  type="number"
                  value={draft.order}
                  onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) })}
                />
              </Field>
              <div className="flex items-end pb-1">
                <Switch
                  checked={draft.is_active}
                  onChange={(next) => setDraft({ ...draft, is_active: next })}
                  label="Faol"
                  description="Foydalanuvchilar tanlashi mumkin"
                />
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={t.common.delete}
        message={`"${deleteTarget?.label}" tili o'chiriladi. Bu tildagi mavjud submissionlar saqlanib qoladi.`}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, DatabaseBackup, Download, HardDrive, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input } from "@/components/ui/field";
import { CopyButton, StatRow } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api, resource } from "@/lib/api";
import type { BackupRecord, BackupSummary } from "@/lib/types";
import { formatDate, formatRelative } from "@/lib/utils";

const backups = resource<BackupRecord>("backups");

export default function BackupsPage() {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["backups"],
    queryFn: () => backups.list({ page_size: 50 }),
  });

  const { data: summary } = useQuery({
    queryKey: ["backups", "summary"],
    queryFn: () => api.get<BackupSummary>("/admin/backups/summary/"),
  });

  const createMutation = useCrudMutation(
    (payload: { note: string }) =>
      backups.collectionAction<BackupRecord>("create_backup", payload),
    {
      invalidate: [["backups"]],
      successMessage: "Zaxira nusxa yaratildi",
      onSuccess: () => {
        setCreateOpen(false);
        setNote("");
      },
    },
  );

  const deleteMutation = useCrudMutation((id: string) => backups.remove(id), {
    invalidate: [["backups"]],
    successMessage: "O'chirildi",
    onSuccess: () => setDeleteTarget(null),
  });

  const columns: Column<BackupRecord>[] = [
    {
      key: "filename",
      header: "Fayl",
      mobilePrimary: true,
      csv: (row) => row.filename,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
            <DatabaseBackup className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-[12.5px] font-medium text-[var(--ink)]">
              {row.filename}
            </p>
            <p className="t-num text-[11px] text-[var(--ink-4)]">
              {row.size_mb} MB · {row.created_by_username ?? "tizim"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "note",
      header: "Izoh",
      csv: (row) => row.note,
      render: (row) => (
        <span className="line-clamp-1 max-w-xs text-[12.5px] text-[var(--ink-3)]">
          {row.note || "—"}
        </span>
      ),
    },
    {
      key: "exists",
      header: t.common.status,
      csv: (row) => (row.exists ? "mavjud" : "yo'q"),
      render: (row) =>
        row.exists ? (
          <Badge tone="success" dot>
            Mavjud
          </Badge>
        ) : (
          <Badge tone="danger" dot>
            Fayl yo&apos;q
          </Badge>
        ),
    },
    {
      key: "created_at",
      header: "Yaratilgan",
      csv: (row) => row.created_at,
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="t-num text-[12.5px] text-[var(--ink-2)]">{formatDate(row.created_at)}</p>
          <p className="text-[11px] text-[var(--ink-4)]">{formatRelative(row.created_at)}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "6rem",
      render: (row) => (
        <div className="flex justify-end gap-0.5">
          <a href={`/api/admin/backups/${row.id}/download`} download className="focus-ring rounded-[var(--r-ctl)]">
            <Button
              variant="ghost"
              size="iconSm"
              title="Yuklab olish"
              aria-label={`${row.filename} — yuklab olish`}
              disabled={!row.exists}
            >
              <Download className="size-3.5" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="iconSm"
            title={t.common.delete}
            aria-label={`${row.filename} — o'chirish`}
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
        title={t.nav.backups}
        description="Ma'lumotlar bazasining zaxira nusxalari"
        actions={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
            Zaxira yaratish
          </Button>
        }
      />

      {isError ? (
        <Alert
          tone="bad"
          title="Zaxira ro'yxatini yuklab bo'lmadi"
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
          label="Nusxalar"
          value={summary?.count ?? 0}
          hint={`oxirgi ${summary?.keep_limit ?? 10} tasi saqlanadi`}
          icon={<DatabaseBackup className="size-[18px]" />}
        />
        <StatCard label="Umumiy hajm" value={`${summary?.total_size_mb ?? 0} MB`} tone="info" />
        <StatCard
          label="Diskda bo'sh joy"
          value={`${summary?.disk_free_gb ?? 0} GB`}
          icon={<HardDrive className="size-[18px]" />}
          tone={(summary?.disk_free_gb ?? 100) < 2 ? "danger" : "neutral"}
        />
        <StatCard
          label="Oxirgi zaxira"
          value={
            data?.results[0] ? formatRelative(data.results[0].created_at) : "—"
          }
          tone="neutral"
        />
      </div>

      {/*
        Operatsiya bloki: bitta OQ karta, ichida botiq kataklar.
        Chapda tiklash buyrug'i, o'ngda saqlash joyi va limitlar.
      */}
      <section className="pane mb-5 rounded-[var(--r-pane)] p-5" aria-label="Tiklash va saqlash">
        <div className="mb-4">
          <h2 className="t-section text-[var(--ink)]">Tiklash va saqlash</h2>
          <p className="t-meta mt-1 text-[var(--ink-3)]">
            Fayllar serverda saqlanadi, tiklash esa buyruqlar qatori orqali bajariladi
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="pane-sunken rounded-[var(--r-field)] p-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--r-ctl)] bg-[var(--warn-wash)] text-[var(--warn)]">
                <AlertTriangle className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--ink)]">
                  Tiklash faqat buyruqlar qatori orqali
                </p>
                <p className="t-meta mt-1 text-[var(--ink-3)]">
                  Xavfsizlik uchun tiklash paneldan bajarilmaydi. Serverda quyidagi buyruqni
                  ishlating:
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {/* Kod maydoni — botiq katak ustida oq chiziq, gorizontal scroll bilan */}
              <code className="scrollbar-thin block min-w-0 flex-1 overflow-x-auto rounded-[var(--r-ctl)] border border-[var(--edge)] bg-[var(--pane-solid)] px-3 py-2 font-mono text-[11.5px] whitespace-nowrap text-[var(--ink-2)]">
                {summary?.restore_command ?? "—"}
              </code>
              {summary?.restore_command ? <CopyButton value={summary.restore_command} /> : null}
            </div>
          </div>

          <div className="pane-sunken rounded-[var(--r-field)] p-4">
            <p className="t-eyebrow mb-2">Saqlash joyi</p>
            <p className="mb-3 truncate font-mono text-[12px] text-[var(--ink-2)]" title={summary?.backup_dir}>
              {summary?.backup_dir ?? "—"}
            </p>
            <div className="divide-y divide-[var(--edge-soft)]">
              <StatRow label="Saqlanadigan nusxalar" value={summary?.keep_limit ?? "—"} />
              <StatRow label="Umumiy hajm" value={`${summary?.total_size_mb ?? 0} MB`} />
              <StatRow label="Diskda bo'sh joy" value={`${summary?.disk_free_gb ?? 0} GB`} />
            </div>
          </div>
        </div>
      </section>

      <DataTable
        title="Zaxira nusxalari"
        rows={data?.results ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        emptyTitle="Zaxira nusxa yo'q"
        emptyDescription="Birinchi zaxirani yaratish uchun yuqoridagi tugmani bosing."
        emptyAction={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
            Zaxira yaratish
          </Button>
        }
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Zaxira nusxa yaratish"
        description="Butun ma'lumotlar bazasi JSON.GZ ko'rinishida saqlanadi"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate({ note })}
            >
              Yaratish
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-[var(--ink-3)]">
            Sessiyalar, tokenlar va audit log zaxiraga kirmaydi. Katta bazada bu bir necha
            soniya vaqt olishi mumkin.
          </p>
          <Field label="Izoh" hint="Masalan: yangilanishdan oldin">
            <Input
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ixtiyoriy"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Zaxirani o'chirish"
        message={`"${deleteTarget?.filename}" fayli diskdan ham o'chiriladi.`}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

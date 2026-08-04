"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useCan, useConfirm, useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api } from "@/lib/api";
import type { TrashKind, TrashResponse, TrashRow } from "@/lib/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";

const KIND_LABELS: Record<TrashKind, string> = {
  problem: "Masala",
  contest: "Contest",
  course: "Kurs",
  discussion: "Muhokama",
  comment: "Izoh",
  group: "Guruh",
};

export default function TrashPage() {
  const { t } = useI18n();
  const can = useCan();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [purgeAll, setPurgeAll] = useState<TrashKind | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["trash", kind, search],
    queryFn: () =>
      api.get<TrashResponse>("/admin/trash/", {
        kind: kind || undefined,
        search: search || undefined,
      }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["trash"] });
    void queryClient.invalidateQueries({ queryKey: ["problems"] });
    void queryClient.invalidateQueries({ queryKey: ["articles"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const restoreMutation = useCrudMutation(
    ({ kind: k, ids }: { kind: TrashKind; ids: (string | number)[] }) =>
      api.post<{ detail: string }>("/admin/trash/restore/", { kind: k, ids }),
    { successMessage: "Tiklandi", onSuccess: invalidate },
  );

  const purgeMutation = useCrudMutation(
    ({ kind: k, ids, all }: { kind: TrashKind; ids?: (string | number)[]; all?: boolean }) =>
      api.post<{ detail: string }>("/admin/trash/purge/", { kind: k, ids, all }),
    {
      successMessage: "Butunlay o'chirildi",
      onSuccess: () => {
        invalidate();
        setPurgeAll(null);
      },
    },
  );

  const rows = data?.results ?? [];

  const grouped = useMemo(() => {
    const map = new Map<TrashKind, TrashRow[]>();
    rows.forEach((row) => {
      map.set(row.kind, [...(map.get(row.kind) ?? []), row]);
    });
    return map;
  }, [rows]);

  // Muddati yaqinlashgan yozuvlar bormi — yagona ogohlantirish shu bilan qizaradi
  const expiringSoon = rows.some((row) => row.days_left <= 3);
  const retentionDays = data?.retention_days ?? 30;

  const columns: Column<TrashRow>[] = [
    {
      key: "label",
      header: "Nomi",
      mobilePrimary: true,
      csv: (row) => row.label,
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-md truncate text-[13px] font-medium text-[var(--ink)]">{row.label}</p>
          <p className="text-[11px] text-[var(--ink-4)]">{row.kind_label}</p>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Turi",
      csv: (row) => row.kind_label,
      render: (row) => <Badge tone="outline">{row.kind_label}</Badge>,
    },
    {
      key: "deleted_at",
      header: "O'chirilgan",
      csv: (row) => row.deleted_at,
      render: (row) => (
        <span className="whitespace-nowrap text-[12.5px] text-[var(--ink-3)]">
          {formatRelative(row.deleted_at)}
        </span>
      ),
    },
    {
      key: "deleted_by",
      header: "Kim",
      csv: (row) => row.deleted_by,
      render: (row) => (
        <span className="text-[12.5px] text-[var(--ink-3)]">{row.deleted_by ?? "—"}</span>
      ),
    },
    {
      key: "expires",
      header: "Avtomatik o'chadi",
      csv: (row) => row.expires_at,
      render: (row) => (
        <span
          className={cn(
            "t-num whitespace-nowrap text-[12.5px]",
            row.days_left <= 3 ? "font-semibold text-[var(--bad)]" : "text-[var(--ink-3)]",
          )}
        >
          {row.days_left} kundan keyin
          <span className="ml-1 text-[var(--ink-4)]">({formatDate(row.expires_at, false)})</span>
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "8rem",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="xs"
            icon={<RotateCcw className="size-3" />}
            aria-label={`${row.label} — tiklash`}
            onClick={() => restoreMutation.mutate({ kind: row.kind, ids: [row.id] })}
          >
            Tiklash
          </Button>
          {can("trash.purge") ? (
            <Button
              variant="dangerSoft"
              size="iconSm"
              title="Butunlay o'chirish"
              aria-label={`${row.label} — butunlay o'chirish`}
              onClick={async () => {
                const ok = await confirm({
                  title: "Butunlay o'chirish",
                  message: (
                    <>
                      <strong>{row.label}</strong> bazadan butunlay o&apos;chiriladi. Bu amalni
                      qaytarib bo&apos;lmaydi.
                    </>
                  ),
                  confirmLabel: "Butunlay o'chirish",
                  danger: true,
                });
                if (!ok) return;
                purgeMutation.mutate({ kind: row.kind, ids: [row.id] });
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.trash}
        description={`O'chirilgan yozuvlar ${data?.retention_days ?? 30} kun saqlanadi, keyin avtomatik tozalanadi`}
        actions={
          can("trash.purge") && kind && (data?.counts[kind as TrashKind] ?? 0) > 0 ? (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="size-4" />}
              onClick={() => setPurgeAll(kind as TrashKind)}
            >
              Bu turdagilarni tozalash
            </Button>
          ) : null
        }
      />

      {isError ? (
        <Alert
          tone="bad"
          title="Savatchani yuklab bo'lmadi"
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
          label="Savatchada"
          value={data?.total ?? 0}
          icon={<Trash2 className="size-[18px]" />}
          tone={data?.total ? "warning" : "neutral"}
        />
        <StatCard label="Masalalar" value={data?.counts.problem ?? 0} tone="neutral" />
        <StatCard label="Musobaqalar" value={data?.counts.contest ?? 0} tone="neutral" />
        <StatCard
          label="Muhokama / izoh"
          value={`${data?.counts.discussion ?? 0} / ${data?.counts.comment ?? 0}`}
          tone="neutral"
        />
      </div>

      {/* Saqlash siyosati — bitta ogohlantirish; muddat yaqin bo'lsa qizil holatga o'tadi */}
      <Alert
        tone={expiringSoon ? "bad" : "warn"}
        title={expiringSoon ? "Muddati tugayapti" : "Saqlash muddati"}
        className="mb-5"
      >
        {expiringSoon
          ? "Ba'zi yozuvlar 3 kun ichida butunlay o'chiriladi — kerak bo'lsa hoziroq tiklang."
          : `O'chirilgan yozuvlar savatchada ${retentionDays} kun turadi, so'ng bazadan butunlay o'chiriladi va tiklab bo'lmaydi.`}
      </Alert>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => `${row.kind}-${row.id}`}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Nomi bo'yicha qidirish..."
        exportName="codearena-savatcha"
        activeFilterCount={kind ? 1 : 0}
        onClearFilters={() => setKind("")}
        emptyTitle="Savatcha bo'sh"
        emptyDescription="O'chirilgan yozuvlar shu yerda 30 kun saqlanadi."
        filtersSlot={
          <FilterSelect
            label="Turi"
            allLabel="Barcha turlar"
            value={kind}
            onChange={setKind}
            options={Object.entries(KIND_LABELS).map(([value, label]) => ({
              value,
              label: `${label} (${data?.counts[value as TrashKind] ?? 0})`,
            }))}
          />
        }
        bulkActions={[
          {
            key: "restore",
            label: "Tiklash",
            icon: <RotateCcw className="size-3.5" />,
            onRun: async (ids) => {
              // Turlar bo'yicha guruhlab yuboramiz
              for (const [rowKind, list] of grouped) {
                const selected = list
                  .filter((row) => ids.includes(`${row.kind}-${row.id}`))
                  .map((row) => row.id);
                if (selected.length) {
                  await restoreMutation.mutateAsync({ kind: rowKind, ids: selected });
                }
              }
            },
          },
          ...(can("trash.restore")
            ? [
                {
                  key: "purge",
                  label: "Butunlay o'chirish",
                  icon: <Trash2 className="size-3.5" />,
                  danger: true,
                  onRun: async (ids: (string | number)[]) => {
                    const ok = await confirm({
                      title: `${ids.length} ta yozuvni butunlay o'chirish`,
                      message:
                        "Yozuvlar bazadan butunlay o'chiriladi va tiklab bo'lmaydi.",
                      confirmLabel: "Butunlay o'chirish",
                      danger: true,
                      requireText: String(ids.length),
                    });
                    if (!ok) return;
                    for (const [rowKind, list] of grouped) {
                      const selected = list
                        .filter((row) => ids.includes(`${row.kind}-${row.id}`))
                        .map((row) => row.id);
                      if (selected.length) {
                        await purgeMutation.mutateAsync({ kind: rowKind, ids: selected });
                      }
                    }
                  },
                },
              ]
            : []),
        ]}
        selectable
      />

      <ConfirmDialog
        open={Boolean(purgeAll)}
        onClose={() => setPurgeAll(null)}
        onConfirm={() => purgeAll && purgeMutation.mutate({ kind: purgeAll, all: true })}
        loading={purgeMutation.isPending}
        title="Savatchani tozalash"
        message={`${purgeAll ? KIND_LABELS[purgeAll] : ""} turidagi barcha o'chirilgan yozuvlar butunlay yo'q qilinadi. Bu amalni qaytarib bo'lmaydi.`}
        confirmLabel="Butunlay o'chirish"
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

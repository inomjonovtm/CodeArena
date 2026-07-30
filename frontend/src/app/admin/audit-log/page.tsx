"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, History, RotateCcw, ScrollText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge, RoleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, FilterCell, type Column } from "@/components/ui/data-table";
import { FilterSelect, Input } from "@/components/ui/field";
import { Drawer } from "@/components/ui/modal";
import { StatRow } from "@/components/ui/misc";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { api, resource } from "@/lib/api";
import type { AuditLogRow } from "@/lib/types";
import { formatDate, formatNumber, formatRelative } from "@/lib/utils";

const auditLog = resource<AuditLogRow>("audit-log");

function actionTone(action: string) {
  if (action.includes("delete") || action.includes("ban") || action.includes("confirmed"))
    return "danger" as const;
  if (action.includes("create") || action.includes("publish")) return "success" as const;
  if (action.includes("update") || action.includes("bulk")) return "info" as const;
  return "neutral" as const;
}

export default function AuditLogPage() {
  const { t, locale } = useI18n();
  const table = useTableQuery({ ordering: "-created_at" });
  const [openRow, setOpenRow] = useState<AuditLogRow | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-log", table.params],
    queryFn: () => auditLog.list(table.params),
  });

  const { data: actions } = useQuery({
    queryKey: ["audit-log", "actions"],
    queryFn: () => api.get<{ action: string; count: number }[]>("/admin/audit-log/actions/"),
  });

  // Qaytarish faqat `before`/`after` saqlangan yozuvlar uchun ishlaydi
  const revertMutation = useCrudMutation(
    (id: number) =>
      auditLog.action<{ detail: string; restored: Record<string, unknown> }>(id, "revert"),
    {
      invalidate: [["audit-log"]],
      successMessage: "O'zgarish qaytarildi",
      onSuccess: () => setOpenRow(null),
    },
  );

  const canRevert = (row: AuditLogRow | null) =>
    Boolean(
      row &&
        row.target_id &&
        row.changes &&
        Object.values(row.changes).some(
          (value) =>
            value !== null &&
            typeof value === "object" &&
            "before" in (value as object) &&
            "after" in (value as object),
        ),
    );

  // KPI mavjud ikkala so'rovdan hisoblanadi — qo'shimcha so'rov yo'q
  const topAction = (actions ?? []).reduce<{ action: string; count: number } | null>(
    (best, row) => (!best || row.count > best.count ? row : best),
    null,
  );

  const columns: Column<AuditLogRow>[] = [
    {
      key: "created_at",
      header: "Vaqt",
      sortKey: "created_at",
      csv: (row) => row.created_at,
      render: (row) => (
        // Xronologik ustun: aniq sana tepada, nisbiy vaqt xira ostida
        <div className="whitespace-nowrap">
          <p className="t-num text-[12.5px] text-[var(--ink-3)]">{formatDate(row.created_at)}</p>
          <p className="t-num text-[11px] text-[var(--ink-4)]">{formatRelative(row.created_at)}</p>
        </div>
      ),
    },
    {
      key: "actor",
      header: t.audit.actor,
      csv: (row) => row.actor_username,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.actor ? (
            <Link
              href={`/admin/users/${row.actor}`}
              className="focus-ring rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
            >
              {row.actor_username}
            </Link>
          ) : (
            <span className="text-[13px] text-[var(--ink-4)]">tizim</span>
          )}
          {row.actor_role ? <RoleBadge value={row.actor_role} locale={locale} /> : null}
        </div>
      ),
    },
    {
      key: "action",
      header: t.audit.action,
      csv: (row) => row.action,
      render: (row) => (
        <Badge tone={actionTone(row.action)}>
          <span className="font-mono">{row.action}</span>
        </Badge>
      ),
    },
    {
      key: "target",
      header: t.audit.target,
      csv: (row) => `${row.target_type}: ${row.target_repr}`,
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-sm truncate text-[13px] text-[var(--ink-2)]">
            {row.target_repr || "—"}
          </p>
          <p className="text-[11px] text-[var(--ink-4)]">{row.target_type}</p>
        </div>
      ),
    },
    {
      key: "ip",
      header: t.audit.ip,
      hideable: true,
      csv: (row) => row.ip_address,
      render: (row) => (
        <span className="t-num font-mono text-[11.5px] text-[var(--ink-4)]">
          {row.ip_address ?? "—"}
        </span>
      ),
    },
    {
      key: "changes",
      header: t.audit.changes,
      align: "center",
      csv: (row) => JSON.stringify(row.changes),
      render: (row) => {
        const count = Object.keys(row.changes ?? {}).length;
        return count ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpenRow(row);
            }}
            aria-label={`${row.action} — ${t.audit.changes}`}
            className="focus-ring t-num rounded-[6px] text-[12px] text-[var(--brand)] transition-colors duration-[var(--t-fast)] hover:underline"
          >
            {count} ta maydon
          </button>
        ) : (
          <span className="text-[12px] text-[var(--ink-4)]">—</span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title={t.audit.title} description={t.audit.subtitle} />

      {/* KPI — jurnal hajmi va eng tez-tez uchraydigan amal */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={t.common.total}
          value={formatNumber(data?.count ?? 0)}
          icon={<History className="size-[18px]" />}
        />
        <StatCard
          label="Amal turlari"
          value={formatNumber(actions?.length ?? 0)}
          icon={<Activity className="size-[18px]" />}
          tone="info"
        />
        <StatCard
          label="Eng ko‘p amal"
          value={
            topAction ? (
              <span className="font-mono text-[17px] break-all">{topAction.action}</span>
            ) : (
              "—"
            )
          }
          hint={topAction ? `${formatNumber(topAction.count)} marta` : undefined}
          tone="neutral"
        />
      </div>

      {isError ? (
        <Alert
          tone="bad"
          title="Jurnalni yuklab bo'lmadi"
          className="mb-5"
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Tarmoq yoki server xatosi. Qayta urinib ko&apos;ring.
        </Alert>
      ) : null}

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
        searchPlaceholder="Amal, obyekt yoki admin bo'yicha..."
        exportName="codearena-audit-log"
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        onRowClick={(row) => setOpenRow(row)}
        emptyTitle="Yozuv topilmadi"
        filtersSlot={
          <>
            <FilterSelect
              label="Amal"
              allLabel="Barcha amallar"
              value={table.filters.action as string}
              onChange={(next) => table.setFilter("action", next)}
              searchable
              options={(actions ?? []).map((row) => ({
                value: row.action,
                label: row.action + " (" + row.count + ")",
              }))}
            />
            <FilterCell label="Kim bajargan">
              <Input
                placeholder="Admin username..."
                aria-label="Admin username"
                value={(table.filters.actor_username as string) ?? ""}
                onChange={(event) => table.setFilter("actor_username", event.target.value)}
              />
            </FilterCell>
            <FilterCell label="Sanadan boshlab">
              <Input
                type="date"
                aria-label="Sanadan boshlab"
                value={(table.filters.created_after as string) ?? ""}
                onChange={(event) => table.setFilter("created_after", event.target.value)}
              />
            </FilterCell>
          </>
        }
      />

      <Drawer
        open={Boolean(openRow)}
        onClose={() => setOpenRow(null)}
        title={
          <span className="flex items-center gap-2">
            <ScrollText className="size-4 text-[var(--brand)]" />
            <span className="font-mono text-[15px]">{openRow?.action}</span>
          </span>
        }
        description={openRow ? formatDate(openRow.created_at) : undefined}
        width="max-w-2xl"
        footer={
          openRow && canRevert(openRow) ? (
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="size-4" />}
              loading={revertMutation.isPending}
              onClick={() => revertMutation.mutate(openRow.id)}
            >
              O&apos;zgarishni qaytarish
            </Button>
          ) : null
        }
      >
        {openRow ? (
          <div className="flex flex-col gap-4">
            {/* Botiq maydon — yozuv pasporti */}
            <div className="pane-sunken rounded-[var(--r-field)] px-4 py-2.5">
              <StatRow label={t.audit.actor} value={openRow.actor_username ?? "tizim"} />
              <StatRow label={t.audit.target} value={openRow.target_repr || "—"} />
              <StatRow label="Obyekt turi" value={openRow.target_type || "—"} />
              <StatRow
                label="Obyekt ID"
                value={<span className="font-mono text-[11.5px]">{openRow.target_id || "—"}</span>}
              />
              <StatRow label={t.audit.ip} value={openRow.ip_address ?? "—"} />
              <StatRow
                label="User-Agent"
                value={
                  <span className="block max-w-[16rem] truncate text-[11px]">
                    {openRow.user_agent || "—"}
                  </span>
                }
              />
            </div>

            {/* JSON — botiq maydonda, oq karta ichida */}
            <Card>
              <CardHeader title={t.audit.changes} />
              <CardBody>
                <pre className="scrollbar-thin max-h-96 overflow-auto rounded-[var(--r-field)] bg-[var(--pane-sunken)] p-3 font-mono text-[12px] leading-relaxed text-[var(--ink)]">
                  {JSON.stringify(openRow.changes, null, 2)}
                </pre>
              </CardBody>
            </Card>

            {canRevert(openRow) ? null : (
              <p className="t-meta text-[var(--ink-4)]">
                Bu yozuvni avtomatik qaytarib bo&apos;lmaydi — o&apos;zgargan maydonlarning
                oldingi qiymati saqlanmagan.
              </p>
            )}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut, Monitor, Shield, ShieldOff, Smartphone } from "lucide-react";
import Link from "next/link";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useCan, useConfirm, useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { resource } from "@/lib/api";
import type { AdminSession } from "@/lib/types";
import { formatDate, formatNumber, formatRelative } from "@/lib/utils";

const sessions = resource<AdminSession>("sessions");

export default function SessionsPage() {
  const { t } = useI18n();
  const can = useCan();
  const { confirm } = useConfirm();
  const table = useTableQuery({ ordering: "-last_seen_at" });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sessions", table.params],
    queryFn: () => sessions.list(table.params),
    refetchInterval: 60_000,
  });

  const revokeMutation = useCrudMutation((id: string) => sessions.action(id, "revoke"), {
    invalidate: [["sessions"]],
    successMessage: "Sessiya yopildi",
  });

  const revokeAllMutation = useCrudMutation(
    () => sessions.collectionAction<{ detail: string }>("revoke-all"),
    { invalidate: [["sessions"]], successMessage: "Boshqa sessiyalar yopildi" },
  );

  const rows = data?.results ?? [];
  const active = rows.filter((row) => row.is_active).length;

  const columns: Column<AdminSession>[] = [
    {
      key: "device",
      header: "Qurilma",
      mobilePrimary: true,
      csv: (row) => `${row.browser} / ${row.device}`,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {/* Och ko'k ikonka kvadrati — oq jadvalda qurilmani ajratadi */}
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-ctl)] bg-[var(--pane)] text-[var(--ink-3)]">
            {["Android", "iOS", "Mobil"].includes(row.device) ? (
              <Smartphone className="size-4" />
            ) : (
              <Monitor className="size-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink)]">
              {row.browser}
              {row.is_current ? <Badge tone="accent">joriy</Badge> : null}
            </p>
            <p className="text-[11px] text-[var(--ink-4)]">{row.device}</p>
          </div>
        </div>
      ),
    },
    {
      key: "user",
      header: t.submissions.user,
      csv: (row) => row.username,
      render: (row) => (
        <Link
          href={`/admin/users/${row.user}`}
          className="focus-ring rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
        >
          {row.username}
        </Link>
      ),
    },
    {
      key: "ip",
      header: "IP manzil",
      csv: (row) => row.ip_address,
      render: (row) => (
        <span className="t-num font-mono text-[12px] text-[var(--ink-3)]">
          {row.ip_address ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: t.common.status,
      csv: (row) => (row.is_active ? "faol" : "yopilgan"),
      render: (row) =>
        row.is_active ? (
          <Badge tone="success" dot>
            Faol
          </Badge>
        ) : (
          <Badge tone="neutral">Yopilgan</Badge>
        ),
    },
    {
      key: "last_seen",
      header: "Oxirgi faollik",
      sortKey: "last_seen_at",
      csv: (row) => row.last_seen_at,
      render: (row) => (
        <span className="t-num whitespace-nowrap text-[12.5px] text-[var(--ink-3)]">
          {formatRelative(row.last_seen_at)}
        </span>
      ),
    },
    {
      key: "created",
      header: "Kirgan vaqt",
      sortKey: "created_at",
      hideable: true,
      csv: (row) => row.created_at,
      render: (row) => (
        <span className="t-num whitespace-nowrap text-[12px] text-[var(--ink-4)]">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "5rem",
      render: (row) =>
        row.is_active && !row.is_current ? (
          <Button
            variant="ghost"
            size="iconSm"
            className="text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
            title="Sessiyani yopish"
            aria-label={`${row.username} — sessiyani yopish`}
            loading={revokeMutation.isPending && revokeMutation.variables === row.id}
            onClick={() => revokeMutation.mutate(row.id)}
          >
            <LogOut className="size-3.5" />
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.sessions}
        description={
          can("sessions.revoke")
            ? "Barcha admin va moderator sessiyalari"
            : "Sizning aktiv sessiyalaringiz"
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<LogOut className="size-4" />}
            loading={revokeAllMutation.isPending}
            onClick={async () => {
              const ok = await confirm({
                title: "Boshqa sessiyalarni yopish",
                message:
                  "Joriy qurilmadan tashqari barcha qurilmalarda tizimdan chiqiladi. Ular qaytadan kirishlari kerak bo'ladi.",
                confirmLabel: "Hammasini yopish",
                danger: true,
              });
              if (!ok) return;
              revokeAllMutation.mutate(undefined as never);
            }}
          >
            Boshqa sessiyalarni yopish
          </Button>
        }
      />

      {/* KPI — joriy sahifadagi sessiyalar kesimi (har 60 soniyada yangilanadi) */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Aktiv sessiyalar"
          value={formatNumber(active)}
          hint="shu sahifada"
          icon={<Shield className="size-[18px]" />}
          tone="accent"
        />
        <StatCard label="Jami yozuvlar" value={formatNumber(data?.count ?? 0)} tone="neutral" />
        <StatCard
          label="Yopilgan"
          value={formatNumber(rows.length - active)}
          hint="shu sahifada"
          icon={<ShieldOff className="size-[18px]" />}
          tone="neutral"
        />
      </div>

      {isError ? (
        <Alert
          tone="bad"
          title="Sessiyalarni yuklab bo'lmadi"
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
        searchPlaceholder="Username, IP yoki brauzer..."
        exportName="codearena-sessiyalar"
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        emptyTitle="Sessiya topilmadi"
        toolbar={
          // Polling ko'rsatkichi: ro'yxat o'zi yangilanib turadi
          <span className="t-meta hidden items-center gap-1.5 text-[var(--ink-4)] xl:inline-flex">
            <span className="size-1.5 rounded-full bg-[var(--ok)]" aria-hidden />
            jonli
          </span>
        }
      />
    </>
  );
}

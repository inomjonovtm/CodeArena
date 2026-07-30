"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, KeyRound, Lock, Trash2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useConfirm, useI18n } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, Skeleton } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SegmentedControl } from "@/components/ui/field";
import { Avatar, CopyButton } from "@/components/ui/misc";
import { Drawer } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { api, resource } from "@/lib/api";
import type { Group, GroupMember } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const groups = resource<Group>("groups");

export default function GroupsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const table = useTableQuery();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["groups", table.params],
    queryFn: () => groups.list(table.params),
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["groups", openId, "leaderboard"],
    queryFn: () => api.get<GroupMember[]>(`/admin/groups/${openId}/leaderboard/`),
    enabled: Boolean(openId),
  });

  const current = data?.results.find((row) => row.id === openId);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["groups"] });
  };

  const regenerateMutation = useCrudMutation(
    (id: string) => groups.action(id, "regenerate-invite"),
    { invalidate: [["groups"]], successMessage: "Yangi taklif kodi yaratildi" },
  );

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) => groups.bulk(ids, action),
    { invalidate: [["groups"]] },
  );

  // KPI faqat allaqachon olingan sahifadan hisoblanadi — yangi so'rov yo'q
  const rows = data?.results ?? [];
  const verifiedCount = rows.filter((row) => row.is_verified).length;
  const privateCount = rows.filter((row) => row.is_private).length;
  const memberTotal = rows.reduce((sum, row) => sum + row.live_member_count, 0);

  const columns: Column<Group>[] = [
    {
      key: "name",
      header: t.groups.name,
      sortKey: "name",
      csv: (row) => row.name,
      render: (row) => (
        <button
          type="button"
          onClick={() => setOpenId(row.id)}
          aria-label={`${row.name} — tafsilotlar`}
          className="focus-ring group/name flex items-center gap-2.5 rounded-[var(--r-ctl)] text-left"
        >
          <Avatar src={row.avatar_url} name={row.name} size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="max-w-[14rem] truncate text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] group-hover/name:text-[var(--brand)]">
                {row.name}
              </span>
              {row.is_verified ? (
                <BadgeCheck className="size-3.5 shrink-0 text-[var(--brand)]" />
              ) : null}
              {row.is_private ? <Lock className="size-3 shrink-0 text-[var(--ink-4)]" /> : null}
            </span>
            <span className="block max-w-[14rem] truncate font-mono text-[11px] text-[var(--ink-4)]">
              {row.slug}
            </span>
          </span>
        </button>
      ),
    },
    {
      key: "owner",
      header: t.groups.owner,
      csv: (row) => row.owner_username,
      render: (row) =>
        row.owner ? (
          <Link
            href={`/admin/users/${row.owner}`}
            className="focus-ring rounded-[6px] text-[12.5px] text-[var(--ink-3)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            {row.owner_username}
          </Link>
        ) : (
          <span className="text-[12.5px] text-[var(--ink-4)]">—</span>
        ),
    },
    {
      key: "members",
      header: t.groups.members,
      sortKey: "member_count",
      align: "right",
      csv: (row) => row.live_member_count,
      render: (row) => (
        <span className="t-num inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink-2)]">
          <Users className="size-3.5 text-[var(--ink-4)]" />
          {row.live_member_count} <span className="text-[var(--ink-4)]">/</span> {row.max_members}
        </span>
      ),
    },
    {
      key: "invite",
      header: t.groups.inviteCode,
      csv: (row) => row.invite_code,
      render: (row) => (
        <span className="flex items-center gap-1">
          <code className="t-num rounded-[6px] bg-[var(--pane-sunken)] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--ink-2)]">
            {row.invite_code}
          </code>
          <CopyButton value={row.invite_code} />
        </span>
      ),
    },
    {
      key: "verified",
      header: t.groups.isVerified,
      align: "center",
      csv: (row) => (row.is_verified ? "ha" : "yo'q"),
      render: (row) =>
        row.is_verified ? (
          <Badge tone="accent">
            <BadgeCheck className="size-3" />
            tasdiqlangan
          </Badge>
        ) : (
          <span className="text-[12px] text-[var(--ink-4)]">—</span>
        ),
    },
    {
      key: "created_at",
      header: t.common.createdAt,
      sortKey: "created_at",
      hideable: true,
      csv: (row) => row.created_at,
      render: (row) => (
        <span className="t-num whitespace-nowrap text-[12px] text-[var(--ink-4)]">
          {formatDate(row.created_at, false)}
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
          onClick={() => regenerateMutation.mutate(row.id)}
          loading={regenerateMutation.isPending && regenerateMutation.variables === row.id}
          title={t.groups.regenerateInvite}
          aria-label={t.groups.regenerateInvite}
        >
          <KeyRound className="size-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.groups.title} description={t.groups.subtitle} />

      {/* KPI qatori — joriy sahifadagi guruhlar kesimi */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(data?.count ?? 0)}
          icon={<Users className="size-[18px]" />}
        />
        <StatCard
          label={t.groups.members}
          value={formatNumber(memberTotal)}
          hint="shu sahifada"
          tone="info"
        />
        <StatCard
          label="Tasdiqlangan"
          value={formatNumber(verifiedCount)}
          hint="shu sahifada"
          icon={<BadgeCheck className="size-[18px]" />}
          tone={verifiedCount ? "accent" : "neutral"}
        />
        <StatCard
          label="Yopiq"
          value={formatNumber(privateCount)}
          hint="shu sahifada"
          icon={<Lock className="size-[18px]" />}
          tone="neutral"
        />
      </div>

      {isError ? (
        <Alert
          tone="bad"
          title="Guruhlarni yuklab bo'lmadi"
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
        selectable
        exportName="codearena-guruhlar"
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        emptyTitle="Guruh topilmadi"
        filtersSlot={
          <>
            <SegmentedControl
              stacked
              label="Tasdiq"
              allLabel={t.common.all}
              value={table.filters.is_verified as string}
              onChange={(next) => table.setFilter("is_verified", next)}
              options={[
                { value: "true", label: "Tasdiqlangan", tone: "success" },
                { value: "false", label: "Tasdiqlanmagan", tone: "neutral" },
              ]}
            />
            <SegmentedControl
              stacked
              label="Ko‘rinish"
              allLabel={t.common.all}
              value={table.filters.is_private as string}
              onChange={(next) => table.setFilter("is_private", next)}
              options={[
                { value: "false", label: "Ochiq", tone: "success" },
                { value: "true", label: "Yopiq", tone: "neutral" },
              ]}
            />
          </>
        }
        bulkActions={[
          {
            key: "verify",
            label: t.groups.verify,
            icon: <BadgeCheck className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "verify" }).then(invalidate),
          },
          {
            key: "unverify",
            label: t.groups.unverify,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "unverify" }).then(invalidate),
          },
          {
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onRun: async (ids) => {
              const ok = await confirm({
                title: `${ids.length} ta guruhni o'chirish`,
                message: "Guruhlar a'zolari bilan birga o'chiriladi.",
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
        onClose={() => setOpenId(null)}
        title={current?.name ?? t.common.loading}
        description={current?.description}
        width="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          {/* Botiq maydon — guruh raqamlari bir qarashda */}
          {current ? (
            <div className="pane-sunken rounded-[var(--r-field)] p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
                <div className="min-w-0">
                  <p className="t-eyebrow">{t.groups.members}</p>
                  <p className="t-num mt-1 text-[15px] font-semibold text-[var(--ink)]">
                    {current.live_member_count}
                    <span className="text-[var(--ink-4)]"> / {current.max_members}</span>
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="t-eyebrow">{t.common.createdAt}</p>
                  <p className="t-num mt-1 text-[13px] text-[var(--ink-2)]">
                    {formatDate(current.created_at, false)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="t-eyebrow">{t.groups.inviteCode}</p>
                  <p className="mt-1 flex items-center gap-1">
                    <code className="t-num rounded-[6px] bg-[var(--pane-solid)] px-1.5 py-0.5 font-mono text-[11.5px] text-[var(--ink-2)]">
                      {current.invite_code}
                    </code>
                    <CopyButton value={current.invite_code} />
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Reyting — oq karta, zich qatorlar */}
          <Card>
            <CardHeader
              title={t.groups.leaderboard}
              description={`${leaderboard?.length ?? 0} a'zo`}
              action={<Trophy className="size-4 text-[var(--brand)]" />}
            />
            <CardBody className="enter-stagger space-y-0.5 p-2">
              {leaderboardLoading && !leaderboard ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2.5 px-2 py-1.5">
                    <Skeleton className="size-6 shrink-0 rounded-full" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                ))
              ) : leaderboard?.length ? (
                leaderboard.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2.5 rounded-[var(--r-ctl)] px-2 py-1.5 transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]"
                  >
                    <span className="t-num w-5 shrink-0 text-center text-[11px] font-semibold text-[var(--ink-4)]">
                      {index + 1}
                    </span>
                    <Avatar
                      src={member.avatar_url}
                      name={member.full_name || member.username}
                      size="xs"
                      rank={member.user_rank}
                    />
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/admin/users/${member.user}`}
                        className="focus-ring block truncate rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
                      >
                        {member.username}
                      </Link>
                      <span className="t-num block truncate text-[11px] text-[var(--ink-4)]">
                        {member.problems_solved} masala · {member.rating} reyting
                        {member.role !== "member" ? ` · ${member.role}` : ""}
                      </span>
                    </span>
                    <span className="t-num shrink-0 text-[13px] font-semibold text-[var(--brand)]">
                      {formatNumber(member.total_points)}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState title={t.common.noData} className="py-8" />
              )}
            </CardBody>
          </Card>
        </div>
      </Drawer>
    </>
  );
}

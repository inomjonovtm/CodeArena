"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  MailCheck,
  MoreHorizontal,
  Pencil,
  Plus,
  MapPin,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  Users as UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Button as KitButton } from "@/components/kit";
import { useCan, useConfirm, useI18n } from "@/components/providers";
import { AdminRankBadge, Badge, RoleBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { DataTable, FilterCell, type Column } from "@/components/ui/data-table";
import { Field, Input, SegmentedControl, Select } from "@/components/ui/field";
import { Avatar } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { DropdownMenu, type MenuItem } from "@/components/ui/popover";
import { Listbox } from "@/components/ui/select";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { api, resource } from "@/lib/api";
import type { AdminUser, RankGroup, RankTableRow, Region, Role } from "@/lib/types";
import { cn, formatDate, formatNumber, formatRelative } from "@/lib/utils";

const users = resource<AdminUser>("users");

/** Kesim chipi — botiq maydonda oq tugma, tanlangani brend yuvindisi. */
const facetChip = (active: boolean) =>
  cn(
    "focus-ring inline-flex items-center gap-1.5 rounded-[var(--r-chip)] border px-2.5 py-1",
    "text-[12px] whitespace-nowrap transition-[background-color,border-color,color] duration-[var(--t-fast)]",
    active
      ? "border-[var(--brand-edge)] bg-[var(--brand-wash)] text-[var(--brand-ink)]"
      : "border-[var(--edge)] bg-[var(--pane-solid)] text-[var(--ink-2)] hover:border-[var(--brand-edge)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-ink)]",
  );

interface UserSummary {
  total: number;
  active: number;
  banned: number;
  admins: number;
  moderators: number;
  new_today: number;
  new_this_week: number;
  unverified: number;
  without_region: number;
  by_region: { region: string; count: number }[];
  by_rank: (RankGroup & { min_rating: number; count: number })[];
}

export default function UsersPage() {
  const { t } = useI18n();
  const can = useCan();
  const router = useRouter();
  const queryClient = useQueryClient();
  const table = useTableQuery();
  const { confirm, prompt } = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [roleDraft, setRoleDraft] = useState<Role>("user");
  const [draft, setDraft] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "user" as Role,
    locale: "uz",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["users", table.params],
    queryFn: () => users.list(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: ["users", "summary"],
    queryFn: () => users.summary<UserSummary>(),
  });

  // Viloyat/tuman ro'yxati — saytdagi ro'yxatdan o'tish formasi bilan bir xil
  // manba, shuning uchun filtr qiymatlari bazadagilarga aniq mos tushadi.
  const { data: geo } = useQuery({
    queryKey: ["geo-regions"],
    queryFn: () => api.get<{ regions: Region[] }>("/geo/regions/"),
    staleTime: 60 * 60 * 1000,
  });
  const { data: rankData } = useQuery({
    queryKey: ["ranks"],
    queryFn: () => api.get<{ ranks: RankTableRow[]; groups: RankGroup[] }>("/ranks/"),
    staleTime: 60 * 60 * 1000,
  });

  const regionOptions = (geo?.regions ?? []).map((row) => ({
    value: row.name,
    label: row.name,
    description: `${row.districts.length} ta tuman`,
  }));
  const districtOptions = (
    geo?.regions.find((row) => row.name === table.filters.region)?.districts ?? []
  ).map((name) => ({ value: name, label: name }));
  const tierOptions = (rankData?.ranks ?? []).map((row) => ({
    value: String(row.tier),
    label: row.name_uz,
    description: row.max_rating ? `${row.min_rating}–${row.max_rating}` : `${row.min_rating}+`,
  }));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const createMutation = useCrudMutation((payload: typeof draft) => users.create(payload), {
    invalidate: [["users"]],
    successMessage: "Foydalanuvchi yaratildi",
    onSuccess: () => {
      setCreateOpen(false);
      setDraft({ username: "", email: "", full_name: "", password: "", role: "user", locale: "uz" });
    },
  });

  const banMutation = useCrudMutation(
    ({ id, reason }: { id: string; reason: string }) => users.action(id, "ban", { reason }),
    {
      invalidate: [["users"]],
      successMessage: t.users.bannedSuccess,
      onSuccess: () => {
        setBanTarget(null);
        setBanReason("");
      },
    },
  );

  const unbanMutation = useCrudMutation((id: string) => users.action(id, "unban"), {
    invalidate: [["users"]],
    successMessage: t.users.unbannedSuccess,
  });

  const roleMutation = useCrudMutation(
    ({ id, role }: { id: string; role: Role }) => users.action(id, "change-role", { role }),
    {
      invalidate: [["users"]],
      successMessage: t.users.roleChangedSuccess,
      onSuccess: () => setRoleTarget(null),
    },
  );

  const removeMutation = useCrudMutation((id: string) => users.remove(id), {
    invalidate: [["users"]],
    successMessage: "Foydalanuvchi o'chirildi",
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action, payload }: { ids: (string | number)[]; action: string; payload?: Record<string, unknown> }) =>
      users.bulk(ids, action, payload),
    { invalidate: [["users"]] },
  );

  const columns: Column<AdminUser>[] = [
    {
      key: "user",
      header: t.users.username,
      sortKey: "username",
      csv: (row) => row.username,
      mobilePrimary: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar src={row.avatar_url} name={row.full_name || row.username} size="sm" rank={row.rank} />
          <div className="min-w-0">
            <Link
              href={`/admin/users/${row.id}`}
              className="focus-ring block max-w-[12rem] truncate rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
            >
              {row.username}
            </Link>
            <span className="block max-w-[12rem] truncate text-[11px] text-[var(--ink-4)]">
              {row.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "full_name",
      header: t.users.fullName,
      hideable: true,
      csv: (row) => row.full_name,
      render: (row) => (
        <span className="text-[13px] text-[var(--ink-3)]">{row.full_name || "—"}</span>
      ),
    },
    {
      key: "role",
      header: t.users.role,
      csv: (row) => row.role,
      // Rol o'zgartirish qator ichidagi select'da emas — tasodifiy bosishda
      // odam admin bo'lib qolmasligi uchun menyu + tasdiq oynasi orqali.
      render: (row) => <RoleBadge value={row.role} />,
    },
    {
      key: "status",
      header: t.common.status,
      csv: (row) => (row.is_banned ? "banned" : row.is_active ? "active" : "inactive"),
      render: (row) =>
        row.is_banned ? (
          <Badge tone="danger" dot>
            {t.users.banned}
          </Badge>
        ) : !row.is_active ? (
          <Badge tone="neutral" dot>
            {t.users.inactive}
          </Badge>
        ) : row.is_email_verified ? (
          <Badge tone="success" dot>
            {t.users.active}
          </Badge>
        ) : (
          <Badge tone="warning" dot>
            {t.users.unverified}
          </Badge>
        ),
    },
    {
      key: "rank",
      header: "Rank",
      csv: (row) => row.rank?.name_uz ?? "",
      render: (row) => <AdminRankBadge rank={row.rank} showName />,
    },
    {
      key: "rating",
      header: t.users.rating,
      sortKey: "rating",
      align: "right",
      csv: (row) => row.rating,
      render: (row) => (
        <span className="t-num font-medium text-[var(--ink)]">{row.rating}</span>
      ),
    },
    {
      key: "points",
      header: t.users.points,
      sortKey: "total_points",
      align: "right",
      csv: (row) => row.total_points,
      render: (row) => (
        <span className="t-num font-medium text-[var(--brand)]">
          {formatNumber(row.total_points)}
        </span>
      ),
    },
    {
      key: "solved",
      header: t.users.solved,
      sortKey: "problems_solved",
      align: "right",
      hideable: true,
      csv: (row) => row.problems_solved,
      render: (row) => <span className="t-num text-[var(--ink-3)]">{row.problems_solved}</span>,
    },
    {
      key: "address",
      header: "Manzil",
      hideable: true,
      csv: (row) => [row.region, row.district].filter(Boolean).join(", "),
      render: (row) =>
        row.region ? (
          <button
            type="button"
            title="Shu viloyat bo'yicha filtrlash"
            onClick={(event) => {
              // Qator bosilganda profilga o'tib ketmasligi uchun
              event.stopPropagation();
              table.setFilter("region", row.region);
              table.setFilter("district", "");
            }}
            className="focus-ring flex min-w-0 items-start gap-1.5 rounded-[6px] text-left transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]"
          >
            <MapPin className="mt-0.5 size-3 shrink-0 text-[var(--ink-4)]" />
            <span className="min-w-0">
              <span className="block max-w-[10rem] truncate text-[12.5px] text-[var(--ink-3)]">
                {row.region}
              </span>
              {row.district ? (
                <span className="block max-w-[10rem] truncate text-[11px] text-[var(--ink-4)]">
                  {row.district}
                </span>
              ) : null}
            </span>
          </button>
        ) : (
          <span className="text-[12px] text-[var(--ink-4)]">—</span>
        ),
    },
    {
      key: "education_place",
      header: "Ta'lim maskani",
      hideable: true,
      defaultHidden: true,
      csv: (row) => row.education_place,
      render: (row) => (
        <span className="block max-w-[14rem] truncate text-[12.5px] text-[var(--ink-3)]">
          {row.education_place || "—"}
        </span>
      ),
    },
    {
      key: "country",
      header: t.users.country,
      align: "center",
      hideable: true,
      defaultHidden: true,
      csv: (row) => row.country,
      render: (row) => (
        <span className="text-[12px] text-[var(--ink-3)]">{row.country || "—"}</span>
      ),
    },
    {
      key: "last_login",
      header: t.users.lastLogin,
      sortKey: "last_login",
      hideable: true,
      csv: (row) => row.last_login,
      render: (row) => (
        <span className="text-[12px] whitespace-nowrap text-[var(--ink-4)]">
          {row.last_login ? formatRelative(row.last_login) : t.common.never}
        </span>
      ),
    },
    {
      key: "created_at",
      header: t.users.registered,
      sortKey: "created_at",
      hideable: true,
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
      width: "5.5rem",
      render: (row) => {
        const items: MenuItem[] = [
          {
            key: "edit",
            label: t.common.edit,
            icon: <Pencil className="size-3.5" />,
            href: `/admin/users/${row.id}`,
          },
        ];

        if (can("users.role")) {
          items.push({
            key: "role",
            label: t.users.role,
            icon: <UserCog className="size-3.5" />,
            hint: row.role === "admin" ? "Admin" : row.role === "moderator" ? "Moder." : "User",
            onSelect: () => {
              setRoleDraft(row.role);
              setRoleTarget(row);
            },
          });

        }

        if (can("users.ban")) {
          items.push(
            row.is_banned
              ? {
                  key: "unban",
                  label: t.users.unban,
                  icon: <UserCheck className="size-3.5" />,
                  onSelect: async () => {
                    const ok = await confirm({
                      title: `${t.users.unban}: ${row.username}`,
                      message: "Foydalanuvchi yana tizimga kira oladi.",
                      confirmLabel: t.users.unban,
                      danger: false,
                    });
                    if (ok) unbanMutation.mutate(row.id);
                  },
                }
              : {
                  key: "ban",
                  label: t.users.ban,
                  icon: <Ban className="size-3.5" />,
                  danger: true,
                  onSelect: () => setBanTarget(row),
                },
          );
        }

        if (can("users.delete")) {
          items.push({
            key: "delete",
            label: t.common.delete,
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            separatorBefore: true,
            onSelect: async () => {
              const ok = await confirm({
                title: `${t.common.delete}: ${row.username}`,
                message:
                  "Foydalanuvchi va uning barcha submissionlari o'chiriladi. Bu amalni qaytarib bo'lmaydi.",
                confirmLabel: t.common.delete,
                danger: true,
                requireText: row.username,
              });
              if (ok) removeMutation.mutate(row.id);
            },
          });
        }

        return (
          <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
            <ButtonLink
              href={`/admin/users/${row.id}`}
              variant="ghost"
              size="iconSm"
              aria-label={t.common.edit}
              title={t.common.edit}
            >
              <Pencil className="size-3.5" />
            </ButtonLink>
            <DropdownMenu
              items={items}
              trigger={<MoreHorizontal className="size-3.5" />}
              triggerLabel={t.common.actions}
            />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={t.users.title}
        description={t.users.subtitle}
        actions={
          can("users.edit") ? (
            <KitButton
              variant="primary"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => setCreateOpen(true)}
            >
              {t.users.newUser}
            </KitButton>
          ) : null
        }
      />

      {/* --------------------------------------------------- KPI qatori */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.common.total}
          value={formatNumber(summary?.total ?? 0)}
          hint={`+${summary?.new_this_week ?? 0} ${t.dashboard.newThisWeek}`}
          icon={<UsersIcon className="size-[17px]" />}
        />
        <StatCard
          label={t.users.active}
          value={formatNumber(summary?.active ?? 0)}
          hint={`${formatNumber(summary?.unverified ?? 0)} tasdiqlanmagan`}
          tone="accent"
        />
        <StatCard
          label={t.users.banned}
          value={formatNumber(summary?.banned ?? 0)}
          tone={summary?.banned ? "danger" : "neutral"}
        />
        <StatCard
          label="Admin / Moderator"
          value={`${summary?.admins ?? 0} / ${summary?.moderators ?? 0}`}
          tone="info"
          icon={<ShieldCheck className="size-[17px]" />}
        />
      </div>

      {/* --------------------------------------------- hudud va daraja kesimi */}
      {summary?.by_region?.length || summary?.by_rank?.length ? (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          {summary.by_region?.length ? (
            <div className="pane rounded-[var(--r-pane)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="t-eyebrow">Viloyatlar bo&apos;yicha</p>
                {summary.without_region > 0 ? (
                  <button
                    type="button"
                    onClick={() => table.setFilter("has_region", "false")}
                    className="focus-ring rounded-[6px] text-[11.5px] font-medium text-[var(--warn)] hover:underline"
                  >
                    {formatNumber(summary.without_region)} tasida manzil yo&apos;q
                  </button>
                ) : null}
              </div>
              <div className="pane-sunken flex flex-wrap gap-1.5 rounded-[var(--r-field)] p-3">
                {summary.by_region.slice(0, 12).map((row) => (
                  <button
                    key={row.region}
                    type="button"
                    onClick={() => {
                      table.setFilter("region", row.region);
                      table.setFilter("district", "");
                    }}
                    className={facetChip(table.filters.region === row.region)}
                  >
                    {row.region}
                    <span className="t-num font-semibold">{row.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="pane rounded-[var(--r-pane)] p-4">
            <p className="t-eyebrow mb-3">Ranklar bo&apos;yicha</p>
            <div className="pane-sunken flex flex-wrap gap-1.5 rounded-[var(--r-field)] p-3">
              {(summary.by_rank ?? []).map((row) => (
                <button
                  key={row.key}
                  type="button"
                  title={`${row.name_uz} · ${row.min_rating}+`}
                  onClick={() => table.setFilter("rank", row.key)}
                  className={cn(facetChip(table.filters.rank === row.key), row.count === 0 && "opacity-45")}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  {row.name_uz}
                  <span className="t-num font-semibold">{row.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
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
        searchPlaceholder="Username, email yoki ism..."
        tableId="users"
        selectable={can("users.edit")}
        serverExportUrl="/admin/users/export"
        exportParams={table.params as Record<string, unknown>}
        activeFilterCount={table.activeFilterCount}
        onClearFilters={table.clearFilters}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
        emptyTitle="Foydalanuvchi topilmadi"
        emptyDescription="Filtrlarni tozalab ko'ring yoki boshqa kalit so'z kiriting."
        filtersSlot={
          <>
            <SegmentedControl
             stacked
              label={t.users.role}
              allLabel={t.common.all}
              value={table.filters.role as string}
              onChange={(next) => table.setFilter("role", next)}
              options={[
                { value: "user", label: t.users.roleUser },
                { value: "moderator", label: "Moder." },
                { value: "admin", label: "Admin" },
              ]}
            />
            <SegmentedControl
             stacked
              label={t.common.status}
              allLabel={t.common.all}
              value={table.filters.is_banned as string}
              onChange={(next) => table.setFilter("is_banned", next)}
              options={[
                { value: "false", label: t.users.active, tone: "success" },
                { value: "true", label: t.users.banned, tone: "danger" },
              ]}
            />
            <SegmentedControl
             stacked
              label="Email"
              allLabel={t.common.all}
              value={table.filters.is_email_verified as string}
              onChange={(next) => table.setFilter("is_email_verified", next)}
              options={[
                { value: "true", label: t.users.verified, tone: "success" },
                { value: "false", label: t.users.unverified, tone: "warning" },
              ]}
            />
            <SegmentedControl
             stacked
              label="Manzil"
              allLabel={t.common.all}
              value={table.filters.has_region as string}
              onChange={(next) => table.setFilter("has_region", next)}
              options={[
                { value: "true", label: "To'ldirilgan", tone: "success" },
                { value: "false", label: "Bo'sh", tone: "warning" },
              ]}
            />

            {/* ----------------------------------------------- manzil */}
            <FilterCell label="Viloyat">
              <Listbox
                searchable
                clearable
                placeholder={t.common.all}
                ariaLabel="Viloyat"
                value={(table.filters.region as string) ?? ""}
                onSelect={(next) => {
                  // Viloyat almashsa tuman filtri yaroqsiz bo'lib qoladi
                  table.setFilter("region", next);
                  table.setFilter("district", "");
                }}
                options={regionOptions}
              />
            </FilterCell>

            <FilterCell label="Tuman / shahar">
              <Listbox
                searchable
                clearable
                disabled={!table.filters.region}
                placeholder={table.filters.region ? t.common.all : "Avval viloyat"}
                ariaLabel="Tuman"
                value={(table.filters.district as string) ?? ""}
                onSelect={(next) => table.setFilter("district", next)}
                options={districtOptions}
              />
            </FilterCell>

            <FilterCell label="Ta'lim maskani">
              <Input
                placeholder="Maktab, litsey, universitet..."
                aria-label="Ta'lim maskani"
                value={(table.filters.education_place as string) ?? ""}
                onChange={(event) => table.setFilter("education_place", event.target.value)}
              />
            </FilterCell>

            <FilterCell label="Rank">
              <Listbox
                searchable
                clearable
                placeholder={t.common.all}
                ariaLabel="Rank"
                value={(table.filters.tier as string) ?? ""}
                onSelect={(next) => table.setFilter("tier", next)}
                options={tierOptions}
              />
            </FilterCell>

            <FilterCell label="Reyting oralig'i">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="dan"
                  aria-label="Minimal reyting"
                  value={(table.filters.rating_min as string) ?? ""}
                  onChange={(event) => table.setFilter("rating_min", event.target.value)}
                />
                <span className="text-[var(--ink-4)]">—</span>
                <Input
                  type="number"
                  placeholder="gacha"
                  aria-label="Maksimal reyting"
                  value={(table.filters.rating_max as string) ?? ""}
                  onChange={(event) => table.setFilter("rating_max", event.target.value)}
                />
              </div>
            </FilterCell>

            <FilterCell label="Ro'yxatdan o'tgan">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  aria-label="Sanadan"
                  value={(table.filters.created_after as string) ?? ""}
                  onChange={(event) => table.setFilter("created_after", event.target.value)}
                />
                <span className="text-[var(--ink-4)]">—</span>
                <Input
                  type="date"
                  aria-label="Sanagacha"
                  value={(table.filters.created_before as string) ?? ""}
                  onChange={(event) => table.setFilter("created_before", event.target.value)}
                />
              </div>
            </FilterCell>
          </>
        }
        bulkActions={
          can("users.edit")
            ? [
                {
                  key: "verify",
                  label: t.users.verifyEmail,
                  icon: <MailCheck className="size-3.5" />,
                  onRun: (ids) =>
                    bulkMutation.mutateAsync({ ids, action: "verify_email" }).then(invalidate),
                },
                {
                  key: "activate",
                  label: t.users.active,
                  icon: <CheckCircle2 className="size-3.5" />,
                  onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "activate" }).then(invalidate),
                },
                {
                  key: "ban",
                  label: t.users.ban,
                  icon: <Ban className="size-3.5" />,
                  danger: true,
                  onRun: async (ids) => {
                    const reason = await prompt({
                      title: `${ids.length} ta foydalanuvchini bloklash`,
                      label: t.users.banReason,
                      placeholder: "Plagiat, spam, qoidabuzarlik...",
                      hint: "Sabab foydalanuvchiga ko'rsatiladi va audit logga yoziladi.",
                      confirmLabel: t.users.ban,
                      danger: true,
                    });
                    if (!reason) return;
                    return bulkMutation
                      .mutateAsync({ ids, action: "ban", payload: { reason } })
                      .then(invalidate);
                  },
                },
                {
                  key: "unban",
                  label: t.users.unban,
                  icon: <UserCheck className="size-3.5" />,
                  onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "unban" }).then(invalidate),
                },
                {
                  key: "delete",
                  label: t.common.delete,
                  icon: <Trash2 className="size-3.5" />,
                  danger: true,
                  onRun: async (ids) => {
                    const ok = await confirm({
                      title: `${ids.length} ta foydalanuvchini o'chirish`,
                      message:
                        "Tanlangan hisoblar va ularning barcha submissionlari o'chiriladi. Bu amalni qaytarib bo'lmaydi.",
                      confirmLabel: t.common.delete,
                      danger: true,
                      requireText: String(ids.length),
                    });
                    if (!ok) return;
                    return bulkMutation.mutateAsync({ ids, action: "delete" }).then(invalidate);
                  },
                },
              ]
            : undefined
        }
      />

      {/* --------------------------------------------------- yangi user */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t.users.newUser}
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(draft)}
            >
              {t.common.create}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.users.username} required>
            <Input
              autoFocus
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
            />
          </Field>
          <Field label={t.users.email} required>
            <Input
              type="email"
              value={draft.email}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            />
          </Field>
          <Field label={t.users.fullName} className="sm:col-span-2">
            <Input
              value={draft.full_name}
              onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
            />
          </Field>
          <Field label={t.users.role}>
            <Select
              value={draft.role}
              onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}
              options={[
                { value: "user", label: t.users.roleUser },
                { value: "moderator", label: t.users.roleModerator },
                { value: "admin", label: t.users.roleAdmin },
              ]}
            />
          </Field>
          <Field
            label={t.auth.password}
            required
            className="sm:col-span-2"
            hint={t.validation.passwordShort}
          >
            <Input
              type="password"
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* ------------------------------------------------------- ban modal */}
      <Modal
        open={Boolean(banTarget)}
        onClose={() => setBanTarget(null)}
        title={`${t.users.ban}: ${banTarget?.username ?? ""}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setBanTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={banMutation.isPending}
              disabled={!banReason.trim()}
              onClick={() => banTarget && banMutation.mutate({ id: banTarget.id, reason: banReason })}
            >
              {t.users.ban}
            </Button>
          </>
        }
      >
        <Field label={t.users.banReason} required>
          <Input
            autoFocus
            value={banReason}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder="Plagiat, spam, qoidabuzarlik..."
          />
        </Field>
      </Modal>

      {/* ------------------------------------------------------ rol modali */}
      <Modal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title={`${t.users.role}: ${roleTarget?.username ?? ""}`}
        description="Rol foydalanuvchining panelga kirish huquqini belgilaydi."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRoleTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={roleMutation.isPending}
              disabled={roleDraft === roleTarget?.role}
              onClick={() =>
                roleTarget && roleMutation.mutate({ id: roleTarget.id, role: roleDraft })
              }
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <SegmentedControl
            stacked
            value={roleDraft}
            onChange={(next) => setRoleDraft(next as Role)}
            ariaLabel={t.users.role}
            options={[
              { value: "user", label: t.users.roleUser },
              { value: "moderator", label: t.users.roleModerator },
              { value: "admin", label: t.users.roleAdmin, tone: "danger" },
            ]}
          />
          <p className="pane-sunken rounded-[var(--r-field)] p-3 text-[13px] leading-relaxed text-[var(--ink-2)]">
            {roleDraft === "admin" ? (
              <>
                <strong className="text-[var(--bad)]">Administrator</strong> — panelning barcha
                bo&apos;limlari, foydalanuvchilar, sozlamalar va o&apos;chirish amallari.
              </>
            ) : roleDraft === "moderator" ? (
              <>
                <strong className="text-[var(--ink)]">Moderator</strong> — kontent va moderatsiya
                bo&apos;limlari. Foydalanuvchilarni boshqara olmaydi.
              </>
            ) : (
              <>
                <strong className="text-[var(--ink)]">Foydalanuvchi</strong> — admin panelga kira
                olmaydi.
              </>
            )}
          </p>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Ban,
  Flame,
  Save,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Trophy,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { PermissionsPanel } from "@/components/admin/security-panel";
import { Alert, Block, Button as KitButton } from "@/components/kit";
import { useCan, useI18n } from "@/components/providers";
import { AdminRankBadge, Badge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Avatar, StatRow, Tabs } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Listbox } from "@/components/ui/select";
import { useCrudMutation } from "@/hooks/use-crud";
import { api, resource } from "@/lib/api";
import type { AdminSubmission, AdminUserDetail, Region, Role } from "@/lib/types";
import { formatDate, formatNumber, formatRelative } from "@/lib/utils";

const users = resource<AdminUserDetail>("users");

interface UserStats {
  submissions_by_status: { status: string; count: number }[];
  submissions_by_language: { language: string; count: number }[];
  solved_by_difficulty: { problem__difficulty: string; count: number }[];
  contests: number;
  bookmarks: number;
  discussions: number;
}

export default function UserDetailPage() {
  const { t } = useI18n();
  const can = useCan();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [tab, setTab] = useState("profile");
  const [draft, setDraft] = useState<Partial<AdminUserDetail> & { password?: string }>({});
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(1500);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["users", id],
    queryFn: () => users.retrieve(id),
  });

  const { data: stats } = useQuery({
    queryKey: ["users", id, "stats"],
    queryFn: () => api.get<UserStats>(`/admin/users/${id}/stats/`),
  });

  // Manzil ro'yxati saytdagi ro'yxatdan o'tish formasi bilan bitta manbadan
  const { data: geo } = useQuery({
    queryKey: ["geo-regions"],
    queryFn: () => api.get<{ regions: Region[] }>("/geo/regions/"),
    staleTime: 60 * 60 * 1000,
  });

  const { data: submissions } = useQuery({
    queryKey: ["users", id, "submissions"],
    queryFn: () => api.get<AdminSubmission[]>(`/admin/users/${id}/recent-submissions/`),
  });

  useEffect(() => {
    if (data) {
      setDraft({
        full_name: data.full_name,
        email: data.email,
        bio: data.bio,
        country: data.country,
        region: data.region,
        district: data.district,
        education_place: data.education_place,
        avatar_url: data.avatar_url,
        github_url: data.github_url,
        website_url: data.website_url,
        role: data.role,
        locale: data.locale,
        is_active: data.is_active,
        is_email_verified: data.is_email_verified,
        notify_email: data.notify_email,
        notify_contest: data.notify_contest,
      });
      setRatingValue(data.rating);
    }
  }, [data]);

  const saveMutation = useCrudMutation(
    (payload: Partial<AdminUserDetail>) => users.update(id, payload),
    { invalidate: [["users"]], successMessage: "Saqlandi" },
  );

  const banMutation = useCrudMutation(
    (reason: string) => users.action(id, "ban", { reason }),
    {
      invalidate: [["users"]],
      successMessage: t.users.bannedSuccess,
      onSuccess: () => {
        setBanOpen(false);
        setBanReason("");
      },
    },
  );

  const unbanMutation = useCrudMutation(() => users.action(id, "unban"), {
    invalidate: [["users"]],
    successMessage: t.users.unbannedSuccess,
  });

  const ratingMutation = useCrudMutation(
    (rating: number) => users.action(id, "adjust-rating", { rating }),
    {
      invalidate: [["users"]],
      successMessage: "Reyting yangilandi",
      onSuccess: () => setRatingOpen(false),
    },
  );

  const deleteMutation = useCrudMutation(() => users.remove(id), {
    invalidate: [["users"]],
    successMessage: "Foydalanuvchi o'chirildi",
    onSuccess: () => router.replace("/admin/users"),
  });

  // Skelet sahifaning haqiqiy tartibini takrorlaydi
  if (isLoading || !data) {
    return (
      <div className="enter">
        <Block className="h-8 w-64 rounded-[var(--r-ctl)]" />
        <Block className="mt-3 h-3.5 w-80" />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Block key={index} className="h-28 rounded-[var(--r-pane)]" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Block className="h-96 rounded-[var(--r-pane-lg)]" />
          <Block className="h-72 rounded-[var(--r-pane-lg)]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        backHref="/admin/users"
        title={
          <span className="flex items-center gap-2.5">
            <Avatar src={data.avatar_url} name={data.full_name || data.username} size="sm" rank={data.rank} />
            <span className="truncate">{data.username}</span>
            <RoleBadge value={data.role} />
            {data.is_banned ? (
              <Badge tone="danger" dot>
                {t.users.banned}
              </Badge>
            ) : null}
          </span>
        }
        description={`${data.email} · ${t.users.registered}: ${formatDate(data.created_at, false)}`}
        actions={
          <>
            {can("users.delete") ? (
              <KitButton
                variant="ghost"
                size="sm"
                className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
                icon={<Trash2 className="size-4" />}
                onClick={() => setDeleteOpen(true)}
              >
                {t.common.delete}
              </KitButton>
            ) : null}
            {can("users.ban") ? (
              data.is_banned ? (
                <KitButton
                  variant="quiet"
                  size="sm"
                  icon={<UserCheck className="size-4" />}
                  loading={unbanMutation.isPending}
                  onClick={() => unbanMutation.mutate(undefined as never)}
                >
                  {t.users.unban}
                </KitButton>
              ) : (
                <KitButton
                  variant="quiet"
                  size="sm"
                  icon={<Ban className="size-4" />}
                  onClick={() => setBanOpen(true)}
                >
                  {t.users.ban}
                </KitButton>
              )
            ) : null}
          </>
        }
        tabs={
          <Tabs
            active={tab}
            onChange={setTab}
            items={[
              { key: "profile", label: t.users.profileTab },
              { key: "activity", label: t.users.activityTab },
              {
                key: "submissions",
                label: t.users.submissionsTab,
                badge: data.submissions_count,
              },
              ...(can("users.permissions")
                ? [{ key: "permissions", label: "Ruxsatlar" }]
                : []),
            ]}
          />
        }
      />

      {data.is_banned ? (
        <Alert tone="bad" title={t.users.banned} className="mb-6">
          {data.ban_reason || "Sabab ko'rsatilmagan"}
          {data.banned_by_username ? ` · ${data.banned_by_username}` : ""}
          {data.banned_until ? ` · ${formatDate(data.banned_until)} gacha` : " · muddatsiz"}
        </Alert>
      ) : null}

      {/* --------------------------------------------------- KPI qatori */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Rank"
          value={<AdminRankBadge rank={data.rank} showName />}
          hint={
            data.rank?.is_max
              ? "eng yuqori rank"
              : `${data.rank?.next_name_uz} gacha ${formatNumber(data.rank?.to_next ?? 0)}`
          }
          tone="accent"
        />
        <StatCard
          label={t.users.rating}
          value={data.rating}
          hint={`max ${data.max_rating}`}
          icon={<TrendingUp className="size-[17px]" />}
          tone="info"
        />
        <StatCard
          label={t.users.points}
          value={formatNumber(data.total_points)}
          hint={`${data.problems_solved} masala`}
          icon={<Trophy className="size-[17px]" />}
        />
        <StatCard
          label={t.users.streak}
          value={data.current_streak}
          hint={`eng uzun: ${data.longest_streak}`}
          icon={<Flame className="size-[17px]" />}
          tone="warning"
        />
        <StatCard
          label={t.nav.submissions}
          value={formatNumber(data.submissions_count)}
          hint={`${stats?.contests ?? 0} contest`}
          icon={<Activity className="size-[17px]" />}
          tone="neutral"
        />
      </div>

      {/* ----------------------------------------------------------- profil */}
      {tab === "profile" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title={t.users.profileTab} description="Ommaviy profil ma'lumotlari" />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label={t.users.fullName}>
                  <Input
                    value={draft.full_name ?? ""}
                    onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
                  />
                </Field>
                <Field label={t.users.email} required>
                  <Input
                    type="email"
                    value={draft.email ?? ""}
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  />
                </Field>
                <Field label={t.users.country} hint="ISO kod: UZ, KZ, RU...">
                  <Input
                    maxLength={2}
                    value={draft.country ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, country: event.target.value.toUpperCase() })
                    }
                  />
                </Field>
                <Field label="Viloyat">
                  <Listbox
                    searchable
                    clearable
                    placeholder="Tanlanmagan"
                    ariaLabel="Viloyat"
                    value={draft.region ?? ""}
                    // Viloyat almashsa eski tuman mos kelmay qoladi
                    onSelect={(next) => setDraft({ ...draft, region: next, district: "" })}
                    options={(geo?.regions ?? []).map((row) => ({
                      value: row.name,
                      label: row.name,
                      description: `${row.districts.length} ta tuman`,
                    }))}
                  />
                </Field>
                <Field label="Tuman / shahar">
                  <Listbox
                    searchable
                    clearable
                    disabled={!draft.region}
                    placeholder={draft.region ? "Tanlanmagan" : "Avval viloyat"}
                    ariaLabel="Tuman"
                    value={draft.district ?? ""}
                    onSelect={(next) => setDraft({ ...draft, district: next })}
                    options={(
                      geo?.regions.find((row) => row.name === draft.region)?.districts ?? []
                    ).map((name) => ({ value: name, label: name }))}
                  />
                </Field>
                <Field label="Ta'lim maskani" className="sm:col-span-2">
                  <Input
                    placeholder="Maktab, litsey, kollej yoki universitet"
                    value={draft.education_place ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, education_place: event.target.value })
                    }
                  />
                </Field>
                <Field label="Avatar URL" className="sm:col-span-2">
                  <Input
                    value={draft.avatar_url ?? ""}
                    onChange={(event) => setDraft({ ...draft, avatar_url: event.target.value })}
                  />
                </Field>
                <Field label="GitHub">
                  <Input
                    value={draft.github_url ?? ""}
                    onChange={(event) => setDraft({ ...draft, github_url: event.target.value })}
                  />
                </Field>
                <Field label="Veb-sayt">
                  <Input
                    value={draft.website_url ?? ""}
                    onChange={(event) => setDraft({ ...draft, website_url: event.target.value })}
                  />
                </Field>
                <Field label="Bio" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={draft.bio ?? ""}
                    onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
                  />
                </Field>
              </CardBody>
            </Card>

            {can("users.edit") ? (
              <Card>
                <CardHeader title={t.users.dangerTab} description="Faqat administratorlar uchun" />
                <CardBody className="flex flex-col gap-4">
                  <Field label={t.users.newPassword} hint={t.validation.passwordShort}>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={draft.password ?? ""}
                        onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                        placeholder="••••••••"
                      />
                      <Button
                        variant="outline"
                        size="md"
                        disabled={!draft.password}
                        onClick={() => saveMutation.mutate({ password: draft.password } as never)}
                      >
                        {t.users.resetPassword}
                      </Button>
                    </div>
                  </Field>
                  {/* Reyting qo'lda o'zgartiriladigan joy — botiq tasmada ajratilgan */}
                  <div className="pane flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-field)] px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--ink)]">
                        {t.users.adjustRating}
                      </p>
                      <p className="t-num t-meta text-[var(--ink-4)]">
                        Joriy: {data.rating} · maksimal: {data.max_rating}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setRatingOpen(true)}>
                      {t.common.edit}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            {/* Ruxsatlar — botiq blok, kalitlar ustma-ust */}
            <div className="pane rounded-[var(--r-pane-lg)] p-5">
              <p className="t-eyebrow mb-4">Ruxsatlar</p>
              <div className="flex flex-col gap-4">
                <Field label={t.users.role}>
                  <Select
                    value={draft.role ?? "user"}
                    disabled={!can("users.role")}
                    onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}
                    options={[
                      { value: "user", label: t.users.roleUser },
                      { value: "moderator", label: t.users.roleModerator },
                      { value: "admin", label: t.users.roleAdmin },
                    ]}
                  />
                </Field>
                <Switch
                  checked={Boolean(draft.is_active)}
                  onChange={(next) => setDraft({ ...draft, is_active: next })}
                  label={t.users.active}
                  description="Hisob faolmi"
                />
                <Switch
                  checked={Boolean(draft.is_email_verified)}
                  onChange={(next) => setDraft({ ...draft, is_email_verified: next })}
                  label={t.users.verified}
                  description="Email tasdiqlangan"
                />
                <Switch
                  checked={Boolean(draft.notify_email)}
                  onChange={(next) => setDraft({ ...draft, notify_email: next })}
                  label="Email bildirishnomalar"
                />
                <Switch
                  checked={Boolean(draft.notify_contest)}
                  onChange={(next) => setDraft({ ...draft, notify_contest: next })}
                  label="Contest bildirishnomalari"
                />
              </div>
            </div>

            <Card>
              <CardHeader title="Texnik ma'lumot" />
              <CardBody>
                <StatRow
                  label="ID"
                  value={<span className="font-mono text-[11px]">{data.id.slice(0, 13)}…</span>}
                />
                <StatRow
                  label={t.users.lastLogin}
                  value={data.last_login ? formatRelative(data.last_login) : t.common.never}
                />
                <StatRow label="IP" value={data.last_login_ip ?? "—"} />
                <StatRow label={t.common.updatedAt} value={formatDate(data.updated_at, false)} />
                <StatRow label="Bookmarklar" value={stats?.bookmarks ?? 0} />
                <StatRow label="Muhokamalar" value={stats?.discussions ?? 0} />
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------------- ruxsatlar */}
      {tab === "permissions" && can("users.permissions") ? (
        <PermissionsPanel
          userId={data.id}
          role={data.role}
          extra={data.extra_permissions ?? []}
          denied={data.denied_permissions ?? []}
          effective={data.effective_permissions ?? []}
          onSaved={() => void queryClient.invalidateQueries({ queryKey: ["users", id] })}
        />
      ) : null}

      {/* --------------------------------------------------------- faollik */}
      {tab === "activity" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Status bo'yicha", rows: stats?.submissions_by_status.map((row) => ({ key: row.status, label: row.status, count: row.count })) },
            { title: "Til bo'yicha", rows: stats?.submissions_by_language.map((row) => ({ key: row.language, label: row.language, count: row.count })) },
            {
              title: "Qiyinlik bo'yicha yechilgan",
              rows: stats?.solved_by_difficulty.map((row) => ({
                key: row.problem__difficulty,
                label: row.problem__difficulty,
                count: row.count,
              })),
            },
          ].map((panel) => (
            <Card key={panel.title}>
              <CardHeader title={panel.title} />
              <CardBody>
                {panel.rows?.length ? (
                  panel.rows.map((row) => (
                    <StatRow key={row.key} label={row.label} value={formatNumber(row.count)} />
                  ))
                ) : (
                  <p className="t-meta text-[var(--ink-4)]">{t.common.noData}</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}

      {/* ----------------------------------------------------- submissionlar */}
      {tab === "submissions" ? (
        <Card>
          <CardHeader
            title={t.users.submissionsTab}
            action={
              <Link
                href={`/admin/submissions?username=${data.username}`}
                className="focus-ring rounded-[6px] text-[12.5px] font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-hover)]"
              >
                {t.common.all}
              </Link>
            }
          />
          {submissions?.length ? (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-[var(--edge-soft)]">
                  {submissions.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]"
                    >
                      <td className="max-w-[16rem] px-5 py-2.5">
                        <Link
                          href={`/admin/problems/${row.problem}`}
                          className="focus-ring block truncate rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors hover:text-[var(--brand)]"
                        >
                          {row.problem_title}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-[var(--ink-3)]">{row.language}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge value={row.status} />
                      </td>
                      <td className="t-num px-3 py-2.5 text-right text-[12px] text-[var(--ink-3)]">
                        {row.runtime_ms ? `${row.runtime_ms} ms` : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[11px] whitespace-nowrap text-[var(--ink-4)]">
                        {formatRelative(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Activity className="size-5" />} title="Submission yo'q" />
          )}
        </Card>
      ) : null}

      {/* Yopishqoq saqlash paneli — faqat profil tahriri uchun */}
      {tab === "profile" && can("users.edit") ? (
        <div className="sticky bottom-4 z-20 mt-6">
          <div className="pane-solid flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3 shadow-[var(--lift-3)]">
            <p className="t-meta min-w-0 truncate text-[var(--ink-4)]">
              {data.full_name || data.username}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <KitButton variant="quiet" size="sm" onClick={() => router.push("/admin/users")}>
                {t.common.cancel}
              </KitButton>
              <KitButton
                variant="primary"
                size="sm"
                icon={<Save className="size-4" />}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(draft)}
              >
                {t.common.save}
              </KitButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* --------------------------------------------------------- modallar */}
      <Modal
        open={banOpen}
        onClose={() => setBanOpen(false)}
        title={`${t.users.ban}: ${data.username}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setBanOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={banMutation.isPending}
              disabled={!banReason.trim()}
              onClick={() => banMutation.mutate(banReason)}
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

      <Modal
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        title={t.users.adjustRating}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRatingOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={ratingMutation.isPending}
              onClick={() => ratingMutation.mutate(ratingValue)}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        <Field label={t.users.rating} hint="Qo'lda o'zgartirish audit logga yoziladi (7-bo'lim).">
          <Input
            type="number"
            autoFocus
            value={ratingValue}
            onChange={(event) => setRatingValue(Number(event.target.value))}
          />
        </Field>
        <p className="t-num mt-3 flex items-center gap-1.5 text-[12.5px] text-[var(--ink-4)]">
          <ShieldCheck className="size-3.5" />
          Joriy: {data.rating} → yangi: {ratingValue}
        </p>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(undefined as never)}
        loading={deleteMutation.isPending}
        title={t.common.delete}
        message={t.users.deleteWarning}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

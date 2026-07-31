"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  CalendarClock,
  ExternalLink,
  Link2,
  Mail,
  Megaphone,
  Pencil,
  Pin,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { useTableQuery } from "@/hooks/use-table-query";
import { api, resource } from "@/lib/api";
import type { Announcement, AnnouncementAudience, Contest, Group } from "@/lib/types";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const announcements = resource<Announcement>("announcements");
const contests = resource<Contest>("contests");
const groups = resource<Group>("groups");

const LEVELS: Record<string, { tone: BadgeTone; uz: string; ink: string; wash: string }> = {
  info: { tone: "info", uz: "Ma'lumot", ink: "var(--note)", wash: "var(--note-wash)" },
  success: { tone: "success", uz: "Muvaffaqiyat", ink: "var(--ok)", wash: "var(--ok-wash)" },
  warning: { tone: "warning", uz: "Ogohlantirish", ink: "var(--warn)", wash: "var(--warn-wash)" },
  danger: { tone: "danger", uz: "Muhim", ink: "var(--bad)", wash: "var(--bad-wash)" },
};

const AUDIENCES: Record<string, { tone: BadgeTone; uz: string }> = {
  all: { tone: "neutral", uz: "Hamma" },
  users: { tone: "info", uz: "Foydalanuvchilar" },
  staff: { tone: "accent", uz: "Xodimlar" },
  contest: { tone: "warning", uz: "Musobaqa" },
  group: { tone: "accent", uz: "Guruh" },
};

interface Draft {
  id?: string;
  title_uz: string;
  body_uz: string;
  level: string;
  is_active: boolean;
  is_pinned: boolean;
  is_dismissible: boolean;
  starts_at: string;
  ends_at: string;
  audience: string;
  target_contest: string;
  target_group: string;
  action_url: string;
  action_label_uz: string;
  send_push: boolean;
}

const emptyDraft: Draft = {
  title_uz: "",
  body_uz: "",
  level: "info",
  is_active: true,
  is_pinned: false,
  is_dismissible: true,
  starts_at: "",
  ends_at: "",
  audience: "all",
  target_contest: "",
  target_group: "",
  action_url: "",
  action_label_uz: "",
  send_push: false,
};

const toDraft = (row: Announcement): Draft => ({
  id: row.id,
  title_uz: row.title_uz,
  body_uz: row.body_uz,
  level: row.level,
  is_active: row.is_active,
  is_pinned: row.is_pinned,
  is_dismissible: row.is_dismissible,
  starts_at: row.starts_at ? row.starts_at.slice(0, 16) : "",
  ends_at: row.ends_at ? row.ends_at.slice(0, 16) : "",
  audience: row.audience,
  target_contest: row.target_contest ?? "",
  target_group: row.target_group ?? "",
  action_url: row.action_url,
  action_label_uz: row.action_label_uz,
  send_push: row.send_push,
});

/** Formaning o'ng ustunidagi jonli ko'rinish — saytdagi banner bilan bir xil. */
function BannerPreview({ draft }: { draft: Draft }) {
  const level = LEVELS[draft.level] ?? LEVELS.info;
  return (
    <div className="rounded-[var(--r-pane)] border border-[var(--edge)] bg-[var(--canvas)] p-4">
      <p className="t-eyebrow mb-3">Saytda shunday ko&apos;rinadi</p>
      <div
        className="flex items-start gap-3 rounded-[var(--r-pane)] border px-4 py-3"
        style={{
          backgroundColor: level.wash,
          borderColor: `color-mix(in oklab, ${level.ink} 24%, transparent)`,
          color: level.ink,
        }}
      >
        <Bell className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold">
            {draft.title_uz || "Sarlavha shu yerda turadi"}
          </p>
          {draft.body_uz ? (
            <p className="mt-0.5 text-[13px] leading-relaxed opacity-90">{draft.body_uz}</p>
          ) : null}
          {draft.action_url && draft.action_label_uz ? (
            <span
              className="mt-2.5 inline-flex h-7 items-center gap-1.5 rounded-[var(--r-ctl)] border px-2.5 text-[12.5px] font-semibold"
              style={{
                borderColor: `color-mix(in oklab, ${level.ink} 38%, transparent)`,
                backgroundColor: `color-mix(in oklab, ${level.ink} 10%, transparent)`,
              }}
            >
              {draft.action_label_uz}
              <ExternalLink className="size-3" />
            </span>
          ) : null}
        </div>
        {draft.is_dismissible ? <span className="text-[13px] opacity-50">✕</span> : null}
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { t } = useI18n();
  const table = useTableQuery();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [sendTarget, setSendTarget] = useState<Announcement | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["announcements", table.params],
    queryFn: () => announcements.list(table.params),
  });

  // Maqsadli auditoriya tanlanganda kerak bo'ladigan ro'yxatlar — faqat
  // forma ochiq va tegishli tur tanlanganda so'raladi
  const { data: contestOptions } = useQuery({
    queryKey: ["announcement-contests"],
    queryFn: () => contests.list({ page_size: 100, ordering: "-start_time" }),
    enabled: draft?.audience === "contest",
    staleTime: 5 * 60_000,
  });

  const { data: groupOptions } = useQuery({
    queryKey: ["announcement-groups"],
    queryFn: () => groups.list({ page_size: 100 }),
    enabled: draft?.audience === "group",
    staleTime: 5 * 60_000,
  });

  // Yuborishdan oldin: kimga tegadi
  const { data: audience } = useQuery({
    queryKey: ["announcement-audience", sendTarget?.id],
    // `resource.action()` faqat POST yuboradi — bu ko'rinish GET, shuning
    // uchun to'g'ridan-to'g'ri klientdan chaqiriladi
    queryFn: () => api.get<AnnouncementAudience>(`/admin/announcements/${sendTarget!.id}/audience/`),
    enabled: Boolean(sendTarget),
  });

  const saveMutation = useCrudMutation(
    (payload: Draft) => {
      const body = {
        ...payload,
        starts_at: payload.starts_at ? new Date(payload.starts_at).toISOString() : null,
        ends_at: payload.ends_at ? new Date(payload.ends_at).toISOString() : null,
        // Bo'sh satr emas, `null` — backendda ForeignKey shuni kutadi
        target_contest: payload.audience === "contest" ? payload.target_contest || null : null,
        target_group: payload.audience === "group" ? payload.target_group || null : null,
      };
      return payload.id ? announcements.update(payload.id, body) : announcements.create(body);
    },
    {
      invalidate: [["announcements"]],
      successMessage: "Saqlandi",
      onSuccess: () => setDraft(null),
    },
  );

  const deleteMutation = useCrudMutation((id: string) => announcements.remove(id), {
    invalidate: [["announcements"]],
    successMessage: "O'chirildi",
    onSuccess: () => setDeleteTarget(null),
  });

  const bulkMutation = useCrudMutation(
    ({ ids, action }: { ids: (string | number)[]; action: string }) =>
      announcements.bulk(ids, action),
    { invalidate: [["announcements"]] },
  );

  const emailMutation = useCrudMutation(
    (id: string) => announcements.action<{ detail: string; sent: number }>(id, "send-email"),
    { invalidate: [["announcements"]], successMessage: "Xatlar yuborildi" },
  );

  const notifyMutation = useCrudMutation(
    (id: string) => announcements.action<{ detail: string; sent: number }>(id, "send-notification"),
    { invalidate: [["announcements"]], successMessage: "Bildirishnoma yuborildi" },
  );

  const kpi = useMemo(() => {
    const list = data?.results ?? [];
    return {
      live: list.filter((row) => row.is_live).length,
      scheduled: list.filter(
        (row) => row.starts_at && new Date(row.starts_at).getTime() > Date.now(),
      ).length,
      delivered: list.filter((row) => row.email_sent_at || row.notified_at).length,
    };
  }, [data]);

  const columns: Column<Announcement>[] = [
    {
      key: "title",
      header: "Sarlavha",
      mobilePrimary: true,
      csv: (row) => row.title_uz,
      render: (row) => (
        <div className="min-w-0">
          <p className="flex max-w-md items-center gap-1.5 truncate text-[13px] font-medium text-[var(--ink)]">
            {row.is_pinned ? (
              <Pin className="size-3 shrink-0 text-[var(--warn)]" aria-label="Qadalgan" />
            ) : null}
            <span className="truncate">{row.title_uz}</span>
          </p>
          <p className="line-clamp-1 max-w-md text-[11.5px] text-[var(--ink-4)]">
            {row.action_url ? (
              <span className="inline-flex items-center gap-1 text-[var(--brand)]">
                <Link2 className="size-3" />
                {row.action_label_uz || row.action_url}
              </span>
            ) : (
              row.body_uz
            )}
          </p>
        </div>
      ),
    },
    {
      key: "level",
      header: t.settingsPage.level,
      csv: (row) => row.level,
      render: (row) => {
        const config = LEVELS[row.level] ?? LEVELS.info;
        return (
          <Badge tone={config.tone} dot>
            {config.uz}
          </Badge>
        );
      },
    },
    {
      key: "audience",
      header: "Auditoriya",
      csv: (row) => row.audience,
      render: (row) => {
        const config = AUDIENCES[row.audience] ?? AUDIENCES.all;
        const target = row.target_contest_title ?? row.target_group_name;
        return (
          <div className="min-w-0">
            <Badge tone={config.tone}>{config.uz}</Badge>
            <p className="t-num mt-1 truncate text-[11px] text-[var(--ink-4)]">
              {target ? `${target} · ` : ""}
              {formatNumber(row.audience_size)} kishi
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Holat",
      align: "center",
      csv: (row) => (row.is_live ? "efirda" : row.is_active ? "faol" : "nofaol"),
      render: (row) =>
        row.is_live ? (
          <Badge tone="success" dot>
            efirda
          </Badge>
        ) : row.is_active ? (
          <Badge tone="warning">kutmoqda</Badge>
        ) : (
          <Badge tone="neutral">nofaol</Badge>
        ),
    },
    {
      key: "delivery",
      header: "Yuborilgan",
      hideable: true,
      csv: (row) => `${row.email_recipients} email / ${row.notified_recipients} bildirishnoma`,
      render: (row) => (
        <div className="t-num flex flex-col gap-0.5 text-[11.5px] text-[var(--ink-3)]">
          <span className="inline-flex items-center gap-1.5">
            <Bell
              className={cn("size-3", row.notified_at ? "text-[var(--ok)]" : "text-[var(--ink-4)]")}
            />
            {row.notified_at ? formatNumber(row.notified_recipients) : "—"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail
              className={cn("size-3", row.email_sent_at ? "text-[var(--ok)]" : "text-[var(--ink-4)]")}
            />
            {row.email_sent_at ? formatNumber(row.email_recipients) : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Muddat",
      hideable: true,
      csv: (row) => `${row.starts_at ?? ""} - ${row.ends_at ?? ""}`,
      render: (row) => (
        <span className="t-num flex items-center gap-1.5 whitespace-nowrap text-[12px] text-[var(--ink-3)]">
          <CalendarClock className="size-3.5 shrink-0 text-[var(--ink-4)]" />
          {row.starts_at ? formatDate(row.starts_at, false) : "—"}
          <span className="text-[var(--ink-4)]">→</span>
          {row.ends_at ? formatDate(row.ends_at, false) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "7rem",
      render: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="iconSm"
            title="Yuborish (bildirishnoma / email)"
            aria-label="Yuborish"
            onClick={() => setSendTarget(row)}
          >
            <Send className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            title={t.common.edit}
            aria-label={t.common.edit}
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
        title={t.settingsPage.announcements}
        description="Banner, bildirishnoma va email — bitta e'londan uch kanal"
        actions={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setDraft({ ...emptyDraft })}>
            {t.settingsPage.newAnnouncement}
          </Button>
        }
      />

      {isError ? (
        <Alert
          tone="bad"
          title="E'lonlarni yuklab bo'lmadi"
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
          label="Jami e'lonlar"
          value={data?.count ?? 0}
          icon={<Megaphone className="size-[18px]" />}
        />
        <StatCard
          label="Efirda"
          value={kpi.live}
          hint="hozir ko'rinmoqda"
          icon={<Bell className="size-[18px]" />}
          tone={kpi.live ? "info" : "neutral"}
        />
        <StatCard
          label="Rejalashtirilgan"
          value={kpi.scheduled}
          hint="boshlanishi kutilmoqda"
          icon={<CalendarClock className="size-[18px]" />}
          tone="neutral"
        />
        <StatCard
          label="Tarqatilgan"
          value={kpi.delivered}
          hint="email yoki bildirishnoma"
          icon={<Send className="size-[18px]" />}
          tone="neutral"
        />
      </div>

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
        selectable
        exportName="codearena-elonlar"
        emptyTitle="E'lon yo'q"
        emptyDescription="Birinchi banner e'lonini yaratib, saytda ko'rsating."
        emptyAction={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setDraft({ ...emptyDraft })}>
            {t.settingsPage.newAnnouncement}
          </Button>
        }
        bulkActions={[
          {
            key: "activate",
            label: "Faollashtirish",
            icon: <Bell className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "activate" }),
          },
          {
            key: "deactivate",
            label: "To'xtatish",
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "deactivate" }),
          },
          {
            key: "pin",
            label: "Qadash",
            icon: <Pin className="size-3.5" />,
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "pin" }),
          },
          {
            key: "unpin",
            label: "Qadashni olib tashlash",
            onRun: (ids) => bulkMutation.mutateAsync({ ids, action: "unpin" }),
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

      {/* ------------------------------------------------------ tahrir formasi */}
      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? t.common.edit : t.settingsPage.newAnnouncement}
        size="xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={saveMutation.isPending}
              disabled={!draft?.title_uz.trim()}
              onClick={() => draft && saveMutation.mutate(draft)}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-w-0 flex-col gap-5">
              <Field label="Sarlavha" required>
                <Input
                  autoFocus
                  value={draft.title_uz}
                  onChange={(event) => setDraft({ ...draft, title_uz: event.target.value })}
                />
              </Field>

              <Field label="Matn">
                <Textarea
                  rows={3}
                  value={draft.body_uz}
                  onChange={(event) => setDraft({ ...draft, body_uz: event.target.value })}
                />
              </Field>

              {/* -------------------------------------------- amal tugmasi */}
              <div className="border-t border-[var(--edge)] pt-4">
                <p className="t-eyebrow mb-1">Amal tugmasi</p>
                <p className="t-meta mb-3 text-[var(--ink-4)]">
                  Bannerdan to&apos;g&apos;ridan-to&apos;g&apos;ri kerakli sahifaga olib boradi.
                  Sayt ichida `/contests/bahor-kubogi`, tashqarida to&apos;liq manzil.
                </p>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <Field label="Manzil">
                    <Input
                      placeholder="/contests/bahor-kubogi"
                      value={draft.action_url}
                      onChange={(event) => setDraft({ ...draft, action_url: event.target.value })}
                    />
                  </Field>
                  <Field label="Tugma matni">
                    <Input
                      placeholder="Musobaqaga o'tish"
                      value={draft.action_label_uz}
                      onChange={(event) =>
                        setDraft({ ...draft, action_label_uz: event.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* ---------------------------------------------- auditoriya */}
              <div className="border-t border-[var(--edge)] pt-4">
                <p className="t-eyebrow mb-3">Kimga ko&apos;rinadi</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Auditoriya">
                    <Select
                      value={draft.audience}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          audience: event.target.value,
                          target_contest: "",
                          target_group: "",
                        })
                      }
                      options={Object.entries(AUDIENCES).map(([value, config]) => ({
                        value,
                        label: config.uz,
                      }))}
                    />
                  </Field>

                  {draft.audience === "contest" ? (
                    <Field label="Musobaqa" required>
                      <Select
                        searchable
                        placeholder="Tanlang..."
                        value={draft.target_contest}
                        onChange={(event) =>
                          setDraft({ ...draft, target_contest: event.target.value })
                        }
                        options={(contestOptions?.results ?? []).map((row) => ({
                          value: row.id,
                          label: row.title_uz,
                        }))}
                      />
                    </Field>
                  ) : null}

                  {draft.audience === "group" ? (
                    <Field label="Guruh" required>
                      <Select
                        searchable
                        placeholder="Tanlang..."
                        value={draft.target_group}
                        onChange={(event) => setDraft({ ...draft, target_group: event.target.value })}
                        options={(groupOptions?.results ?? []).map((row) => ({
                          value: row.id,
                          label: row.name,
                        }))}
                      />
                    </Field>
                  ) : null}
                </div>
              </div>

              {/* ------------------------------------------ ko'rsatish oynasi */}
              <div className="border-t border-[var(--edge)] pt-4">
                <p className="t-eyebrow mb-3">Ko&apos;rsatish oynasi</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t.settingsPage.level}>
                    <Select
                      value={draft.level}
                      onChange={(event) => setDraft({ ...draft, level: event.target.value })}
                      options={Object.entries(LEVELS).map(([value, config]) => ({
                        value,
                        label: config.uz,
                      }))}
                    />
                  </Field>
                  <Field label={t.settingsPage.activeFrom}>
                    <Input
                      type="datetime-local"
                      value={draft.starts_at}
                      onChange={(event) => setDraft({ ...draft, starts_at: event.target.value })}
                    />
                  </Field>
                  <Field label={t.settingsPage.activeTo}>
                    <Input
                      type="datetime-local"
                      value={draft.ends_at}
                      onChange={(event) => setDraft({ ...draft, ends_at: event.target.value })}
                    />
                  </Field>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <Switch
                    checked={draft.is_active}
                    onChange={(next) => setDraft({ ...draft, is_active: next })}
                    label={t.settingsPage.isActive}
                  />
                  <Switch
                    checked={draft.is_pinned}
                    onChange={(next) => setDraft({ ...draft, is_pinned: next })}
                    label="Qadash"
                    description="Boshqa e'lonlardan yuqorida turadi"
                  />
                  <Switch
                    checked={draft.is_dismissible}
                    onChange={(next) => setDraft({ ...draft, is_dismissible: next })}
                    label="Yopish mumkin"
                    description="O'chirilsa, foydalanuvchi bannerni yopa olmaydi (texnik ishlar uchun)"
                  />
                  <Switch
                    checked={draft.send_push}
                    onChange={(next) => setDraft({ ...draft, send_push: next })}
                    label="Push xabari"
                    description="Bildirishnoma yuborilganda qurilmaga ham ketsin"
                  />
                </div>
              </div>
            </div>

            <div className="lg:sticky lg:top-0 lg:self-start">
              <BannerPreview draft={draft} />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ---------------------------------------------------- yuborish oynasi */}
      <Modal
        open={Boolean(sendTarget)}
        onClose={() => setSendTarget(null)}
        title="E'lonni tarqatish"
        description={sendTarget?.title_uz}
        size="md"
        footer={
          <Button variant="outline" size="sm" onClick={() => setSendTarget(null)}>
            {t.common.close}
          </Button>
        }
      >
        {sendTarget ? (
          <div className="flex flex-col gap-4">
            {/* Kimga tegishi — yuborishdan OLDIN ko'rinadi */}
            <div className="rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] p-3.5">
              <p className="t-eyebrow flex items-center gap-2">
                <Users className="size-3.5" />
                Auditoriya
              </p>
              <p className="mt-2 text-[13px] text-[var(--ink-2)]">
                <span className="t-num font-semibold text-[var(--ink)]">
                  {formatNumber(audience?.total ?? sendTarget.audience_size)}
                </span>{" "}
                foydalanuvchi ({AUDIENCES[sendTarget.audience]?.uz ?? sendTarget.audience})
                {audience ? (
                  <>
                    {" · "}
                    <span className="t-num">{formatNumber(audience.email_ready)}</span> tasi email
                    oladi
                  </>
                ) : null}
              </p>
              {audience?.sample.length ? (
                <p className="t-meta mt-1.5 truncate text-[var(--ink-4)]">
                  {audience.sample.join(", ")}
                  {audience.total > audience.sample.length ? " …" : ""}
                </p>
              ) : null}
            </div>

            {/* Kanallar — har biri alohida, holati bilan */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3 rounded-[var(--r-field)] border border-[var(--edge)] p-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--ink)]">
                    <BellRing className="size-4 text-[var(--ink-4)]" />
                    Sayt bildirishnomasi
                    {sendTarget.send_push ? (
                      <Badge tone="accent">+ push</Badge>
                    ) : null}
                  </p>
                  <p className="t-meta mt-0.5 text-[var(--ink-4)]">
                    {sendTarget.notified_at
                      ? `${formatDate(sendTarget.notified_at)} · ${formatNumber(sendTarget.notified_recipients)} kishi`
                      : "Hali yuborilmagan. Qo'ng'iroqda qoladi, banner esa yopilgach yo'qoladi."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={sendTarget.notified_at ? "outline" : "primary"}
                  loading={notifyMutation.isPending}
                  onClick={() => notifyMutation.mutate(sendTarget.id)}
                >
                  {sendTarget.notified_at ? "Qayta yuborish" : "Yuborish"}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[var(--r-field)] border border-[var(--edge)] p-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--ink)]">
                    <Mail className="size-4 text-[var(--ink-4)]" />
                    Email
                  </p>
                  <p className="t-meta mt-0.5 text-[var(--ink-4)]">
                    {sendTarget.email_sent_at
                      ? `${formatDate(sendTarget.email_sent_at)} · ${formatNumber(sendTarget.email_recipients)} kishi`
                      : "Faqat email xabarnomasini yoqqanlarga ketadi."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  loading={emailMutation.isPending}
                  onClick={() => emailMutation.mutate(sendTarget.id)}
                >
                  {sendTarget.email_sent_at ? "Qayta yuborish" : "Yuborish"}
                </Button>
              </div>
            </div>

            <Alert tone="warn">
              Yuborilgan xabarni qaytarib bo&apos;lmaydi. Avval matn va havolani tekshiring.
            </Alert>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={t.common.delete}
        message={t.common.deleteConfirm}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

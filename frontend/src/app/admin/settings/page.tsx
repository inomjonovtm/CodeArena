"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  RotateCcw,
  Save,
  Server,
  Settings2,
  Share2,
  Shield,
  TrendingUp,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { TwoFactorPanel } from "@/components/admin/security-panel";
import { Alert } from "@/components/kit";
import { useAuth, useI18n, useToast } from "@/components/providers";
import { RoleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, Skeleton } from "@/components/ui/card";
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { Avatar, Tabs } from "@/components/ui/misc";
import { useCrudMutation } from "@/hooks/use-crud";
import { api, ApiError, resource } from "@/lib/api";
import type { RankTableRow, SiteSetting } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const settings = resource<SiteSetting>("settings");

const GROUP_META = [
  { key: "general", icon: <Settings2 className="size-3.5" /> },
  { key: "social", icon: <Share2 className="size-3.5" /> },
  { key: "judge", icon: <Server className="size-3.5" /> },
  { key: "security", icon: <Shield className="size-3.5" /> },
  { key: "content", icon: <FileText className="size-3.5" /> },
  { key: "rating", icon: <TrendingUp className="size-3.5" /> },
] as const;

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>("general");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [profile, setProfile] = useState({ full_name: "", email: "", bio: "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<SiteSetting[]>("/admin/settings/"),
  });

  // Chegara maydonlari yonida pog'ona nomi ko'rinishi uchun
  const { data: rankData } = useQuery({
    queryKey: ["ranks"],
    queryFn: () => api.get<{ ranks: RankTableRow[] }>("/ranks/"),
    staleTime: 60 * 60 * 1000,
  });
  const rankRows = rankData?.ranks ?? [];

  useEffect(() => {
    if (data) {
      const next: Record<string, unknown> = {};
      data.forEach((row) => (next[row.key] = row.value));
      setValues(next);
    }
  }, [data]);

  useEffect(() => {
    if (user) {
      setProfile({ full_name: user.full_name, email: user.email, bio: user.bio });
    }
  }, [user]);

  const saveMutation = useCrudMutation(
    (payload: Record<string, unknown>) =>
      settings.collectionAction<{ detail: string; updated: string[] }>("bulk-update", {
        values: payload,
      }),
    { invalidate: [["settings"]], successMessage: t.settingsPage.savedSuccess },
  );

  const profileMutation = useCrudMutation(
    (payload: typeof profile) => api.patch("/auth/me/", payload),
    {
      successMessage: "Profil saqlandi",
      onSuccess: () => {
        void refresh();
        void queryClient.invalidateQueries();
      },
    },
  );

  const labelOf = (row: SiteSetting) =>
    (row.label_uz || row.label_en) || row.key;

  const groups = GROUP_META.map((meta) => ({
    ...meta,
    rows: (data ?? []).filter((row) => row.group === meta.key),
  })).filter((group) => group.rows.length > 0);

  const changedKeys = (data ?? [])
    .filter((row) => JSON.stringify(values[row.key]) !== JSON.stringify(row.value))
    .map((row) => row.key);

  // Guruh nomi bir necha joyda kerak — bitta joydan olinadi
  const groupTitle = (key: string) =>
    key === "general"
      ? t.settingsPage.groupGeneral
      : key === "social"
        ? t.settingsPage.groupSocial
        : key === "judge"
          ? t.settingsPage.groupJudge
          : key === "security"
            ? t.settingsPage.groupSecurity
            : key === "content"
              ? t.settingsPage.groupContent
              : t.settingsPage.groupRating;

  /**
   * Daraja chegaralari — 9 ta son.
   *
   * JSON maydonchasi sifatida ko'rsatish mumkin edi, lekin bitta vergul
   * xatosi butun daraja tizimini buzadi. Shuning uchun alohida 9 ta raqamli
   * maydon va darhol ko'rinadigan tekshiruv.
   */
  const DEFAULT_RANK_THRESHOLDS = [
    1000, 1150, 1300, 1400, 1500, 1600, 1700, 1800,
    1900, 2000, 2100, 2250, 2400, 2550, 2700, 2850, 3000,
  ];

  /**
   * Rank chegaralari — 17 ta son (2–18 pog'onalar).
   *
   * JSON maydonchasi sifatida ko'rsatish mumkin edi, lekin bitta vergul
   * xatosi butun rank tizimini buzadi. Shuning uchun alohida raqamli
   * maydonlar, pog'ona nomlari va darhol ko'rinadigan tekshiruv.
   */
  const renderRankThresholds = (row: SiteSetting) => {
    const raw = Array.isArray(values[row.key]) ? (values[row.key] as number[]) : [];
    const list = Array.from({ length: 17 }, (_, index) => raw[index] ?? 0);
    const ascending = list.every((item, index) => index === 0 || item > list[index - 1]);

    const update = (index: number, next: number) => {
      const copy = [...list];
      copy[index] = next;
      setValues({ ...values, [row.key]: copy });
    };

    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--ink)]">{labelOf(row)}</p>
            <p className="t-meta text-[var(--ink-4)]">{row.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setValues({ ...values, [row.key]: DEFAULT_RANK_THRESHOLDS })}
            className="focus-ring inline-flex items-center gap-1.5 rounded-[var(--r-ctl)] px-2 py-1 text-[12px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand-wash)]"
          >
            <RotateCcw className="size-3.5" />
            Standart qiymatlar
          </button>
        </div>

        {/* Katak oq — 17 ta botiq maydon unda aniq ko'rinadi */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((item, index) => {
            const tier = rankRows[index + 1];
            return (
              <div key={index}>
                <p
                  className="mb-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold"
                  style={{ color: tier?.color }}
                >
                  {tier ? (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: tier.color }}
                    />
                  ) : null}
                  {tier?.name_uz ?? `#${index + 2}`}
                </p>
                <Input
                  type="number"
                  className="t-num text-center"
                  value={String(item)}
                  onChange={(event) => update(index, Number(event.target.value) || 0)}
                />
              </div>
            );
          })}
        </div>

        {!ascending ? (
          <Alert tone="bad" className="mt-3">
            Sonlar o&apos;suvchi tartibda bo&apos;lishi shart — aks holda standart chegaralar
            ishlatiladi.
          </Alert>
        ) : (
          <p className="t-meta mt-3 text-[var(--ink-4)]">
            Eng past pog&apos;ona:{" "}
            <span className="t-num">0–{list[0] - 1}</span> · eng yuqorisi (
            {rankRows[17]?.name_uz ?? "oxirgi"}): <span className="t-num">{list[16]}</span> dan
            yuqori
          </p>
        )}
      </div>
    );
  };

  const renderControl = (row: SiteSetting) => {
    if (row.key === "rank_thresholds") return renderRankThresholds(row);
    const value = values[row.key];
    switch (row.value_type) {
      case "boolean":
        return (
          <Switch
            checked={Boolean(value)}
            onChange={(next) => setValues({ ...values, [row.key]: next })}
            label={labelOf(row)}
            description={row.description}
          />
        );
      case "number":
        return (
          <Field label={labelOf(row)} hint={row.description}>
            <Input
              type="number"
              step="any"
              className="t-num"
              value={value === null || value === undefined ? "" : String(value)}
              onChange={(event) =>
                setValues({
                  ...values,
                  [row.key]: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          </Field>
        );
      case "text":
        return (
          <Field label={labelOf(row)} hint={row.description}>
            <Textarea
              rows={3}
              value={String(value ?? "")}
              onChange={(event) => setValues({ ...values, [row.key]: event.target.value })}
            />
          </Field>
        );
      case "json":
        return (
          <Field label={labelOf(row)} hint={row.description}>
            <Textarea
              rows={4}
              className="font-mono text-[12.5px]"
              value={JSON.stringify(value, null, 2)}
              onChange={(event) => {
                try {
                  setValues({ ...values, [row.key]: JSON.parse(event.target.value) });
                } catch {
                  /* noto'g'ri JSON — saqlamaymiz */
                }
              }}
            />
          </Field>
        );
      default:
        return (
          <Field label={labelOf(row)} hint={row.description}>
            <Input
              value={String(value ?? "")}
              onChange={(event) => setValues({ ...values, [row.key]: event.target.value })}
            />
          </Field>
        );
    }
  };

  // Skelet haqiqiy tartibni takrorlaydi: sarlavha, tab qatori, guruh bandi
  if (isLoading) {
    return (
      <>
        <PageHeader
          title={t.settingsPage.title}
          description={t.settingsPage.subtitle}
          tabs={<Skeleton className="h-9 w-full max-w-lg rounded-[var(--r-field)]" />}
        />
        <div className="pane grid gap-3 rounded-[var(--r-pane)] p-5 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-[var(--r-field)]" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.settingsPage.title}
        description={t.settingsPage.subtitle}
        tabs={
          <Tabs
            active={tab}
            onChange={setTab}
            items={[
              ...groups.map((group) => ({
                key: group.key,
                label: groupTitle(group.key),
                icon: group.icon,
                badge: group.rows.filter((row) => changedKeys.includes(row.key)).length || undefined,
              })),
              { key: "profile", label: t.common.profile, icon: <UserIcon className="size-3.5" /> },
            ]}
          />
        }
      />

      {tab === "profile" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader title={t.common.profile} description="O'z hisobingiz ma'lumotlari" />
              <CardBody className="flex flex-col gap-4">
                <Field label={t.users.fullName}>
                  <Input
                    value={profile.full_name}
                    onChange={(event) => setProfile({ ...profile, full_name: event.target.value })}
                  />
                </Field>
                <Field label={t.users.email}>
                  <Input value={profile.email} disabled />
                </Field>
                <Field label="Bio">
                  <Textarea
                    rows={3}
                    value={profile.bio}
                    onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                  />
                </Field>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    icon={<Save className="size-4" />}
                    loading={profileMutation.isPending}
                    onClick={() =>
                      profileMutation.mutate({
                        full_name: profile.full_name,
                        email: profile.email,
                        bio: profile.bio,
                      })
                    }
                  >
                    {t.common.save}
                  </Button>
                </div>
              </CardBody>
            </Card>

            <TwoFactorPanel />

            <Card>
              <CardHeader title={t.auth.password} description="Parolni o'zgartirish" />
              <CardBody className="flex flex-col gap-4">
                <Field label="Joriy parol" required>
                  <Input
                    type="password"
                    value={passwords.current_password}
                    onChange={(event) =>
                      setPasswords({ ...passwords, current_password: event.target.value })
                    }
                  />
                </Field>
                <Field label={t.users.newPassword} required hint={t.validation.passwordShort}>
                  <Input
                    type="password"
                    value={passwords.new_password}
                    onChange={(event) =>
                      setPasswords({ ...passwords, new_password: event.target.value })
                    }
                  />
                </Field>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!passwords.current_password || !passwords.new_password}
                    onClick={async () => {
                      try {
                        await api.post("/auth/change-password/", passwords);
                        toast.success("Parol yangilandi");
                        setPasswords({ current_password: "", new_password: "" });
                      } catch (error) {
                        toast.error(
                          error instanceof ApiError ? error.message : "Xatolik yuz berdi",
                        );
                      }
                    }}
                  >
                    {t.common.save}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader title="Hisob" />
            <CardBody className="flex flex-col items-center gap-3 text-center">
              <Avatar src={user?.avatar_url} name={user?.full_name || user?.username} size="lg" rank={user?.rank} />
              <div>
                <p className="text-[15px] font-semibold text-[var(--ink)]">{user?.username}</p>
                <p className="t-meta text-[var(--ink-3)]">{user?.email}</p>
              </div>
              {user ? <RoleBadge value={user.role} locale={locale} /> : null}
              <div className="mt-2 w-full space-y-1.5 border-t border-[var(--edge)] pt-3 text-left text-[12.5px]">
                <p className="flex justify-between gap-3">
                  <span className="text-[var(--ink-3)]">{t.users.rating}</span>
                  <span className="t-num font-medium text-[var(--ink)]">{user?.rating}</span>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-[var(--ink-3)]">{t.users.points}</span>
                  <span className="t-num font-medium text-[var(--ink)]">{user?.total_points}</span>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-[var(--ink-3)]">{t.users.registered}</span>
                  <span className="t-num font-medium text-[var(--ink)]">
                    {formatDate(user?.created_at, false)}
                  </span>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        groups
          .filter((group) => group.key === tab)
          /* Guruh — bitta oq karta; har bir parametr uning ichida botiq katak */
          .map((group) => (
            <section key={group.key} className="pane enter rounded-[var(--r-pane)] p-5">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="t-section text-[var(--ink)]">{groupTitle(group.key)}</h2>
                  <p className="t-meta mt-1 text-[var(--ink-3)]">
                    <span className="t-num">{group.rows.length}</span> ta parametr
                  </p>
                </div>
              </div>

              {group.key === "judge" ? (
                <Alert tone="info" className="mb-4">
                  Judge0 ni to&apos;liq sozlash, ulanishni sinash va tillar ro&apos;yxatini
                  ko&apos;rish uchun{" "}
                  <Link
                    href="/admin/judge0"
                    className="focus-ring rounded-[6px] font-medium text-[var(--brand)] hover:underline"
                  >
                    Judge0 sahifasi
                  </Link>
                  ga o&apos;ting.
                </Alert>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {group.rows.map((row) => {
                  const dirty = changedKeys.includes(row.key);
                  return (
                    <div
                      key={row.key}
                      className={[
                        "relative flex flex-col justify-between rounded-[var(--r-field)] border border-[var(--edge)] p-4",
                        // O'zgargan parametr chap qirrada brend chizig'ini oladi
                        dirty ? "edge-brand" : "",
                        row.key === "rank_thresholds" ? "md:col-span-2" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {renderControl(row)}
                      <p className="mt-3 font-mono text-[10.5px] text-[var(--ink-4)]">
                        {row.key}
                        {row.updated_by_username ? ` · ${row.updated_by_username}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
      )}

      {/* Yopishqoq saqlash paneli — faqat saqlanmagan o'zgarish bo'lganda chiqadi */}
      {tab !== "profile" && changedKeys.length ? (
        <div className="pane-solid enter-pop sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3 shadow-[var(--lift-3)]">
          <p className="t-meta text-[var(--ink-2)]">
            <span className="t-num font-semibold text-[var(--ink)]">{changedKeys.length}</span> ta
            parametr saqlanmagan
          </p>
          <Button
            size="sm"
            icon={<Save className="size-4" />}
            loading={saveMutation.isPending}
            onClick={() => {
              const payload: Record<string, unknown> = {};
              changedKeys.forEach((key) => (payload[key] = values[key]));
              saveMutation.mutate(payload);
            }}
          >
            {t.common.save}
            {changedKeys.length ? ` (${changedKeys.length})` : ""}
          </Button>
        </div>
      ) : null}
    </>
  );
}

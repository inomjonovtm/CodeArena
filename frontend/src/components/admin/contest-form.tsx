"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/providers";
import { Alert, Chip } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Tabs } from "@/components/ui/misc";
import { RichEditor } from "@/components/ui/rich-editor";
import { api } from "@/lib/api";
import type { ContestProblemRow, ContestDetail, Paginated, ProblemListItem } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

export interface ContestFormValue {
  title_uz: string;
  slug: string;
  description_uz: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: ContestDetail["status"];
  visibility: "public" | "private";
  access_password: string;
  is_rated: boolean;
  is_virtual_allowed: boolean;
  max_participants: number | null;
  rating_k_new: number;
  rating_k_experienced: number;
  contest_problems: ContestProblemRow[];
}

function toLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function defaultContest(): ContestFormValue {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  start.setHours(15, 0, 0, 0);
  const end = new Date(start.getTime() + 120 * 60_000);
  return {
    title_uz: "",
    slug: "",
    description_uz: "",
    start_time: toLocalInput(start.toISOString()),
    end_time: toLocalInput(end.toISOString()),
    duration_minutes: 120,
    status: "draft",
    visibility: "public",
    access_password: "",
    is_rated: true,
    is_virtual_allowed: true,
    max_participants: null,
    rating_k_new: 40,
    rating_k_experienced: 20,
    contest_problems: [],
  };
}

export function contestFromDetail(detail: ContestDetail): ContestFormValue {
  return {
    title_uz: detail.title_uz,
    slug: detail.slug,
    description_uz: detail.description_uz,
    start_time: toLocalInput(detail.start_time),
    end_time: toLocalInput(detail.end_time),
    duration_minutes: detail.duration_minutes,
    status: detail.status,
    visibility: detail.visibility,
    access_password: detail.access_password,
    is_rated: detail.is_rated,
    is_virtual_allowed: detail.is_virtual_allowed,
    max_participants: detail.max_participants,
    rating_k_new: detail.rating_k_new,
    rating_k_experienced: detail.rating_k_experienced,
    contest_problems: detail.contest_problems ?? [],
  };
}

/** Formani API kutadigan ko'rinishga o'tkazadi (mahalliy vaqt → ISO). */
export function contestToPayload(value: ContestFormValue) {
  return {
    ...value,
    start_time: value.start_time ? new Date(value.start_time).toISOString() : null,
    end_time: value.end_time ? new Date(value.end_time).toISOString() : null,
    max_participants: value.max_participants || null,
  };
}

export function ContestForm({
  value,
  onChange,
}: {
  value: ContestFormValue;
  onChange: (next: ContestFormValue) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState("general");
  const [slugTouched, setSlugTouched] = useState(Boolean(value.slug));

  // Musobaqaga faqat «faqat musobaqa uchun» masalalar qo'shiladi: ommaviy
  // masalani qo'shsak, ishtirokchilar uni oldindan yechib olishlari mumkin.
  // Backend ham buni rad etadi (`validate_contest_problem`).
  const { data: problems } = useQuery({
    queryKey: ["problems", "contest-picker"],
    queryFn: () =>
      api.get<Paginated<ProblemListItem>>("/admin/problems/", {
        page_size: 300,
        ordering: "title_uz",
        is_contest_only: true,
      }),
  });

  const set = <K extends keyof ContestFormValue>(key: K, next: ContestFormValue[K]) =>
    onChange({ ...value, [key]: next });

  useEffect(() => {
    if (slugTouched) return;
    if (value.title_uz) onChange({ ...value, slug: slugify(value.title_uz) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.title_uz, slugTouched]);

  // Boshlanish/tugash vaqtidan davomiylikni hisoblash
  useEffect(() => {
    if (!value.start_time || !value.end_time) return;
    const minutes = Math.round(
      (new Date(value.end_time).getTime() - new Date(value.start_time).getTime()) / 60_000,
    );
    if (minutes > 0 && minutes !== value.duration_minutes) {
      onChange({ ...value, duration_minutes: minutes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.start_time, value.end_time]);

  const addProblem = () => {
    const index = value.contest_problems.length;
    onChange({
      ...value,
      contest_problems: [
        ...value.contest_problems,
        {
          problem: "",
          order: index,
          label: String.fromCharCode(65 + index),
          points: (index + 1) * 100,
        },
      ],
    });
  };

  const updateProblem = (index: number, patch: Partial<ContestProblemRow>) =>
    onChange({
      ...value,
      contest_problems: value.contest_problems.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });

  const moveProblem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.contest_problems.length) return;
    const rows = [...value.contest_problems];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    onChange({
      ...value,
      contest_problems: rows.map((row, i) => ({
        ...row,
        order: i,
        label: String.fromCharCode(65 + i),
      })),
    });
  };

  const removeProblem = (index: number) =>
    onChange({
      ...value,
      contest_problems: value.contest_problems
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, order: i, label: String.fromCharCode(65 + i) })),
    });

  // Tekshiruv ro'yxati — yon ustunda va yopishqoq panelda bir manbadan
  const checklist = [
    { ok: Boolean(value.title_uz.trim()), label: "Sarlavha" },
    { ok: Boolean(value.start_time && value.end_time), label: "Vaqt oralig'i" },
    { ok: value.duration_minutes > 0, label: "Davomiylik" },
    { ok: value.contest_problems.length > 0, label: "Masalalar" },
    {
      ok: value.contest_problems.every((row) => row.problem),
      label: "Barcha masalalar tanlangan",
    },
    {
      ok: value.visibility === "public" || Boolean(value.access_password),
      label: "Kirish paroli",
    },
  ];
  const missing = checklist.filter((item) => !item.ok).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Tabs
            active={tab}
            onChange={setTab}
            items={[
              { key: "general", label: t.common.general },
              { key: "problems", label: t.contests.problems, badge: value.contest_problems.length },
              { key: "rating", label: t.users.rating },
            ]}
          />

          {tab === "general" ? (
            <Card>
              <CardHeader
                title={t.common.general}
                description="Sarlavha, tavsif va vaqt oralig'i"
              />
              <CardBody className="flex flex-col gap-5">
                <Field label={t.problems.titleUz} required>
                  <Input
                    value={value.title_uz}
                    onChange={(event) => set("title_uz", event.target.value)}
                    placeholder="CodeArena Haftalik Raund #13"
                  />
                </Field>

                <Field label={t.problems.slug}>
                  <Input
                    value={value.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      set("slug", event.target.value);
                    }}
                    className="font-mono"
                  />
                </Field>

                <Field label={t.problems.description}>
                  <RichEditor
                    value={value.description_uz}
                    onChange={(next) => set("description_uz", next)}
                    minRows={6}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t.contests.startTime} required>
                    <Input
                      type="datetime-local"
                      value={value.start_time}
                      onChange={(event) => set("start_time", event.target.value)}
                    />
                  </Field>
                  <Field label={t.contests.endTime} required>
                    <Input
                      type="datetime-local"
                      value={value.end_time}
                      onChange={(event) => set("end_time", event.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t.contests.duration} hint="Vaqtlardan avtomatik hisoblanadi">
                    <Input
                      type="number"
                      value={value.duration_minutes}
                      onChange={(event) => set("duration_minutes", Number(event.target.value))}
                    />
                  </Field>
                  <Field label={t.contests.maxParticipants} hint="Bo'sh = cheklovsiz">
                    <Input
                      type="number"
                      value={value.max_participants ?? ""}
                      onChange={(event) =>
                        set("max_participants", event.target.value ? Number(event.target.value) : null)
                      }
                    />
                  </Field>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {tab === "problems" ? (
            <div className="flex flex-col gap-4">
              <Alert tone="info">
                Ro&apos;yxatda faqat <b>«faqat musobaqa uchun»</b> deb belgilangan masalalar
                ko&apos;rinadi. Kerakli masala yo&apos;q bo&apos;lsa, uni masalalar bo&apos;limida
                shu bayroq bilan belgilang.
              </Alert>

              <Card>
                <CardHeader
                  title={t.contests.problems}
                  description={`${value.contest_problems.length} ta masala`}
                  action={
                    <Button size="sm" icon={<Plus className="size-3.5" />} onClick={addProblem}>
                      {t.contests.addProblem}
                    </Button>
                  }
                />

                {value.contest_problems.length === 0 ? (
                  <EmptyState
                    title="Masala qo'shilmagan"
                    description="Contestga kamida bitta masala qo'shing."
                    action={
                      <Button size="sm" icon={<Plus className="size-4" />} onClick={addProblem}>
                        {t.contests.addProblem}
                      </Button>
                    }
                  />
                ) : (
                  // Takrorlanuvchi qatorlar — har biri alohida karta emas, chiziq bilan ajraladi
                  <div className="divide-y divide-[var(--edge-soft)]">
                    {value.contest_problems.map((row, index) => (
                      <div key={index} className="flex flex-wrap items-end gap-3 px-5 py-4">
                        <div className="w-14">
                          <Field label={t.contests.label}>
                            <Input
                              value={row.label}
                              onChange={(event) => updateProblem(index, { label: event.target.value })}
                              className="text-center font-mono"
                            />
                          </Field>
                        </div>
                        <div className="min-w-[14rem] flex-1">
                          <Field label={t.submissions.problem}>
                            <Select
                              value={row.problem}
                              onChange={(event) => updateProblem(index, { problem: event.target.value })}
                              placeholder="— tanlang —"
                              options={(problems?.results ?? []).map((problem) => ({
                                value: problem.id,
                                label: `${problem.title_uz} (${problem.difficulty})`,
                              }))}
                            />
                          </Field>
                        </div>
                        <div className="w-24">
                          <Field label={t.contests.score}>
                            <Input
                              type="number"
                              value={row.points}
                              onChange={(event) =>
                                updateProblem(index, { points: Number(event.target.value) })
                              }
                            />
                          </Field>
                        </div>
                        <div className="flex gap-0.5 pb-0.5">
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={() => moveProblem(index, -1)}
                            disabled={index === 0}
                            aria-label="Yuqoriga"
                          >
                            <ChevronUp className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={() => moveProblem(index, 1)}
                            disabled={index === value.contest_problems.length - 1}
                            aria-label="Pastga"
                          >
                            <ChevronDown className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            className="text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
                            onClick={() => removeProblem(index)}
                            aria-label={t.common.delete}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <p className="t-meta text-[var(--ink-4)]">
                Qo&apos;shilgan masalalar avtomatik &laquo;faqat contest uchun&raquo; deb belgilanadi —
                contest tugagunga qadar ommaviy ro&apos;yxatda ko&apos;rinmaydi (11-bo&apos;lim).
              </p>
            </div>
          ) : null}

          {tab === "rating" ? (
            <Card>
              <CardHeader
                title={t.users.rating}
                description="7-bo'lim: Elo asosidagi reyting (Codeforces uslubi)"
              />
              <CardBody className="flex flex-col gap-5">
                <Switch
                  checked={value.is_rated}
                  onChange={(next) => set("is_rated", next)}
                  label={t.contests.isRated}
                  description="Contest tugagach ishtirokchilar reytingi o'zgaradi"
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label={t.contests.kFactorNew}
                    hint="6 tadan kam contest o'ynaganlar uchun (odatda 40)"
                  >
                    <Input
                      type="number"
                      disabled={!value.is_rated}
                      value={value.rating_k_new}
                      onChange={(event) => set("rating_k_new", Number(event.target.value))}
                    />
                  </Field>
                  <Field
                    label={t.contests.kFactorExperienced}
                    hint="20+ contest o'ynaganlar uchun (odatda 20)"
                  >
                    <Input
                      type="number"
                      disabled={!value.is_rated}
                      value={value.rating_k_experienced}
                      onChange={(event) => set("rating_k_experienced", Number(event.target.value))}
                    />
                  </Field>
                </div>
                <Switch
                  checked={value.is_virtual_allowed}
                  onChange={(next) => set("is_virtual_allowed", next)}
                  label={t.contests.isVirtualAllowed}
                  description="Contest tugagach virtual rejimda yechish mumkin (reytingga ta'sir qilmaydi)"
                />
              </CardBody>
            </Card>
          ) : null}
        </div>

        {/* Yon ustun — bog'liq bloklar bitta kartada guruhlanadi */}
        <div className="pane flex flex-col gap-4 rounded-[var(--r-pane-lg)] p-4 sm:p-5">
          <Card>
            <CardHeader title="Nashr" description="Holat va kirish huquqi" />
            <CardBody className="flex flex-col gap-5">
              <Field label={t.common.status}>
                <Select
                  value={value.status}
                  onChange={(event) =>
                    set("status", event.target.value as ContestFormValue["status"])
                  }
                  options={[
                    { value: "draft", label: t.problems.draft },
                    { value: "scheduled", label: t.contests.scheduled },
                    { value: "running", label: t.contests.running },
                    { value: "finished", label: t.contests.finished },
                    { value: "cancelled", label: t.contests.cancelled },
                  ]}
                />
              </Field>
              <Field label={t.contests.visibility}>
                <Select
                  value={value.visibility}
                  onChange={(event) =>
                    set("visibility", event.target.value as "public" | "private")
                  }
                  options={[
                    { value: "public", label: t.contests.public },
                    { value: "private", label: t.contests.private },
                  ]}
                />
              </Field>
              {value.visibility === "private" ? (
                <Field label={t.contests.accessPassword} required>
                  <Input
                    value={value.access_password}
                    onChange={(event) => set("access_password", event.target.value)}
                    className="font-mono"
                  />
                </Field>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tekshiruv ro'yxati" description="Chop etishdan oldin tekshiring" />
            <CardBody className="flex flex-col gap-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[13px]">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      item.ok
                        ? "bg-[var(--ok-wash)] text-[var(--ok)]"
                        : "bg-[var(--pane-sunken)] text-[var(--ink-4)]",
                    )}
                  >
                    {item.ok ? "✓" : "—"}
                  </span>
                  <span className={item.ok ? "text-[var(--ink)]" : "text-[var(--ink-4)]"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Yopishqoq holat paneli */}
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-[var(--r-pane)] pane-solid px-4 py-3 shadow-[var(--lift-3)]">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          {missing > 0 ? (
            <Chip tone="warn" dot>
              {missing} ta yetishmayapti
            </Chip>
          ) : (
            <Chip tone="ok" dot>
              Tayyor
            </Chip>
          )}
          <span className="t-meta t-num text-[var(--ink-3)]">
            {value.contest_problems.length} ta masala
          </span>
        </div>
      </div>
    </div>
  );
}

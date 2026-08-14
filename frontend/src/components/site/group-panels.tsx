"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flame,
  Plus,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Alert,
  Button,
  Chip,
  Empty,
  Field,
  Input,
  Meter,
  Pane,
  Stat,
  TextLines,
  Textarea,
} from "@/components/kit";
import { useConfirm, useToast } from "@/components/providers";
import { Avatar } from "@/components/ui/misc";
import { publicApi } from "@/lib/public-api";
import type { GroupStats } from "@/lib/types";
import { formatDate, formatRelative } from "@/lib/utils";

/* ==========================================================================
   Guruh panellari — statistika, faollik, so'rovlar va vazifalar
   --------------------------------------------------------------------------
   Guruh ilgari faqat ro'yxat edi: ochasiz, ismlarni ko'rasiz va yopasiz.
   Qaytib kelish uchun sabab yo'q edi. Bu panellar aynan shu sababni
   beradi — guruhda nima bo'layotgani va menda qanday vazifa borligi.
   ========================================================================== */

/** Guruh ko'rsatkichlari — serverdan, mijozda yig'ilmaydi. */
export function GroupStatsRow({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["group-stats", slug],
    queryFn: () => publicApi.groups.stats(slug),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  const stats: Partial<GroupStats> = data ?? {};

  return (
    <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="A'zolar"
        value={stats.members ?? "—"}
        sub={stats.max_members ? `maksimum ${stats.max_members}` : undefined}
      />
      <Stat
        label="Bu hafta yechildi"
        value={stats.solved_this_week ?? "—"}
        sub={stats.active_this_week ? `${stats.active_this_week} ta a'zo faol` : "hali faollik yo'q"}
      />
      <Stat label="O'rtacha reyting" value={stats.avg_rating ?? "—"} />
      <Stat
        label="Eng uzun seriya"
        value={stats.top_streak ?? "—"}
        sub={stats.top_streak ? "kun ketma-ket" : undefined}
      />
    </div>
  );
}

/** Faollik tasmasi — kim qo'shildi, kim nima yechdi. */
export function GroupActivityPanel({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["group-activity", slug],
    queryFn: () => publicApi.groups.activity(slug),
    enabled: Boolean(slug),
  });

  if (isLoading) return <TextLines lines={6} className="p-4" />;
  if (!data?.length) {
    return (
      <Empty
        compact
        icon={<Flame className="size-6" />}
        title="Hali harakat yo'q"
        description="A'zolar masala yecha boshlaganda shu yerda ko'rinadi."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--line-soft)]">
      {data.map((row) => (
        <li key={row.id} className="flex items-center gap-3 px-4 py-3">
          <Avatar src={row.avatar_url} name={row.username ?? "?"} size="xs" />
          <div className="min-w-0 flex-1">
            <p className="ts-sm truncate text-[var(--text-2)]">
              {row.username ? (
                <Link href={`/u/${row.username}`} className="font-medium hover:underline">
                  @{row.username}
                </Link>
              ) : (
                "Kimdir"
              )}{" "}
              {row.kind === "solved" ? "yechdi:" : ""}{" "}
              {row.url ? (
                <Link href={row.url} className="text-[var(--green-text)] hover:underline">
                  {row.text}
                </Link>
              ) : (
                <span className="text-[var(--text-3)]">{row.text || row.kind_label}</span>
              )}
            </p>
          </div>
          <span className="ts-xs shrink-0 text-[var(--text-4)]">
            {formatRelative(row.created_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Qo'shilish so'rovlari — faqat egasi va moderatorlarga. */
export function GroupRequestsPanel({ slug }: { slug: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["group-requests", slug],
    queryFn: () => publicApi.groups.requests(slug),
    enabled: Boolean(slug),
  });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approve" | "reject" }) =>
      publicApi.groups.decideRequest(slug, id, decision),
    onSuccess: async (_result, variables) => {
      toast.success(variables.decision === "approve" ? "Qabul qilindi" : "Rad etildi");
      await queryClient.invalidateQueries({ queryKey: ["group-requests", slug] });
      await queryClient.invalidateQueries({ queryKey: ["group", slug] });
      await queryClient.invalidateQueries({ queryKey: ["group-leaderboard", slug] });
    },
  });

  if (isLoading) return <TextLines lines={3} className="p-4" />;
  if (!data?.length) {
    return (
      <Empty
        compact
        icon={<UserCheck className="size-6" />}
        title="So'rov yo'q"
        description="Yangi so'rovlar shu yerda ko'rinadi."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--line-soft)]">
      {data.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Avatar src={row.avatar_url} name={row.full_name || row.username} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="ts-sm font-medium text-[var(--text)]">
              {row.full_name || row.username}
            </p>
            <p className="ts-xs truncate text-[var(--text-4)]">
              @{row.username}
              {row.message ? ` · ${row.message}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="quiet"
              icon={<X className="size-3.5" />}
              onClick={() => decide.mutate({ id: row.id, decision: "reject" })}
            >
              Rad etish
            </Button>
            <Button
              size="sm"
              icon={<UserPlus className="size-3.5" />}
              onClick={() => decide.mutate({ id: row.id, decision: "approve" })}
            >
              Qabul qilish
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- vazifalar */

export function GroupAssignmentsPanel({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due: "", slugs: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["group-assignments", slug],
    queryFn: () => publicApi.groups.assignments(slug),
    enabled: Boolean(slug),
  });

  const create = useMutation({
    mutationFn: () =>
      publicApi.groups.createAssignment(slug, {
        title: form.title.trim(),
        description: form.description.trim(),
        due_at: form.due ? new Date(form.due).toISOString() : null,
        problem_slugs: form.slugs
          .split(/[\s,]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    onSuccess: async () => {
      toast.success("Vazifa qo'shildi");
      setCreating(false);
      setForm({ title: "", description: "", due: "", slugs: "" });
      await queryClient.invalidateQueries({ queryKey: ["group-assignments", slug] });
    },
    onError: () => toast.error("Vazifani saqlab bo'lmadi"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => publicApi.groups.removeAssignment(slug, id),
    onSuccess: async () => {
      toast.success("Vazifa o'chirildi");
      await queryClient.invalidateQueries({ queryKey: ["group-assignments", slug] });
    },
  });

  if (isLoading) return <TextLines lines={4} className="p-4" />;

  return (
    <div className="flex flex-col gap-4 p-4">
      {canManage ? (
        creating ? (
          <Pane inset="md">
            <div className="flex flex-col gap-3">
              <Field label="Sarlavha" required>
                <Input
                  autoFocus
                  maxLength={120}
                  placeholder="Masalan: 1-hafta — massivlar"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </Field>
              <Field label="Izoh">
                <Textarea
                  rows={2}
                  maxLength={1000}
                  placeholder="A'zolarga qisqacha ko'rsatma..."
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </Field>
              <Field
                label="Masalalar"
                hint="Masala manzilidagi nom (slug), vergul yoki bo'sh joy bilan ajrating"
                required
              >
                <Textarea
                  rows={2}
                  placeholder="ikki-sonning-yigindisi, palindrom-son"
                  value={form.slugs}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, slugs: event.target.value }))
                  }
                />
              </Field>
              <Field label="Muddat" hint="Ixtiyoriy">
                <Input
                  type="datetime-local"
                  value={form.due}
                  onChange={(event) => setForm((prev) => ({ ...prev, due: event.target.value }))}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="quiet" onClick={() => setCreating(false)}>
                  Bekor qilish
                </Button>
                <Button
                  disabled={!form.title.trim() || !form.slugs.trim() || create.isPending}
                  onClick={() => create.mutate()}
                >
                  Saqlash
                </Button>
              </div>
            </div>
          </Pane>
        ) : (
          <Button
            variant="quiet"
            icon={<Plus className="size-4" />}
            onClick={() => setCreating(true)}
          >
            Yangi vazifa
          </Button>
        )
      ) : null}

      {!data?.length ? (
        <Empty
          compact
          icon={<ClipboardList className="size-6" />}
          title="Vazifa yo'q"
          description={
            canManage
              ? "Masalalar to'plamini muddat bilan bering — kim bajarganini shu yerda ko'rasiz."
              : "Guruh egasi vazifa berganda shu yerda ko'rinadi."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((row) => (
            <li key={row.id}>
              <div className="card p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text)]">{row.title}</p>
                    {row.description ? (
                      <p className="ts-sm mt-1 text-[var(--text-3)]">{row.description}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Chip>{row.problem_count} ta masala</Chip>
                      {row.due_at ? (
                        <span
                          className={`ts-xs flex items-center gap-1.5 ${
                            row.is_overdue ? "text-[var(--text-4)]" : "text-[var(--text-3)]"
                          }`}
                        >
                          <CalendarClock className="size-3.5" />
                          {row.is_overdue ? "muddati tugagan · " : "muddat: "}
                          {formatDate(row.due_at)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="quiet"
                      onClick={() => setOpenId(openId === row.id ? null : row.id)}
                    >
                      {openId === row.id ? "Yopish" : "Ochish"}
                    </Button>
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Vazifani o'chirish"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Vazifa o'chirilsinmi?",
                            message: `«${row.title}» guruhdan olib tashlanadi.`,
                            confirmLabel: "O'chirish",
                            danger: true,
                          });
                          if (ok) remove.mutate(row.id);
                        }}
                      />
                    ) : null}
                  </div>
                </div>

                {openId === row.id ? <AssignmentDetail slug={slug} id={row.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssignmentDetail({ slug, id }: { slug: string; id: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["group-assignment", slug, id],
    queryFn: () => publicApi.groups.assignment(slug, id),
  });

  if (isLoading) return <TextLines lines={4} className="mt-4" />;
  if (isError || !data) {
    return (
      <Alert tone="bad" className="mt-4" title="Vazifani yuklab bo'lmadi">
        Qayta urinib ko&apos;ring.
      </Alert>
    );
  }

  return (
    <div className="mt-4 grid gap-5 border-t border-[var(--line-soft)] pt-4 lg:grid-cols-2">
      <div>
        <p className="ts-label mb-2">Masalalar</p>
        <ul className="flex flex-col gap-1.5">
          {data.problems.map((problem) => (
            <li key={problem.slug} className="flex items-center gap-2">
              <CheckCircle2
                className={`size-4 shrink-0 ${
                  problem.solved ? "text-[var(--green)]" : "text-[var(--line-strong)]"
                }`}
              />
              <Link
                href={`/problems/${problem.slug}`}
                className="ts-sm min-w-0 flex-1 truncate text-[var(--text-2)] hover:text-[var(--green-text)]"
              >
                {problem.title}
              </Link>
              {problem.rating ? (
                <span className="ts-num ts-xs text-[var(--text-4)]">{problem.rating}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="ts-label mb-2">Bajarilishi</p>
        <ul className="flex flex-col gap-2">
          {data.progress.map((row) => (
            <li key={row.username} className="flex items-center gap-3">
              <Avatar src={row.avatar_url} name={row.full_name || row.username} size="xs" />
              <span className="ts-sm min-w-0 flex-1 truncate text-[var(--text-2)]">
                @{row.username}
              </span>
              <span className="ts-num ts-xs shrink-0 text-[var(--text-4)]">
                {row.solved}/{row.total}
              </span>
              <div className="w-24 shrink-0">
                <Meter value={row.percent} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

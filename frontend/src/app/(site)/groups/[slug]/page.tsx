"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Check,
  Copy,
  ClipboardList,
  Crown,
  Flame,
  Lock,
  LogOut,
  UserCheck,
  RefreshCw,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alert,
  Block,
  Breadcrumb,
  Button,
  Chip,
  Empty,
  LinkButton,
  Pane,
  Segmented,
  Stat,
} from "@/components/kit";
import { useAuth, useConfirm, useToast } from "@/components/providers";
import { ApiError } from "@/lib/api";
import {
  GroupActivityPanel,
  GroupAssignmentsPanel,
  GroupRequestsPanel,
  GroupStatsRow,
} from "@/components/site/group-panels";
import { publicApi } from "@/lib/public-api";
import type { GroupMemberRow, GroupPeriod } from "@/lib/types";
import { cn, formatDate, formatNumber, initials } from "@/lib/utils";

/** Rol → yorliq va ohang. Rang yagona signal emas: yonida matn ham turadi. */
const ROLE: Record<GroupMemberRow["role"], { label: string; tone: "brand" | "note" | "neutral" }> = {
  owner: { label: "Egasi", tone: "brand" },
  moderator: { label: "Moderator", tone: "note" },
  member: { label: "A'zo", tone: "neutral" },
};

/** Ro'yxatda egasi tepada, keyin moderatorlar, so'ng a'zolar. */
const ROLE_WEIGHT: Record<GroupMemberRow["role"], number> = {
  owner: 0,
  moderator: 1,
  member: 2,
};

/** Guruh belgisi — kvadratsimon avatar, rasm bo'lmasa bosh harflar. */
function GroupMark({
  src,
  name,
  size = 56,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)]",
        "bg-[var(--green-wash)] font-semibold text-[var(--green-text)]",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** A'zo avatari — dumaloq, rasm bo'lmasa bosh harflar. */
function MemberMark({ src, name }: { src?: string | null; name: string }) {
  return (
    <span
      className={cn(
        "flex size-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full",
        "border border-[var(--line)] bg-[var(--surface-sunk)] text-[12px] font-semibold text-[var(--text-3)]",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** Taklif kodini nusxalash — qisqa "nusxalandi" holati bilan. */
function CopyCodeButton({
  value,
  variant = "primary",
}: {
  value: string;
  /** Sahifada bitta primary tugma bo'lsin — takroriy joyda `quiet` beriladi. */
  variant?: "primary" | "quiet";
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant={variant}
      size="sm"
      icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Nusxalab bo'lmadi");
        }
      }}
    >
      {copied ? "Nusxalandi" : "Kodni nusxalash"}
    </Button>
  );
}

/** Qatorlarda takrorlanadigan "a'zoni chiqarish" tugmasi (faqat egasi ko'radi). */
function RemoveMemberButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      aria-label="A'zoni chiqarish"
      onClick={onRemove}
      className={cn(
        "ring-focus flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
        "text-[var(--text-4)] opacity-0 transition-opacity duration-[var(--dur-1)]",
        "group-hover:opacity-100 focus-visible:opacity-100",
        "hover:bg-[var(--danger-wash)] hover:text-[var(--danger)]",
      )}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

type Tab = "rank" | "members" | "assignments" | "activity" | "requests";

export default function GroupDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("rank");
  /* Ichki reyting davri. Sukut bo'yicha «guruhda» — a'zo QO'SHILGANDAN
     beri to'plangan ball. Ilgari faqat umrbod ball bo'yicha saralanardi:
     eski hisob bilan kirgan odam avtomatik birinchi bo'lardi va yangi
     a'zoning uni quvib yetishi imkonsiz edi. */
  const [period, setPeriod] = useState<GroupPeriod>("group");

  const { data: group, isLoading, isError } = useQuery({
    queryKey: ["group", slug],
    queryFn: () => publicApi.groups.retrieve(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ["group-leaderboard", slug, period],
    queryFn: () => publicApi.groups.leaderboard(slug, period),
    enabled: Boolean(slug && group),
  });

  /* Rol SERVERDAN keladi — ilgari u username satrini solishtirish orqali
     taxmin qilinardi va moderator umuman hisobga olinmasdi. */
  const myRole = group?.my_role ?? null;
  const isOwner = myRole === "owner";
  const canManage = myRole === "owner" || myRole === "moderator";

  const leaveMutation = useMutation({
    mutationFn: () => publicApi.groups.leave(slug),
    onSuccess: () => {
      toast.success("Guruhdan chiqdingiz");
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.replace("/groups");
    },
    onError: (error) =>
      toast.error(
        "Bajarilmadi",
        error instanceof ApiError ? error.message : "Keyinroq urinib ko'ring.",
      ),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => publicApi.groups.regenerateCode(slug),
    onSuccess: (data) => {
      toast.success("Yangi taklif kodi", data.invite_code);
      void queryClient.invalidateQueries({ queryKey: ["group", slug] });
    },
    onError: () => toast.error("Kodni yangilab bo'lmadi"),
  });

  /* Chiqarish, chiqish va o'chirish — QAYTARIB BO'LMAYDIGAN amallar.
     Ilgari ular bitta bosishda, savolsiz bajarilardi: tasodifan bosilgan
     «Guruhni o'chirish» butun guruhni yo'q qilardi. */
  const askRemove = async (row: GroupMemberRow) => {
    const ok = await confirm({
      title: `@${row.username} chiqarilsinmi?`,
      message: "A'zo guruhdan chiqariladi. Taklif kodi bilan qaytib kira oladi.",
      confirmLabel: "Chiqarish",
      danger: true,
    });
    if (ok) removeMemberMutation.mutate(row.id);
  };

  const setRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "moderator" | "member" }) =>
      publicApi.groups.setRole(slug, id, role),
    onSuccess: async () => {
      toast.success("Rol o'zgartirildi");
      await queryClient.invalidateQueries({ queryKey: ["group-leaderboard", slug] });
    },
    onError: () => toast.error("Rolni o'zgartirib bo'lmadi"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => publicApi.groups.removeMember(slug, memberId),
    onSuccess: () => {
      toast.success("A'zo chiqarildi");
      void queryClient.invalidateQueries({ queryKey: ["group-leaderboard", slug] });
      void queryClient.invalidateQueries({ queryKey: ["group", slug] });
    },
    onError: () => toast.error("A'zoni chiqarib bo'lmadi"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => publicApi.groups.remove(slug),
    onSuccess: () => {
      toast.success("Guruh o'chirildi");
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.replace("/groups");
    },
    onError: () => toast.error("Guruhni o'chirib bo'lmadi"),
  });

  if (isLoading) {
    // Skelet haqiqiy kartalar ketma-ketligini takrorlaydi
    return (
      <div className="flex flex-col gap-5">
        <Pane inset="lg">
          <Block className="h-3.5 w-40" />
          <Block className="mt-5 h-8 w-1/2" />
          <Block className="mt-4 h-3 w-2/3" />
        </Pane>
        <Pane inset="lg">
          <Block className="h-16" />
        </Pane>
        <Pane inset="sm">
          <Block className="h-9 w-56 rounded-[var(--radius-sm)]" />
        </Pane>
        <Pane inset="lg">
          <Block className="h-72" />
        </Pane>
      </div>
    );
  }

  if (isError || !group) {
    return (
      <Pane tone="solid" inset="none" className="overflow-hidden">
        <Empty
          icon={<Users className="size-5" />}
          title="Guruh topilmadi"
          description="Guruh o'chirilgan yoki siz uning a'zosi emassiz."
          action={<LinkButton href="/groups">Guruhlarga qaytish</LinkButton>}
        />
      </Pane>
    );
  }

  const rows = members ?? [];
  const totalPoints = rows.reduce((sum, row) => sum + row.total_points, 0);
  const totalSolved = rows.reduce((sum, row) => sum + row.problems_solved, 0);
  const memberCount = group.live_member_count || group.member_count;

  // "A'zolar" ko'rinishi — rol bo'yicha, keyin nom bo'yicha
  const directory = [...rows].sort(
    (a, b) =>
      ROLE_WEIGHT[a.role] - ROLE_WEIGHT[b.role] || a.username.localeCompare(b.username),
  );

  /** Ro'yxat holatlari ikkala tabda bir xil — har biri o'z kartasida. */
  const listState = membersLoading ? (
    <Pane inset="md">
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Block key={index} className="h-14 rounded-[var(--radius-sm)]" />
        ))}
      </div>
    </Pane>
  ) : membersError ? (
    <Alert
      tone="bad"
      title="Ro'yxatni yuklab bo'lmadi"
      action={
        <Button size="sm" icon={<RefreshCw className="size-4" />} onClick={() => void refetchMembers()}>
          Qayta urinish
        </Button>
      }
    >
      Ulanishni tekshirib, qayta urinib ko&apos;ring.
    </Alert>
  ) : rows.length === 0 ? (
    <Pane tone="solid" inset="none" className="overflow-hidden">
      <Empty
        compact
        icon={<Users className="size-5" />}
        title="A'zolar yo'q"
        description="Taklif kodini do'stlaringizga yuboring."
        action={<CopyCodeButton value={group.invite_code} variant="quiet" />}
      />
    </Pane>
  ) : null;

  return (
    /* Har bir mazmun bloki alohida kartada, orasi bir tekis 20px */
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------ identifikatsiya kartasi */}
      <Pane className="" inset="lg">
        <Breadcrumb
          items={[{ label: "Guruhlar", href: "/groups" }, { label: group.name }]}
          className="mb-5"
        />

        <div className="flex flex-wrap items-start gap-6">
          <GroupMark src={group.avatar_url} name={group.name} size={64} />

          <div className="min-w-0 flex-1">
            <h1 className="ts-h1 flex flex-wrap items-center gap-2 text-[var(--text)]">
              {group.name}
              {group.is_verified ? (
                <BadgeCheck className="size-5 shrink-0 text-[var(--green)]" />
              ) : null}
            </h1>

            {group.description ? (
              <p className="ts-body mt-2 max-w-2xl text-[var(--text-3)]">{group.description}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Chip
                tone={group.privacy === "private" ? "neutral" : "ok"}
                icon={group.privacy === "private" ? <Lock className="size-3" /> : undefined}
              >
                {group.privacy === "private"
                  ? "Yopiq guruh"
                  : group.privacy === "request"
                    ? "So'rov bilan"
                    : "Ochiq guruh"}
              </Chip>
              <span className="ts-sm text-[var(--text-4)]">
                Egasi: {group.owner_username ? `@${group.owner_username}` : "—"}
              </span>
              <span className="ts-sm text-[var(--text-4)]">
                {formatDate(group.created_at, false)} dan beri
              </span>
              <span className="ts-sm flex items-center gap-1.5 text-[var(--text-4)]">
                <Users className="size-3.5" />
                <span className="ts-num text-[var(--text-2)]">{memberCount}</span>/
                <span className="ts-num">{group.max_members}</span> a&apos;zo
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2.5 sm:items-end">
            {/* Taklif kodi — karta ichidagi botiq maydon */}
            <div className="well flex items-center gap-3 rounded-[var(--radius-sm)] px-3.5 py-2.5">
              <span className="ts-label">Taklif kodi</span>
              <span className="ts-num font-mono text-[16px] font-semibold tracking-[0.2em] text-[var(--green-text)]">
                {group.invite_code}
              </span>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <CopyCodeButton value={group.invite_code} />
              {isOwner ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RefreshCw className="size-4" />}
                  loading={regenerateMutation.isPending}
                  onClick={() => regenerateMutation.mutate()}
                >
                  Yangilash
                </Button>
              ) : null}
              {isOwner ? (
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="size-4" />}
                  loading={deleteMutation.isPending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Guruh o'chirilsinmi?",
                      message: `«${group.name}» va uning ichki reytingi o'chiriladi. Bu amalni qaytarib bo'lmaydi.`,
                      confirmLabel: "O'chirish",
                      danger: true,
                    });
                    if (ok) deleteMutation.mutate();
                  }}
                >
                  Guruhni o&apos;chirish
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<LogOut className="size-4" />}
                  loading={leaveMutation.isPending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Guruhdan chiqasizmi?",
                      message: "Ichki reytingdagi o'rningiz yo'qoladi. Taklif kodi bilan qayta kira olasiz.",
                      confirmLabel: "Chiqish",
                      danger: true,
                    });
                    if (ok) leaveMutation.mutate();
                  }}
                >
                  Guruhdan chiqish
                </Button>
              )}
            </div>
          </div>
        </div>
      </Pane>

      {/* Ko'rsatkichlar SERVERDAN: ilgari ular mijozda reyting jadvalidagi
          qatorlarni qo'shib chiqarilardi, ya'ni «guruh ballari» aslida
          a'zolarning umrbod ballari yig'indisi edi. */}
      <GroupStatsRow slug={slug} />

      {/* --------------------------------------------------- bo'limlar kartasi */}
      <Pane inset="sm">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="-mx-1 min-w-0 overflow-x-auto px-1 py-0.5">
            <Segmented
              value={tab}
              onChange={setTab}
              items={[
                {
                  value: "rank" as const,
                  label: "Ichki reyting",
                  icon: <Trophy className="size-4" />,
                  count: rows.length,
                },
                {
                  value: "members" as const,
                  label: "A'zolar",
                  icon: <Users className="size-4" />,
                  count: memberCount,
                },
                {
                  value: "assignments" as const,
                  label: "Vazifalar",
                  icon: <ClipboardList className="size-4" />,
                },
                {
                  value: "activity" as const,
                  label: "Faollik",
                  icon: <Flame className="size-4" />,
                },
                ...(canManage
                  ? [
                      {
                        value: "requests" as const,
                        label: "So'rovlar",
                        icon: <UserCheck className="size-4" />,
                        count: group.pending_requests || undefined,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
          {tab === "rank" ? (
            <Segmented
              value={period}
              onChange={setPeriod}
              items={[
                { value: "group" as const, label: "Guruhda" },
                { value: "week" as const, label: "Hafta" },
                { value: "month" as const, label: "Oy" },
                { value: "all" as const, label: "Umumiy" },
              ]}
            />
          ) : null}
          <p className="ts-sm text-[var(--text-4)]">
            {tab === "rank"
              ? "To'plangan ball bo'yicha saralangan."
              : "Rol, so'ng nom bo'yicha saralangan."}
          </p>
        </div>
      </Pane>

      <div>
        {tab === "rank" ? (
          listState ?? (
            <Pane inset="none" className="overflow-hidden">
              {/* Ustun sarlavhalari */}
              <div
                className={cn(
                  "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 sm:px-6",
                  "sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto_auto]",
                  "border-b border-[var(--line)]",
                )}
              >
                <span className="ts-label">#</span>
                <span className="ts-label">A&apos;zo</span>
                <span className="ts-label hidden text-right sm:block">Yechgan</span>
                <span className="ts-label hidden text-right sm:block">Reyting</span>
                <span className="ts-label text-right">Ball</span>
              </div>

              <ul className="divide-y divide-[var(--line-soft)]">
                {rows.map((row, index) => {
                  const isMe = user?.username === row.username;
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        "group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:px-6",
                        "sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto_auto]",
                        "transition-colors duration-[var(--dur-1)]",
                        isMe ? "bg-[var(--green-wash)]" : "hover:bg-[var(--surface-hover)]",
                      )}
                    >
                      <span className="ts-num text-[14px] font-semibold text-[var(--text-4)]">
                        {row.position ?? index + 1}
                      </span>

                      <div className="flex min-w-0 items-center gap-3">
                        <MemberMark src={row.avatar_url} name={row.full_name || row.username} />
                        <div className="min-w-0">
                          <Link
                            href={`/u/${row.username}`}
                            className={cn(
                              "ring-focus flex items-center gap-1.5 truncate rounded-[6px] text-[15px] font-medium",
                              "text-[var(--text)] transition-colors hover:text-[var(--green-text)]",
                            )}
                          >
                            {row.username}
                            {row.role === "owner" ? (
                              <Crown className="size-3.5 shrink-0 text-[var(--warn)]" />
                            ) : null}
                            {isMe ? (
                              <span className="text-[12px] font-semibold text-[var(--green)]">
                                siz
                              </span>
                            ) : null}
                          </Link>
                          {row.full_name ? (
                            <p className="ts-sm truncate text-[var(--text-4)]">{row.full_name}</p>
                          ) : null}
                        </div>

                        {/* Egasi a'zoni chiqarishi mumkin — qator ustida ko'rinadi */}
                        {canManage && row.role !== "owner" ? (
                          <span className="ml-auto">
                            <RemoveMemberButton onRemove={() => askRemove(row)} />
                          </span>
                        ) : null}
                      </div>

                      <span className="ts-num hidden text-right text-[14px] text-[var(--text-3)] sm:block">
                        {row.problems_solved}
                      </span>
                      <span className="ts-num hidden text-right text-[14px] text-[var(--text-3)] sm:block">
                        {row.rating}
                      </span>
                      <span className="ts-num text-right text-[16px] font-semibold text-[var(--green-text)]">
                        {formatNumber(row.total_points)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Pane>
          )
        ) : tab === "members" ? (
          listState ?? (
            <Pane inset="none" className="overflow-hidden">
              <ul className="divide-y divide-[var(--line-soft)]">
                {directory.map((row) => {
                  const isMe = user?.username === row.username;
                  const role = ROLE[row.role];
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        "group flex items-center gap-3.5 px-5 py-3.5 sm:px-6",
                        "transition-colors duration-[var(--dur-1)]",
                        isMe ? "bg-[var(--green-wash)]" : "hover:bg-[var(--surface-hover)]",
                      )}
                    >
                      <MemberMark src={row.avatar_url} name={row.full_name || row.username} />

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/u/${row.username}`}
                          className={cn(
                            "ring-focus flex items-center gap-1.5 truncate rounded-[6px] text-[15px] font-medium",
                            "text-[var(--text)] transition-colors hover:text-[var(--green-text)]",
                          )}
                        >
                          {row.username}
                          {isMe ? (
                            <span className="text-[12px] font-semibold text-[var(--green)]">
                              siz
                            </span>
                          ) : null}
                        </Link>
                        <p className="ts-sm truncate text-[var(--text-4)]">
                          {row.full_name ? `${row.full_name} · ` : ""}
                          {formatDate(row.joined_at, false)} dan beri
                        </p>
                      </div>

                      {row.user_rank?.name_uz ? (
                        <span
                          className="hidden text-[13px] font-medium md:block"
                          style={{ color: row.user_rank.color }}
                        >
                          {row.user_rank.name_uz}
                        </span>
                      ) : null}

                      <span className="ts-num hidden w-16 text-right text-[14px] text-[var(--text-3)] sm:block">
                        {formatNumber(row.total_points)}
                      </span>

                      <Chip tone={role.tone} dot>
                        {role.label}
                      </Chip>

                      {isOwner && row.role !== "owner" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setRoleMutation.mutate({
                              id: row.id,
                              role: row.role === "moderator" ? "member" : "moderator",
                            })
                          }
                        >
                          {row.role === "moderator" ? "Moderatorlikdan olish" : "Moderator qilish"}
                        </Button>
                      ) : null}

                      {canManage && row.role !== "owner" ? (
                        <RemoveMemberButton onRemove={() => askRemove(row)} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Pane>
          )
        ) : tab === "assignments" ? (
          <Pane inset="none" className="overflow-hidden">
            <GroupAssignmentsPanel slug={slug} canManage={canManage} />
          </Pane>
        ) : tab === "activity" ? (
          <Pane inset="none" className="overflow-hidden">
            <GroupActivityPanel slug={slug} />
          </Pane>
        ) : (
          <Pane inset="none" className="overflow-hidden">
            <GroupRequestsPanel slug={slug} />
          </Pane>
        )}
      </div>
    </div>
  );
}

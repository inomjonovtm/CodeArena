"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Check,
  Copy,
  Crown,
  Lock,
  LogOut,
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
import { useAuth, useToast } from "@/components/providers";
import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";
import type { GroupMemberRow } from "@/lib/types";
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
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-field)]",
        "bg-[var(--brand-wash)] font-semibold text-[var(--brand-ink)]",
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
        "border border-[var(--edge)] bg-[var(--pane-sunken)] text-[11px] font-semibold text-[var(--ink-3)]",
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
        "focus-ring flex size-8 shrink-0 items-center justify-center rounded-[var(--r-ctl)]",
        "text-[var(--ink-4)] opacity-0 transition-opacity duration-[var(--t-fast)]",
        "group-hover:opacity-100 focus-visible:opacity-100",
        "hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]",
      )}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

type Tab = "rank" | "members";

export default function GroupDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("rank");

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
    queryKey: ["group-leaderboard", slug],
    queryFn: () => publicApi.groups.leaderboard(slug),
    enabled: Boolean(slug && group),
  });

  const isOwner = Boolean(user && group && group.owner_username === user.username);

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
          <Block className="h-9 w-56 rounded-[var(--r-field)]" />
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
          <Block key={index} className="h-14 rounded-[var(--r-field)]" />
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
      <Pane className="enter" inset="lg">
        <Breadcrumb
          items={[{ label: "Guruhlar", href: "/groups" }, { label: group.name }]}
          className="mb-5"
        />

        <div className="flex flex-wrap items-start gap-6">
          <GroupMark src={group.avatar_url} name={group.name} size={64} />

          <div className="min-w-0 flex-1">
            <h1 className="t-title flex flex-wrap items-center gap-2 text-[var(--ink)]">
              {group.name}
              {group.is_verified ? (
                <BadgeCheck className="size-5 shrink-0 text-[var(--brand)]" />
              ) : null}
            </h1>

            {group.description ? (
              <p className="t-body mt-2 max-w-2xl text-[var(--ink-3)]">{group.description}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Chip tone={group.is_private ? "neutral" : "ok"} icon={group.is_private ? <Lock className="size-3" /> : undefined}>
                {group.is_private ? "Yopiq guruh" : "Ochiq guruh"}
              </Chip>
              <span className="t-meta text-[var(--ink-4)]">
                Egasi: {group.owner_username ? `@${group.owner_username}` : "—"}
              </span>
              <span className="t-meta text-[var(--ink-4)]">
                {formatDate(group.created_at, false)} dan beri
              </span>
              <span className="t-meta flex items-center gap-1.5 text-[var(--ink-4)]">
                <Users className="size-3.5" />
                <span className="t-num text-[var(--ink-2)]">{memberCount}</span>/
                <span className="t-num">{group.max_members}</span> a&apos;zo
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2.5 sm:items-end">
            {/* Taklif kodi — karta ichidagi botiq maydon */}
            <div className="pane-sunken flex items-center gap-3 rounded-[var(--r-field)] px-3.5 py-2.5">
              <span className="t-eyebrow">Taklif kodi</span>
              <span className="t-num font-mono text-[15px] font-semibold tracking-[0.2em] text-[var(--brand-ink)]">
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
                  onClick={() => deleteMutation.mutate()}
                >
                  Guruhni o&apos;chirish
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<LogOut className="size-4" />}
                  loading={leaveMutation.isPending}
                  onClick={() => leaveMutation.mutate()}
                >
                  Guruhdan chiqish
                </Button>
              )}
            </div>
          </div>
        </div>
      </Pane>

      {/* -------------------------------------------------- statistika kartasi */}
      <Pane inset="lg">
        {/* Karta panjarasi emas — ochiq ustunlar */}
        <div className="grid gap-x-6 gap-y-7 sm:grid-cols-3">
          <Stat
            icon={<Users className="size-4" />}
            label="A'zolar"
            value={memberCount}
            sub={`maksimum ${group.max_members}`}
            tone="brand"
          />
          <Stat label="Guruh ballari" value={formatNumber(totalPoints)} />
          <Stat label="Yechilgan masalalar" value={formatNumber(totalSolved)} />
        </div>
      </Pane>

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
              ]}
            />
          </div>
          <p className="t-meta text-[var(--ink-4)]">
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
                  "border-b border-[var(--edge)]",
                )}
              >
                <span className="t-eyebrow">#</span>
                <span className="t-eyebrow">A&apos;zo</span>
                <span className="t-eyebrow hidden text-right sm:block">Yechgan</span>
                <span className="t-eyebrow hidden text-right sm:block">Reyting</span>
                <span className="t-eyebrow text-right">Ball</span>
              </div>

              <ul className="enter-stagger divide-y divide-[var(--edge-soft)]">
                {rows.map((row, index) => {
                  const isMe = user?.username === row.username;
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        "group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:px-6",
                        "sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto_auto]",
                        "transition-colors duration-[var(--t-fast)]",
                        isMe ? "bg-[var(--brand-wash)]" : "hover:bg-[var(--pane-hover)]",
                      )}
                    >
                      <span className="t-num text-[13px] font-semibold text-[var(--ink-4)]">
                        {row.position ?? index + 1}
                      </span>

                      <div className="flex min-w-0 items-center gap-3">
                        <MemberMark src={row.avatar_url} name={row.full_name || row.username} />
                        <div className="min-w-0">
                          <Link
                            href={`/u/${row.username}`}
                            className={cn(
                              "focus-ring flex items-center gap-1.5 truncate rounded-[6px] text-[14px] font-medium",
                              "text-[var(--ink)] transition-colors hover:text-[var(--brand-ink)]",
                            )}
                          >
                            {row.username}
                            {row.role === "owner" ? (
                              <Crown className="size-3.5 shrink-0 text-[var(--warn)]" />
                            ) : null}
                            {isMe ? (
                              <span className="text-[11px] font-semibold text-[var(--brand)]">
                                siz
                              </span>
                            ) : null}
                          </Link>
                          {row.full_name ? (
                            <p className="t-meta truncate text-[var(--ink-4)]">{row.full_name}</p>
                          ) : null}
                        </div>

                        {/* Egasi a'zoni chiqarishi mumkin — qator ustida ko'rinadi */}
                        {isOwner && row.role !== "owner" ? (
                          <span className="ml-auto">
                            <RemoveMemberButton
                              onRemove={() => removeMemberMutation.mutate(row.id)}
                            />
                          </span>
                        ) : null}
                      </div>

                      <span className="t-num hidden text-right text-[13px] text-[var(--ink-3)] sm:block">
                        {row.problems_solved}
                      </span>
                      <span className="t-num hidden text-right text-[13px] text-[var(--ink-3)] sm:block">
                        {row.rating}
                      </span>
                      <span className="t-num text-right text-[15px] font-semibold text-[var(--brand-ink)]">
                        {formatNumber(row.total_points)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Pane>
          )
        ) : (
          listState ?? (
            <Pane inset="none" className="overflow-hidden">
              <ul className="enter-stagger divide-y divide-[var(--edge-soft)]">
                {directory.map((row) => {
                  const isMe = user?.username === row.username;
                  const role = ROLE[row.role];
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        "group flex items-center gap-3.5 px-5 py-3.5 sm:px-6",
                        "transition-colors duration-[var(--t-fast)]",
                        isMe ? "bg-[var(--brand-wash)]" : "hover:bg-[var(--pane-hover)]",
                      )}
                    >
                      <MemberMark src={row.avatar_url} name={row.full_name || row.username} />

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/u/${row.username}`}
                          className={cn(
                            "focus-ring flex items-center gap-1.5 truncate rounded-[6px] text-[14px] font-medium",
                            "text-[var(--ink)] transition-colors hover:text-[var(--brand-ink)]",
                          )}
                        >
                          {row.username}
                          {isMe ? (
                            <span className="text-[11px] font-semibold text-[var(--brand)]">
                              siz
                            </span>
                          ) : null}
                        </Link>
                        <p className="t-meta truncate text-[var(--ink-4)]">
                          {row.full_name ? `${row.full_name} · ` : ""}
                          {formatDate(row.joined_at, false)} dan beri
                        </p>
                      </div>

                      {row.user_rank?.name_uz ? (
                        <span
                          className="hidden text-[12.5px] font-medium md:block"
                          style={{ color: row.user_rank.color }}
                        >
                          {row.user_rank.name_uz}
                        </span>
                      ) : null}

                      <span className="t-num hidden w-16 text-right text-[13px] text-[var(--ink-3)] sm:block">
                        {formatNumber(row.total_points)}
                      </span>

                      <Chip tone={role.tone} dot>
                        {role.label}
                      </Chip>

                      {isOwner && row.role !== "owner" ? (
                        <RemoveMemberButton onRemove={() => removeMemberMutation.mutate(row.id)} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Pane>
          )
        )}
      </div>
    </div>
  );
}

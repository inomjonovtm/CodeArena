"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Alert,
  Block,
  Button,
  Empty,
  LinkButton,
  PageHead,
  Pagination,
  Pane,
  Segmented,
  Spinner,
} from "@/components/kit";
import { useAuth, useToast } from "@/components/providers";
import { publicApi } from "@/lib/public-api";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, React.ReactNode> = {
  comment_reply: <MessageSquare className="size-4" />,
  discussion_comment: <MessageSquare className="size-4" />,
  submission_result: <Sparkles className="size-4" />,
  contest_soon: <Swords className="size-4" />,
  contest_result: <Trophy className="size-4" />,
  achievement: <Trophy className="size-4" />,
  group_invite: <UserPlus className="size-4" />,
  moderation: <ShieldAlert className="size-4" />,
  account: <ShieldAlert className="size-4" />,
  announcement: <Bell className="size-4" />,
};

/* Daraja faqat IKONKA rangini belgilaydi.
   Ilgari ikonka to'ldirilgan rangli doirada turardi — dizayn qo'llanmasining
   birinchi qat'iy taqiqi ("ikonka rangli plitkada" — eng aniq shablon
   belgisi). Endi ikonka soch chizig'idagi doirada, yalang'och. */
const LEVEL_INK: Record<AppNotification["level"], string> = {
  info: "var(--note)",
  success: "var(--ok)",
  warning: "var(--warn)",
  danger: "var(--bad)",
};

const PAGE_SIZE = 20;

/** Ro'yxat skeleti — haqiqiy qator tartibini takrorlaydi. */
function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--edge-soft)]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start gap-3.5 px-4 py-3.5 sm:px-5">
          <Block className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Block className="h-3.5 w-2/5" />
            <Block className="mt-2 h-2.5 w-3/5" />
            <Block className="mt-2 h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kunga qarab guruh yorlig'i: Bugun / Kecha / sana. */
function dayLabel(iso: string): string {
  const startOf = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(new Date(iso))) / 86_400_000);
  if (diff <= 0) return "Bugun";
  if (diff === 1) return "Kecha";
  return formatDate(iso, false);
}

/** Qatorlarni kun bo'yicha guruhlaydi — tartib saqlanadi. */
function groupByDay(rows: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const groups: { label: string; items: AppNotification[] }[] = [];
  for (const row of rows) {
    const label = dayLabel(row.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(row);
    else groups.push({ label, items: [row] });
  }
  return groups;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications", filter, page],
    queryFn: () =>
      publicApi.notifications.list({
        page,
        page_size: PAGE_SIZE,
        ...(filter === "unread" ? { is_read: false } : {}),
      }),
    enabled: Boolean(user),
  });

  // Segmentdagi hisoblagich uchun — yuqori paneldagi qo'ng'iroq bilan
  // bir xil so'rov, ya'ni qo'shimcha yuk yo'q (React Query keshi umumiy)
  const { data: unread } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => publicApi.notifications.unreadCount(),
    enabled: Boolean(user),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const readMutation = useMutation({
    mutationFn: (id: string) => publicApi.notifications.markRead(id),
    onSuccess: invalidate,
  });

  const readAllMutation = useMutation({
    mutationFn: () => publicApi.notifications.markAllRead(),
    onSuccess: (result) => {
      toast.success(`${result.affected} ta bildirishnoma o'qildi`);
      invalidate();
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => publicApi.notifications.clearRead(),
    onSuccess: (result) => {
      toast.success(`${result.affected} ta yozuv tozalandi`);
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => publicApi.notifications.remove(id),
    onSuccess: invalidate,
  });

  if (loading) {
    return (
      <Pane inset="lg">
        <Spinner label="Yuklanmoqda..." />
      </Pane>
    );
  }

  if (!user) {
    return (
      <Pane tone="solid" inset="none" className="overflow-hidden">
        <Empty
          icon={<Bell className="size-5" />}
          title="Bildirishnomalar shaxsiy"
          description="Xabarlaringizni ko'rish uchun hisobingizga kiring."
          action={<LinkButton href="/login" variant="primary">Kirish</LinkButton>}
        />
      </Pane>
    );
  }

  const rows = data?.results ?? [];
  const groups = groupByDay(rows);

  return (
    <div className="flex flex-col gap-7">
      {/* --------------------------------------------- 1. sahifa sarlavhasi */}
      <PageHead
        eyebrow="Shaxsiy"
        title="Bildirishnomalar"
        lead="Izohlarga javoblar, musobaqa xabarlari va hisob bilan bog'liq voqealar."
        actions={
          <>
            <Button
              variant="quiet"
              size="sm"
              className="border-[var(--edge)] bg-[var(--pane-sunken)] hover:bg-[var(--pane-hover)]"
              icon={<CheckCheck className="size-4" />}
              loading={readAllMutation.isPending}
              onClick={() => readAllMutation.mutate()}
            >
              Hammasini o&apos;qildi
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="size-4" />}
              loading={clearMutation.isPending}
              onClick={() => clearMutation.mutate()}
            >
              O&apos;qilganlarni tozalash
            </Button>
          </>
        }
      />

      {/* ---------------------------------------------------- 2. filtr paneli */}
      <Pane className="enter" inset="md">
        <Segmented
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          items={[
            { value: "all" as const, label: "Hammasi", count: data?.count },
            {
              value: "unread" as const,
              label: "O'qilmagan",
              count: unread?.unread || undefined,
            },
          ]}
        />
      </Pane>

      {/* -------------------------------------------------- 3. kunlar bo'yicha */}
      {isLoading ? (
        <Pane tone="solid" inset="none">
          <RowsSkeleton rows={6} />
        </Pane>
      ) : isError ? (
        /* Xato "xabar yo'q" bilan chalkashmasligi kerak */
        <Alert
          tone="bad"
          title="Bildirishnomalarni yuklab bo'lmadi"
          action={
            <Button size="sm" onClick={() => refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Internet aloqasini tekshirib, qayta urinib ko&apos;ring.
        </Alert>
      ) : rows.length === 0 ? (
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            icon={<Bell className="size-5" />}
            title={filter === "unread" ? "O'qilmagan xabar yo'q" : "Bildirishnoma yo'q"}
            description="Masala yeching, muhokamada qatnashing — bu yerda xabarlar paydo bo'ladi."
            action={<LinkButton href="/problems" variant="brand-soft">Masalalarga o&apos;tish</LinkButton>}
          />
        </Pane>
      ) : (
        /* BITTA karta, ichida kunlar bo'yicha yopishqoq yorliqlar.
           Ilgari har bir kun alohida karta edi — bu "har element alohida
           karta" uslubi, ro'yxat sahifalari uchun qo'llanma taqiqlaydi. */
        <Pane tone="solid" inset="none" className="enter">
          {groups.map((group) => (
            <section key={group.label}>
              <p
                className="sticky-edge t-eyebrow border-y border-[var(--edge)] px-4 py-2 first:border-t-0 sm:px-5"
                style={{ top: "var(--bar)" }}
              >
                {group.label}
              </p>

              <ul className="enter-stagger divide-y divide-[var(--edge-soft)]">
                {group.items.map((row) => {
                  /* Ikonka soch chizig'idagi doirada — rang faqat glifda */
                  const icon = (
                    <span
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--edge)]"
                      style={{ color: LEVEL_INK[row.level] }}
                    >
                      {KIND_ICON[row.kind] ?? <Bell className="size-4" />}
                    </span>
                  );

                  const body = (
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[14px]",
                          row.is_read
                            ? "font-normal text-[var(--ink-2)]"
                            : "font-semibold text-[var(--ink)]",
                        )}
                      >
                        {row.title}
                      </p>
                      {row.body ? (
                        <p className="t-meta mt-0.5 line-clamp-2 text-[var(--ink-3)]">
                          {row.body}
                        </p>
                      ) : null}
                      <p className="t-meta t-num mt-1 text-[var(--ink-4)]">
                        {formatRelative(row.created_at)}
                      </p>
                    </div>
                  );

                  const dot = !row.is_read ? (
                    <span
                      aria-label="o'qilmagan"
                      className="mt-2 size-2 shrink-0 rounded-full bg-[var(--brand)]"
                    />
                  ) : null;

                  return (
                    <li
                      key={row.id}
                      /* O'qilmagan qator butunlay bo'yalmaydi: chap qirradagi
                         brend chizig'i (`row-mark`) va nuqta yetarli signal,
                         to'liq yuvindi esa ro'yxatni shovqinga to'ldirardi. */
                      data-active={row.is_read ? undefined : "true"}
                      className={cn(
                        "group row-mark relative flex items-start gap-3.5 px-4 py-3.5 sm:px-5",
                        "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]",
                        !row.is_read && "bg-[var(--brand-wash)]/40",
                      )}
                    >
                      {row.url ? (
                        <Link
                          href={row.url}
                          onClick={() => !row.is_read && readMutation.mutate(row.id)}
                          className="flex min-w-0 flex-1 items-start gap-3.5 rounded-[var(--r-ctl)] focus-ring"
                        >
                          {icon}
                          {body}
                          {dot}
                        </Link>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-start gap-3.5">
                          {icon}
                          {body}
                          {dot}
                        </div>
                      )}

                      <div className="flex shrink-0 items-center gap-0.5">
                        {!row.is_read ? (
                          <button
                            type="button"
                            aria-label="O'qildi deb belgilash"
                            title="O'qildi deb belgilash"
                            onClick={() => readMutation.mutate(row.id)}
                            className={cn(
                              "flex size-8 items-center justify-center rounded-[var(--r-ctl)] focus-ring",
                              "text-[var(--ink-4)] transition-[opacity,color,background-color] duration-[var(--t-fast)]",
                              "hover:bg-[var(--brand-wash)] hover:text-[var(--brand)]",
                              // Sensorli ekranda hover yo'q — doim ko'rinadi
                              "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
                            )}
                          >
                            <Check className="size-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          aria-label="O'chirish"
                          title="O'chirish"
                          onClick={() => removeMutation.mutate(row.id)}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-[var(--r-ctl)] focus-ring",
                            "text-[var(--ink-4)] transition-[opacity,color,background-color] duration-[var(--t-fast)]",
                            "hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]",
                            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
                          )}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </Pane>
      )}

      {/* -------------------------------------------------- 4. sahifalash */}
      {data && data.total_pages > 1 ? (
        <Pagination
          page={page}
          pageCount={data.total_pages}
          total={data.count}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          className="px-1"
        />
      ) : null}
    </div>
  );
}

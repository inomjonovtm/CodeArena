"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Flame,
  Github,
  Globe,
  GraduationCap,
  MapPin,
  Settings,
  Swords,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  Block,
  Chip,
  DifficultyMark,
  Empty,
  LinkButton,
  Meter,
  Pane,
  PaneHead,
  SplitLayout,
  Stat,
} from "@/components/kit";
import { useAuth, useI18n } from "@/components/providers";
import { FollowButton, FollowListModal } from "@/components/site/follow";
import { RankAvatar, RankBadge, RankProgress } from "@/components/site/rank";
import { publicApi } from "@/lib/public-api";
import type { ActivityDay, Difficulty } from "@/lib/types";
import { cn, formatDate, formatNumber, formatRelative } from "@/lib/utils";

const DIFFICULTY_ROWS: { key: Difficulty; label: string; tone: "ok" | "warn" | "bad" }[] = [
  { key: "easy", label: "Oson", tone: "ok" },
  { key: "medium", label: "O'rta", tone: "warn" },
  { key: "hard", label: "Qiyin", tone: "bad" },
];

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

/* Faollik darajalari — ko'k shkalaning qat'iy pog'onalari.
   Shaffoflik yo'q: har bir katak o'z rangiga ega, fon bilan aralashmaydi. */
const HEAT_LEVELS = [
  "bg-[var(--pane-sunken)]",
  "bg-aurora-200",
  "bg-aurora-300",
  "bg-aurora-400",
  "bg-[var(--brand)]",
];

/** GitHub uslubidagi faollik kalendari — oxirgi 26 hafta. */
function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const { weeks, total } = useMemo(() => {
    const map = new Map(activity.map((row) => [row.date, row.count]));
    const days: { date: string; count: number }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Oxirgi to'liq hafta yakshanba bilan tugasin
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));

    for (let index = 26 * 7 - 1; index >= 0; index -= 1) {
      const date = new Date(end);
      date.setDate(end.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      days.push({ date: key, count: map.get(key) ?? 0 });
    }

    const grouped: { date: string; count: number }[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      grouped.push(days.slice(index, index + 7));
    }

    return {
      weeks: grouped,
      total: activity.reduce((sum, row) => sum + row.count, 0),
    };
  }, [activity]);

  const level = (count: number) => {
    if (!count) return HEAT_LEVELS[0];
    if (count < 3) return HEAT_LEVELS[1];
    if (count < 6) return HEAT_LEVELS[2];
    if (count < 10) return HEAT_LEVELS[3];
    return HEAT_LEVELS[4];
  };

  return (
    <Pane tone="solid" inset="md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--ink-2)]">Faollik</p>
        <p className="t-meta text-[var(--ink-4)]">
          Oxirgi yilda <span className="t-num text-[var(--ink-2)]">{formatNumber(total)}</span> ta yuborish
        </p>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <span
                  key={day.date}
                  title={`${day.date}: ${day.count} ta yuborish`}
                  className={cn("size-[11px] rounded-[3px]", level(day.count))}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-[var(--ink-4)]">
        <span>kam</span>
        {HEAT_LEVELS.map((className) => (
          <span key={className} className={cn("size-[10px] rounded-[3px]", className)} />
        ))}
        <span>ko&apos;p</span>
      </div>
    </Pane>
  );
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { user } = useAuth();
  const { t } = useI18n();
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => publicApi.profile(username),
    enabled: Boolean(username),
    retry: false,
  });

  if (isLoading) {
    /* Skelet — haqiqiy tartib shaklida: shapka kartasi + ikki ustun kartalari */
    return (
      <div className="flex flex-col gap-5">
        <Block className="h-44 rounded-[var(--r-pane)]" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-5">
            <Block className="h-44 rounded-[var(--r-pane)]" />
            <Block className="h-56 rounded-[var(--r-pane)]" />
          </div>
          <div className="flex flex-col gap-5">
            <Block className="h-32 rounded-[var(--r-pane)]" />
            <Block className="h-72 rounded-[var(--r-pane)]" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Pane tone="solid" inset="none" className="overflow-hidden">
        <Empty
          icon={<UserX className="size-5" />}
          title="Foydalanuvchi topilmadi"
          description={`«${username}» nomli hisob mavjud emas.`}
          action={<LinkButton href="/leaderboard" variant="primary">Reytingga o&apos;tish</LinkButton>}
        />
      </Pane>
    );
  }

  const acceptanceRate =
    data.submissions > 0 ? Math.round((data.accepted_submissions / data.submissions) * 100) : 0;

  const joined = formatDate(data.joined_at, false);

  const isMe = data.is_me || user?.username === data.username;

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------ 1. identifikatsiya kartasi */}
      <Pane className="enter" inset="lg">
        <header className="flex flex-wrap items-start gap-6">
          <RankAvatar
            src={data.avatar_url}
            name={data.full_name || data.username}
            size={88}
            rank={data.rank}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="t-title truncate text-[var(--ink)]">{data.username}</h1>
              <RankBadge rank={data.rank} size="md" />
            </div>
            {data.full_name ? (
              <p className="t-body mt-1 truncate text-[var(--ink-3)]">{data.full_name}</p>
            ) : null}
            {data.bio ? (
              <p className="t-body mt-2.5 max-w-xl text-[var(--ink-3)]">{data.bio}</p>
            ) : null}

            {/* ------------------------------------------------------ obunalar */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[13.5px]">
              <button
                type="button"
                onClick={() => setFollowList("followers")}
                className="focus-ring rounded-[var(--r-ctl)] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
              >
                <span className="t-num font-semibold text-[var(--ink)]">
                  {formatNumber(data.followers_count)}
                </span>{" "}
                {t.site.profile.followers}
              </button>
              <button
                type="button"
                onClick={() => setFollowList("following")}
                className="focus-ring rounded-[var(--r-ctl)] text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
              >
                <span className="t-num font-semibold text-[var(--ink)]">
                  {formatNumber(data.following_count)}
                </span>{" "}
                {t.site.profile.followingCount}
              </button>
            </div>

            {/* ------------------------------------------------------ meta qatori */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--ink-3)]">
              {data.region ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[var(--ink-4)]" />
                  {data.district ? `${data.district}, ${data.region}` : data.region}
                </span>
              ) : data.country ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[var(--ink-4)]" />
                  {data.country}
                </span>
              ) : null}
              {data.education_place ? (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-[var(--ink-4)]" />
                  {data.education_place}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-[var(--ink-4)]" />
                {joined} dan beri
              </span>
              {data.github_url ? (
                <a
                  href={data.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex items-center gap-1.5 rounded-[var(--r-ctl)] transition-colors hover:text-[var(--ink)]"
                >
                  <Github className="size-3.5 text-[var(--ink-4)]" />
                  GitHub
                </a>
              ) : null}
              {data.website_url ? (
                <a
                  href={data.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex items-center gap-1.5 rounded-[var(--r-ctl)] transition-colors hover:text-[var(--ink)]"
                >
                  <Globe className="size-3.5 text-[var(--ink-4)]" />
                  Veb-sayt
                </a>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">
            {isMe ? (
              <LinkButton
                href="/settings"
                size="sm"
                icon={<Settings className="size-4" />}
                className="border-[var(--edge)] bg-[var(--pane-sunken)] hover:bg-[var(--pane-hover)]"
              >
                {t.site.nav.settings}
              </LinkButton>
            ) : (
              <FollowButton username={data.username} isFollowing={data.is_following} size="sm" />
            )}
          </div>
        </header>
      </Pane>

      <FollowListModal
        username={data.username}
        kind={followList ?? "followers"}
        open={followList !== null}
        onClose={() => setFollowList(null)}
      />

      <SplitLayout
        className="gap-5"
        aside={
          <div className="flex flex-col gap-5">
            {/* --------------------------------------------- rank va yo'l */}
            <Pane inset="md">
              <RankProgress rank={data.rank} rating={data.rating} />
              <div className="t-meta mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[var(--ink-4)]">
                <span>
                  eng yuqori: <span className="t-num text-[var(--ink-2)]">{data.max_rating}</span>
                  {data.max_rank.tier > data.rank.tier ? (
                    <span className="ml-1">({data.max_rank.name_uz})</span>
                  ) : null}
                </span>
                <span>
                  global o&apos;rin:{" "}
                  <span className="t-num text-[var(--ink-2)]">#{data.global_rank}</span>
                </span>
              </div>
            </Pane>

            {/* ------------------------------------------------ statistika
                Raqamlar bitta kartada — karta panjarasi emas. */}
            <Pane inset="md">
              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                <Stat label="Reyting" value={formatNumber(data.rating)} tone="brand" />
                <Stat label="Umumiy ball" value={formatNumber(data.total_points)} />
                <Stat
                  label="Joriy seriya"
                  value={`${data.current_streak} kun`}
                  sub={`eng uzuni: ${data.longest_streak} kun`}
                  tone="warn"
                  icon={<Flame className="size-4" />}
                />
                <Stat
                  label="Qabul nisbati"
                  value={`${acceptanceRate}%`}
                  sub={`${data.accepted_submissions} / ${data.submissions} urinish`}
                />
                <Stat
                  label="Musobaqalar"
                  value={data.contests_participated}
                  sub="reytingli ishtirok"
                  icon={<Swords className="size-4" />}
                />
                <Stat label="Yechilgan" value={data.problems_solved} tone="ok" />
              </div>
            </Pane>

            {/* ------------------------------------------------ tillar */}
            {data.languages.length ? (
              <Pane inset="md">
                <p className="t-eyebrow mb-4">Ishlatgan tillari</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.languages.map((row) => (
                    <Chip key={row.language} tone="neutral">
                      {LANGUAGE_LABEL[row.language] ?? row.language}
                      <span className="t-num text-[var(--ink-4)]">{row.count}</span>
                    </Chip>
                  ))}
                </div>
              </Pane>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* -------------------------------------------------------- faollik */}
          <ActivityHeatmap activity={data.activity} />

          {/* --------------------------------------------- qiyinlik taqsimoti */}
          <Pane inset="md">
            <PaneHead title="Qiyinlik bo'yicha" hint="Yechilgan masalalar taqsimoti" />
            <div className="mt-5 flex flex-col gap-4">
              {DIFFICULTY_ROWS.map((row) => {
                const solved = data.solved_by_difficulty[row.key] ?? 0;
                const total = data.totals_by_difficulty[row.key] ?? 0;
                return (
                  <Meter
                    key={row.key}
                    value={solved}
                    max={total || 1}
                    tone={row.tone}
                    label={
                      <>
                        {row.label} ·{" "}
                        <span className="t-num text-[var(--ink-2)]">{solved}</span>
                        <span className="text-[var(--ink-4)]"> / {total}</span>
                      </>
                    }
                  />
                );
              })}
            </div>
          </Pane>

          {/* --------------------------------------------- oxirgi yechilganlar */}
          <Pane tone="solid" inset="none">
            <div className="border-b border-[var(--edge)] px-5 py-4">
              <h2 className="t-section text-[var(--ink)]">Oxirgi yechilganlar</h2>
            </div>

            {data.recent_solved.length === 0 ? (
              <div className="p-5">
                <p className="t-meta pane-sunken rounded-[var(--r-field)] px-4 py-5 text-center text-[var(--ink-4)]">
                  Hali masala yechilmagan.
                </p>
              </div>
            ) : (
              <ul className="enter-stagger divide-y divide-[var(--edge-soft)]">
                {data.recent_solved.map((row) => (
                  <li key={row.slug}>
                    <Link
                      href={`/problems/${row.slug}`}
                      className="group focus-ring flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--pane-hover)] sm:px-5"
                    >
                      <DifficultyMark value={row.difficulty} showLabel={false} />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--ink)] transition-colors group-hover:text-[var(--brand-ink)]">
                        {row.title_uz}
                      </span>
                      <span className="t-meta shrink-0 text-[var(--ink-4)]">
                        {formatRelative(row.solved_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Pane>
        </div>
      </SplitLayout>
    </div>
  );
}

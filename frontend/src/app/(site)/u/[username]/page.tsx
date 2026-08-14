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
import { RatingHistory } from "@/components/site/rating-history";
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

/* Faollik darajalari — yashil shkalaning qat'iy pog'onalari.

   Shaffoflik YO'Q: har bir katak o'z rangiga ega va fon bilan aralashmaydi.
   Pog'onalar `color-mix` orqali brend yashilini KANVAS bilan aralashtirib
   olinadi, ya'ni shkala qorong'i rejimda o'zi teskari tomonga buriladi
   (u yerda kanvas to'q, demak aralashma quyuqlashadi).

   Ilgari bu yerda `bg-aurora-200/300/400` yozilgan edi — Tailwind'da bunday
   rang umuman e'lon qilinmagan, shuning uchun 1-3 pog'onalar FONSIZ chiqib,
   kalendar faqat ikki holatni ko'rsatardi. */
const HEAT_LEVELS = [
  "bg-[var(--surface-sunk)]",
  "bg-[color-mix(in_oklab,var(--green)_22%,var(--bg))]",
  "bg-[color-mix(in_oklab,var(--green)_46%,var(--bg))]",
  "bg-[color-mix(in_oklab,var(--green)_72%,var(--bg))]",
  "bg-[var(--green)]",
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
        <p className="text-[14px] font-medium text-[var(--text-2)]">Faollik</p>
        <p className="ts-sm text-[var(--text-4)]">
          Oxirgi yilda <span className="ts-num text-[var(--text-2)]">{formatNumber(total)}</span> ta yuborish
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

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[12px] text-[var(--text-4)]">
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
        <Block className="h-44 rounded-[var(--radius-lg)]" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-5">
            <Block className="h-44 rounded-[var(--radius-lg)]" />
            <Block className="h-56 rounded-[var(--radius-lg)]" />
          </div>
          <div className="flex flex-col gap-5">
            <Block className="h-32 rounded-[var(--radius-lg)]" />
            <Block className="h-72 rounded-[var(--radius-lg)]" />
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
      <Pane className="" inset="lg">
        <header className="flex flex-wrap items-start gap-6">
          <RankAvatar
            src={data.avatar_url}
            name={data.full_name || data.username}
            size={88}
            rank={data.rank}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="ts-h1 truncate text-[var(--text)]">{data.username}</h1>
              <RankBadge rank={data.rank} size="md" />
            </div>
            {data.full_name ? (
              <p className="ts-body mt-1 truncate text-[var(--text-3)]">{data.full_name}</p>
            ) : null}
            {data.bio ? (
              <p className="ts-body mt-2.5 max-w-xl text-[var(--text-3)]">{data.bio}</p>
            ) : null}

            {/* ------------------------------------------------------ obunalar */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[14.5px]">
              <button
                type="button"
                onClick={() => setFollowList("followers")}
                className="ring-focus rounded-[var(--radius-sm)] text-[var(--text-3)] transition-colors hover:text-[var(--text)]"
              >
                <span className="ts-num font-semibold text-[var(--text)]">
                  {formatNumber(data.followers_count)}
                </span>{" "}
                {t.site.profile.followers}
              </button>
              <button
                type="button"
                onClick={() => setFollowList("following")}
                className="ring-focus rounded-[var(--radius-sm)] text-[var(--text-3)] transition-colors hover:text-[var(--text)]"
              >
                <span className="ts-num font-semibold text-[var(--text)]">
                  {formatNumber(data.following_count)}
                </span>{" "}
                {t.site.profile.followingCount}
              </button>
            </div>

            {/* ------------------------------------------------------ meta qatori */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[var(--text-3)]">
              {data.region ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[var(--text-4)]" />
                  {data.district ? `${data.district}, ${data.region}` : data.region}
                </span>
              ) : data.country ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[var(--text-4)]" />
                  {data.country}
                </span>
              ) : null}
              {data.education_place ? (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-[var(--text-4)]" />
                  {data.education_place}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-[var(--text-4)]" />
                {joined} dan beri
              </span>
              {data.github_url ? (
                <a
                  href={data.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ring-focus inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] transition-colors hover:text-[var(--text)]"
                >
                  <Github className="size-3.5 text-[var(--text-4)]" />
                  GitHub
                </a>
              ) : null}
              {data.website_url ? (
                <a
                  href={data.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ring-focus inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] transition-colors hover:text-[var(--text)]"
                >
                  <Globe className="size-3.5 text-[var(--text-4)]" />
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
                className="border-[var(--line)] bg-[var(--surface-sunk)] hover:bg-[var(--surface-hover)]"
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
              <div className="ts-sm mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[var(--text-4)]">
                <span>
                  eng yuqori: <span className="ts-num text-[var(--text-2)]">{data.max_rating}</span>
                  {data.max_rank.tier > data.rank.tier ? (
                    <span className="ml-1">({data.max_rank.name_uz})</span>
                  ) : null}
                </span>
                <span>
                  global o&apos;rin:{" "}
                  <span className="ts-num text-[var(--text-2)]">#{data.global_rank}</span>
                </span>
              </div>
            </Pane>

            {/* Reyting qayerdan o'sgani — grafik va sabablar. Ilgari
                foydalanuvchi faqat joriy sonni ko'rardi va uning tarixi
                hech qayerda saqlanmasdi. */}
            <RatingHistory username={username} />

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
                <p className="ts-label mb-4">Ishlatgan tillari</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.languages.map((row) => (
                    <Chip key={row.language} tone="neutral">
                      {LANGUAGE_LABEL[row.language] ?? row.language}
                      <span className="ts-num text-[var(--text-4)]">{row.count}</span>
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
                        <span className="ts-num text-[var(--text-2)]">{solved}</span>
                        <span className="text-[var(--text-4)]"> / {total}</span>
                      </>
                    }
                  />
                );
              })}
            </div>
          </Pane>

          {/* --------------------------------------------- oxirgi yechilganlar */}
          <Pane tone="solid" inset="none">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <h2 className="ts-h2 text-[var(--text)]">Oxirgi yechilganlar</h2>
            </div>

            {data.recent_solved.length === 0 ? (
              <div className="p-5">
                <p className="ts-sm well rounded-[var(--radius-sm)] px-4 py-5 text-center text-[var(--text-4)]">
                  Hali masala yechilmagan.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line-soft)]">
                {data.recent_solved.map((row) => (
                  <li key={row.slug}>
                    <Link
                      href={`/problems/${row.slug}`}
                      className="group ring-focus flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] sm:px-5"
                    >
                      <DifficultyMark value={row.difficulty} showLabel={false} />
                      <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-[var(--text)] transition-colors group-hover:text-[var(--green-text)]">
                        {row.title_uz}
                      </span>
                      <span className="ts-sm shrink-0 text-[var(--text-4)]">
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

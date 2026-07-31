"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ChevronRight,
  FileText,
  Plus,
  Puzzle,
  Server,
  Settings,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Alert, Block, Chip, LinkButton } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { api } from "@/lib/api";
import type {
  AdminSubmission,
  AdminUser,
  AuditLogRow,
  DashboardCharts,
  DashboardStats,
  SystemHealth,
} from "@/lib/types";
import { cn, formatCompact, formatDateShort, formatNumber, formatRelative } from "@/lib/utils";

/* Grafik ranglari tokenlardan olinadi — qorong'i rejim ham o'zi moslashadi. */
const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "var(--ok)",
  WRONG_ANSWER: "var(--bad)",
  TIME_LIMIT_EXCEEDED: "var(--warn)",
  MEMORY_LIMIT_EXCEEDED: "var(--medium)",
  RUNTIME_ERROR: "var(--hard)",
  COMPILE_ERROR: "var(--note)",
  PENDING: "var(--ink-4)",
  JUDGING: "var(--brand)",
  SYSTEM_ERROR: "var(--ink-3)",
};

const ROLE_COLORS = { user: "var(--brand)", moderator: "var(--ok)", admin: "var(--warn)" };
const LANGUAGE_COLORS = ["var(--brand)", "var(--note)", "var(--ok)"];

interface UsersSummary {
  total: number;
  admins: number;
  moderators: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="pane-float rounded-[var(--r-field)] px-3 py-2 text-[12px]">
      {label ? <p className="mb-1 font-semibold text-[var(--ink)]">{label}</p> : null}
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-1.5 text-[var(--ink-3)]">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}:{" "}
          <span className="t-num font-semibold text-[var(--ink)]">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Markazida jami soni turgan donut. */
function Donut({
  data,
  total,
  totalLabel = "jami",
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  totalLabel?: string;
}) {
  return (
    <div className="flex items-center gap-5">
      <div className="relative size-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="70%"
              outerRadius="96%"
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="t-num text-[26px] leading-none font-semibold text-[var(--ink)]">
            {formatNumber(total)}
          </span>
          <span className="mt-1 text-[11px] text-[var(--ink-4)]">{totalLabel}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="size-2.5 shrink-0 rounded-[4px]"
              style={{ backgroundColor: entry.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[var(--ink-3)]">{entry.name}</span>
            <span className="t-num font-semibold text-[var(--ink)]">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Panel sarlavhasi — oq va ko'k bloklarda bir xil ritm. */
function PanelHead({
  title,
  hint,
  action,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[14px] leading-tight font-semibold text-[var(--ink)]">{title}</h2>
        {hint ? <p className="t-meta mt-0.5 text-[var(--ink-4)]">{hint}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** "Barchasi" havolasi — panel burchagida jimgina turadi. */
function AllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex items-center gap-0.5 rounded-[6px] text-[12.5px] font-medium text-[var(--brand)] transition-colors hover:text-[var(--brand-hover)]"
    >
      {label}
      <ChevronRight className="size-3.5" />
    </Link>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [days, setDays] = useState(30);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<DashboardStats>("/admin/dashboard/stats/"),
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ["dashboard", "charts", days],
    queryFn: () => api.get<DashboardCharts>("/admin/dashboard/charts/", { days }),
  });

  const { data: usersSummary } = useQuery({
    queryKey: ["users", "summary"],
    queryFn: () => api.get<UsersSummary>("/admin/users/summary/"),
  });

  const { data: activity } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () =>
      api.get<{
        recent_submissions: AdminSubmission[];
        recent_users: AdminUser[];
        recent_audit: AuditLogRow[];
      }>("/admin/dashboard/activity/", { limit: 8 }),
  });

  const { data: health } = useQuery({
    queryKey: ["dashboard", "health"],
    queryFn: () => api.get<SystemHealth>("/admin/dashboard/health/"),
    refetchInterval: 30_000,
  });

  const timeline = charts?.timeline.map((row) => ({
    ...row,
    label: formatDateShort(row.date),
  }));

  const roleData = usersSummary
    ? [
        {
          name: "Foydalanuvchilar",
          value: Math.max(usersSummary.total - usersSummary.admins - usersSummary.moderators, 0),
          color: ROLE_COLORS.user,
        },
        { name: "Moderatorlar", value: usersSummary.moderators, color: ROLE_COLORS.moderator },
        { name: "Adminlar", value: usersSummary.admins, color: ROLE_COLORS.admin },
      ]
    : [];

  const statusData =
    charts?.submissions_by_status.map((row) => ({
      name: row.status.replace(/_/g, " ").toLowerCase(),
      value: row.count,
      color: STATUS_COLORS[row.status] ?? "var(--ink-4)",
    })) ?? [];

  const maxProblemSubmissions = Math.max(
    ...(charts?.top_problems.map((p) => p.total_submissions) ?? [1]),
    1,
  );

  // KPI qatori — har bir ko'rsatkich o'z oq kartasida
  const kpis = stats
    ? [
        {
          key: "users",
          label: t.dashboard.totalUsers,
          value: formatNumber(stats.users.total),
          hint: `${stats.users.new_this_week} ${t.dashboard.newThisWeek}`,
          trend: stats.users.trend_percent,
          icon: <Users className="size-[17px]" />,
          href: "/admin/users",
        },
        {
          key: "problems",
          label: t.dashboard.totalProblems,
          value: formatNumber(stats.problems.total),
          hint: `${stats.problems.published} chop etilgan · ${stats.problems.draft} qoralama`,
          icon: <Puzzle className="size-[17px]" />,
          href: "/admin/problems",
        },
        {
          key: "submissions",
          label: t.dashboard.totalSubmissions,
          value: formatCompact(stats.submissions.total),
          hint: `${stats.submissions.today} bugun · ${stats.submissions.pending} navbatda`,
          trend: stats.submissions.trend_percent,
          icon: <Activity className="size-[17px]" />,
          href: "/admin/submissions",
        },
        {
          key: "acceptance",
          label: t.dashboard.acceptanceRate,
          value: `${stats.submissions.acceptance_rate}%`,
          hint: `${stats.contests.running} contest davom etmoqda`,
          icon: <Trophy className="size-[17px]" />,
          href: "/admin/contests",
        },
      ]
    : [];

  // Navbatlar — e'tibor talab qiladigan ishlar bitta ro'yxatda
  const queues = [
    {
      key: "queue",
      label: t.submissions.queued,
      value: stats?.submissions.pending ?? 0,
      href: "/admin/submissions",
      icon: <Activity className="size-4" />,
    },
    {
      key: "plagiarism",
      label: t.plagiarism.title,
      value: stats?.moderation.plagiarism_pending ?? 0,
      href: "/admin/plagiarism",
      icon: <ShieldAlert className="size-4" />,
    },
    {
      key: "reports",
      label: t.nav.reports,
      value: stats?.moderation.reports_open ?? 0,
      href: "/admin/reports",
      icon: <FileText className="size-4" />,
    },
    {
      key: "drafts",
      label: t.problems.withoutTests,
      value: stats?.problems.without_tests ?? 0,
      href: "/admin/problems",
      icon: <Puzzle className="size-4" />,
    },
  ];

  const judgeTone = !health?.judge0.available
    ? "bad"
    : health.judge0.judge0_available
      ? "ok"
      : "warn";

  return (
    <>
      <PageHeader
        title={t.dashboard.title}
        description={t.dashboard.subtitle}
        actions={
          <>
            <LinkButton href="/admin/settings" variant="quiet" size="sm" icon={<Settings className="size-4" />}>
              {t.common.settings}
            </LinkButton>
            <LinkButton href="/admin/problems/new" variant="primary" size="sm" icon={<Plus className="size-4" />}>
              {t.dashboard.newProblem}
            </LinkButton>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {/* ----------------------------------------------- ogohlantirishlar */}
        {health?.warnings.length ? (
          <div className="enter-stagger flex flex-col gap-2">
            {health.warnings.map((warning, index) => (
              <Alert
                key={index}
                tone={warning.level === "danger" ? "bad" : warning.level === "warning" ? "warn" : "info"}
              >
                {warning.message}
              </Alert>
            ))}
          </div>
        ) : null}

        {/* ---------------------------------------------------- KPI qatori */}
        {/* Har bir ko'rsatkich alohida oq karta — umumiy `StatCard` bilan */}
        {statsLoading || !stats ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="pane rounded-[var(--r-pane)] p-5">
                <Block className="h-2.5 w-24" />
                <Block className="mt-4 h-7 w-20" />
                <Block className="mt-3 h-2.5 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <StatCard
                key={kpi.key}
                label={kpi.label}
                value={kpi.value}
                hint={kpi.hint}
                icon={kpi.icon}
                trend={kpi.trend}
                href={kpi.href}
              />
            ))}
          </div>
        )}

        {/* -------------------------------- grafik + operatsion yon ustun */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="pane-solid rounded-[var(--r-pane)] p-5">
            <PanelHead
              title={t.dashboard.activityChart}
              hint={`Oxirgi ${days} kun`}
              action={
                <div className="flex items-center gap-0.5 rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] p-1">
                  {[
                    { value: 7, label: t.dashboard.last7 },
                    { value: 30, label: t.dashboard.last30 },
                    { value: 90, label: t.dashboard.last90 },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDays(option.value)}
                      className={cn(
                        "focus-ring rounded-[6px] px-2.5 py-1 text-[12px] font-medium",
                        "transition-colors duration-[var(--t-fast)]",
                        days === option.value
                          ? "bg-[var(--pane-solid)] text-[var(--ink)] shadow-[var(--lift-1),0_0_0_1px_var(--edge-soft)]"
                          : "text-[var(--ink-3)] hover:text-[var(--ink)]",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="h-[19rem]">
              {chartsLoading || !timeline ? (
                <Block className="size-full rounded-[var(--r-pane)]" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ left: -18, right: 6, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--edge)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--ink-4)" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--ink-4)" }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 10, color: "var(--ink-3)" }}
                      iconType="circle"
                      iconSize={8}
                    />
                    {/* To'ldirma qat'iy rang — gradient tuman ishlatilmaydi */}
                    <Area
                      type="monotone"
                      dataKey="submissions"
                      name="Submissionlar"
                      stroke="var(--brand)"
                      strokeWidth={2}
                      fill="var(--brand-wash)"
                      fillOpacity={1}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="accepted"
                      name="Accepted"
                      stroke="var(--ok)"
                      strokeWidth={2}
                      fill="transparent"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="new_users"
                      name="Yangi userlar"
                      stroke="var(--warn)"
                      strokeWidth={2}
                      fill="transparent"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {/* ------------------------------------------- tizim holati */}
            <div className="pane rounded-[var(--r-pane)] p-5">
              <PanelHead
                title={t.dashboard.systemHealth}
                action={
                  <Chip tone={judgeTone} dot icon={<Server className="size-3.5" />}>
                    {!health?.judge0.available
                      ? t.dashboard.offline
                      : health.judge0.judge0_available
                        ? t.dashboard.online
                        : "Lokal runner"}
                  </Chip>
                }
              />
              {/* Qaysi backend ishlayotgani aniq yoziladi — "Judge0 ishlayapti"
                  degan yozuv lokal runner paytida chalg'itardi. */}
              {/* Navbat raqamlari — karta ichidagi botiq maydon */}
              <div className="pane-sunken grid grid-cols-3 divide-x divide-[var(--edge-soft)] overflow-hidden rounded-[var(--r-field)]">
                {[
                  { label: "Pending", value: health?.queue.pending ?? 0, tone: "var(--ink)" },
                  { label: "Judging", value: health?.queue.judging ?? 0, tone: "var(--brand)" },
                  {
                    label: "Stuck",
                    value: health?.queue.stuck ?? 0,
                    tone: health?.queue.stuck ? "var(--bad)" : "var(--ink)",
                  },
                ].map((item) => (
                  <div key={item.label} className="px-2 py-3.5 text-center">
                    <p
                      className="t-num text-[20px] leading-none font-semibold"
                      style={{ color: item.tone }}
                    >
                      {item.value}
                    </p>
                    <p className="t-eyebrow mt-1.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="t-meta mt-3 truncate text-[var(--ink-4)]">
                {health?.judge0.url ?? "—"}
              </p>
            </div>

            {/* ----------------------------------------------- navbatlar */}
            <div className="pane-solid overflow-hidden rounded-[var(--r-pane)]">
              <div className="px-5 pt-5">
                <PanelHead title="Navbatlar" hint="E'tibor talab qiladigan ishlar" />
              </div>
              <ul className="divide-y divide-[var(--edge-soft)] border-t border-[var(--edge)]">
                {queues.map((queue) => (
                  <li key={queue.key}>
                    <Link
                      href={queue.href}
                      className={cn(
                        "focus-ring flex items-center gap-3 px-5 py-3",
                        "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0",
                          queue.value > 0 ? "text-[var(--brand)]" : "text-[var(--ink-4)]",
                        )}
                      >
                        {queue.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink-2)]">
                        {queue.label}
                      </span>
                      <span
                        className={cn(
                          "t-num text-[14px] font-semibold",
                          queue.value > 0 ? "text-[var(--ink)]" : "text-[var(--ink-4)]",
                        )}
                      >
                        {formatNumber(queue.value)}
                      </span>
                      <ChevronRight className="size-3.5 shrink-0 text-[var(--ink-4)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------- taqsimot */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="pane-solid rounded-[var(--r-pane)] p-5">
            <PanelHead title="Foydalanuvchilar taqsimoti" />
            {roleData.length ? (
              <Donut data={roleData} total={usersSummary?.total ?? 0} />
            ) : (
              <Block className="h-36 rounded-[var(--r-pane)]" />
            )}
          </div>

          <div className="pane-solid rounded-[var(--r-pane)] p-5">
            <PanelHead title={t.dashboard.statusBreakdown} />
            {statusData.length ? (
              <Donut
                data={statusData.slice(0, 5)}
                total={statusData.reduce((sum, row) => sum + row.value, 0)}
              />
            ) : (
              <Block className="h-36 rounded-[var(--r-pane)]" />
            )}
          </div>

          <div className="pane-solid rounded-[var(--r-pane)] p-5">
            <PanelHead title={t.dashboard.languageBreakdown} />
            <div className="h-36">
              {charts ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.submissions_by_language} margin={{ left: -22, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--edge)" vertical={false} />
                    <XAxis
                      dataKey="language"
                      tick={{ fontSize: 11, fill: "var(--ink-4)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--ink-4)" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--pane-sunken)" }} />
                    <Bar dataKey="count" name="Submissionlar" radius={[8, 8, 0, 0]} maxBarSize={40}>
                      {charts.submissions_by_language.map((_, index) => (
                        <Cell key={index} fill={LANGUAGE_COLORS[index % LANGUAGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Block className="size-full rounded-[var(--r-pane)]" />
              )}
            </div>
          </div>
        </div>

        {/* -------------------------------------- yetakchilar va masalalar */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="pane-solid rounded-[var(--r-pane)] p-5">
            <PanelHead
              title={t.dashboard.topProblems}
              action={<AllLink href="/admin/problems" label={t.common.all} />}
            />
            {charts?.top_problems.length ? (
              <div className="flex flex-col gap-4">
                {charts.top_problems.slice(0, 7).map((problem, index) => (
                  <div key={problem.slug}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[13px] font-medium text-[var(--ink)]">
                        <span className="t-num mr-1.5 text-[var(--ink-4)]">{index + 1}</span>
                        {problem.title_uz}
                      </span>
                      <span className="t-num shrink-0 text-[13px] font-semibold text-[var(--ink-2)]">
                        {formatNumber(problem.total_submissions)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--pane-sunken)]">
                      <div
                        className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-[var(--t-slow)] ease-[var(--ease-soft)]"
                        style={{
                          width: `${Math.max((problem.total_submissions / maxProblemSubmissions) * 100, 3)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Block className="h-44 rounded-[var(--r-pane)]" />
            )}
          </div>

          <div className="pane overflow-hidden rounded-[var(--r-pane)]">
            <div className="px-5 pt-5">
              <PanelHead
                title={t.dashboard.topUsers}
                action={<AllLink href="/admin/users" label={t.common.all} />}
              />
            </div>
            {charts?.top_users.length ? (
              <ul className="divide-y divide-[var(--edge)] border-t border-[var(--edge)]">
                {charts.top_users.slice(0, 6).map((user, index) => (
                  <li
                    key={user.username}
                    className="flex items-center gap-2.5 px-5 py-2.5 transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]"
                  >
                    <span className="t-num w-4 shrink-0 text-center text-[11px] font-bold text-[var(--ink-4)]">
                      {index + 1}
                    </span>
                    <Avatar
                      src={user.avatar_url}
                      name={user.full_name || user.username}
                      size="xs"
                      rank={user.rank}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                        {user.username}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--ink-4)]">
                        {user.problems_solved} masala · {user.rating} reyting
                      </span>
                    </span>
                    <span className="t-num shrink-0 text-[13px] font-bold text-[var(--brand)]">
                      {formatCompact(user.total_points)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 pb-5">
                <Block className="h-40 rounded-[var(--r-pane)]" />
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------ so'nggi faollik */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="pane-solid overflow-hidden rounded-[var(--r-pane)]">
            <div className="px-5 pt-5 pb-4">
              <PanelHead
                title={t.dashboard.recentSubmissions}
                action={<AllLink href="/admin/submissions" label={t.common.all} />}
              />
            </div>
            {activity?.recent_submissions.length ? (
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-[var(--edge-soft)] border-t border-[var(--edge)]">
                    {activity.recent_submissions.map((row) => (
                      <tr
                        key={row.id}
                        className="transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]"
                      >
                        <td className="px-5 py-2.5">
                          <Link
                            href={`/admin/users/${row.user_id}`}
                            className="focus-ring flex items-center gap-2.5 rounded-[6px] text-[13px] font-medium text-[var(--ink)] transition-colors hover:text-[var(--brand)]"
                          >
                            <Avatar name={row.username} size="xs" />
                            {row.username}
                          </Link>
                        </td>
                        <td className="max-w-[16rem] px-3 py-2.5">
                          <Link
                            href={`/admin/problems/${row.problem}`}
                            className="focus-ring block truncate rounded-[6px] text-[13px] text-[var(--ink-3)] transition-colors hover:text-[var(--brand)]"
                          >
                            {row.problem_title}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge value={row.status} />
                        </td>
                        <td className="t-num px-5 py-2.5 text-right text-[11px] whitespace-nowrap text-[var(--ink-4)]">
                          {formatRelative(row.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 pb-5">
                <Block className="h-40 rounded-[var(--r-pane)]" />
              </div>
            )}
          </div>

          <div className="pane rounded-[var(--r-pane)] p-5">
            <PanelHead
              title={t.dashboard.recentActivity}
              action={<AllLink href="/admin/audit-log" label={t.common.all} />}
            />
            {activity?.recent_audit.length ? (
              <ul className="flex flex-col gap-3">
                {activity.recent_audit.slice(0, 8).map((row) => (
                  <li key={row.id} className="flex gap-2.5">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] text-[var(--ink)]">
                        <span className="font-semibold">{row.actor_username ?? "tizim"}</span>{" "}
                        <span className="font-mono text-[11px] text-[var(--brand-ink)]">
                          {row.action}
                        </span>
                      </p>
                      <p className="truncate text-[11px] text-[var(--ink-4)]">
                        {row.target_repr || row.target_type} · {formatRelative(row.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Block className="h-40 rounded-[var(--r-pane)]" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

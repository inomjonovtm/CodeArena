"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CircleDashed,
  Clock,
  History,
  Lock,
  LogOut,
  Medal,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth, useToast } from "@/components/providers";
import {
  Alert,
  Block,
  Breadcrumb,
  Button,
  Chip,
  DifficultyMark,
  Empty,
  Field,
  Input,
  LinkButton,
  ListSkeleton,
  LiveDot,
  Meter,
  Modal,
  PageHead,
  Pane,
  Segmented,
  Stat,
} from "@/components/kit";
import { ContestBar, Countdown } from "@/components/site/contest-bar";
import { Markdown } from "@/components/ui/markdown";
import { ApiError } from "@/lib/api";
import { useEventSource } from "@/hooks/use-event-source";
import { ringStyle } from "@/lib/rank";
import { publicApi } from "@/lib/public-api";
import type { ContestParticipantRow, ContestStandings, RankInfo } from "@/lib/types";
import { cn, formatDate, initials } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; tone: "ok" | "brand" | "neutral" }> = {
  running: { label: "Davom etmoqda", tone: "ok" },
  scheduled: { label: "Rejalashtirilgan", tone: "brand" },
  finished: { label: "Tugagan", tone: "neutral" },
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

type Tab = "overview" | "problems" | "standings";

/** Ishtirokchi rasmi — rank ramkasi bilan (sayt bo'ylab bir xil hisob-kitob). */
function PlayerAvatar({
  src,
  name,
  rank,
  size = 32,
}: {
  src?: string | null;
  name?: string | null;
  rank?: RankInfo | null;
  size?: number;
}) {
  const face = (
    <span
      style={{ width: rank ? "100%" : size, height: rank ? "100%" : size, fontSize: Math.max(10, size * 0.34) }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-wash)] font-semibold text-[var(--brand-ink)] uppercase"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );

  if (!rank) return face;

  return (
    <span
      title={rank.name_uz}
      style={{ width: size, height: size, ...ringStyle(rank, size) }}
      className="flex shrink-0 items-center justify-center rounded-full"
    >
      {face}
    </span>
  );
}

export default function ContestDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("overview");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // `?tab=standings` kabi havolalar to'g'ri bo'limni ochsin
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted === "problems" || wanted === "standings") setTab(wanted);
  }, []);

  const { data: contest, isLoading, isError } = useQuery({
    queryKey: ["contest", slug],
    queryFn: () => publicApi.contests.retrieve(slug),
    enabled: Boolean(slug),
  });

  const state = contest?.computed_status ?? "scheduled";
  const isRunning = state === "running";
  const isFinished = state === "finished";
  const joined = Boolean(contest?.my_participation);

  const { data: problemsData, isLoading: problemsLoading, error: problemsError } = useQuery({
    queryKey: ["contest-problems", slug],
    queryFn: () => publicApi.contests.problems(slug),
    enabled: Boolean(slug) && tab === "problems" && Boolean(contest?.can_see_problems),
    retry: false,
  });

  // --- jonli natijalar jadvali (SSE)
  // Musobaqa davomida server o'zgarish bo'lgan zahoti yangi jadvalni yuboradi.
  // Oqim ochilmasa (eski brauzer, oqimni buferlaydigan proksi) — quyidagi
  // so'rov 20 soniyalik pollingga qaytadi, ya'ni jadval baribir yangilanadi.
  const [liveStandings, setLiveStandings] = useState<ContestStandings | null>(null);

  const streamStatus = useEventSource<ContestStandings>(
    slug && isRunning && tab === "standings" ? `/api/contests/${slug}/stream/` : null,
    { event: "standings", onData: setLiveStandings },
  );
  const isLive = streamStatus === "live";

  const { data: standings, isLoading: standingsLoading } = useQuery({
    queryKey: ["contest-standings", slug],
    queryFn: () => publicApi.contests.leaderboard(slug),
    enabled: Boolean(slug) && tab === "standings",
    refetchInterval: isRunning && !isLive ? 20_000 : false,
  });

  // Oqim tirik bo'lsa uning ma'lumoti ustunroq — u har doim yangiroq
  const board = liveStandings ?? standings;

  // Boshqa musobaqaga o'tilganda eski jadval ko'rinib qolmasin
  useEffect(() => {
    setLiveStandings(null);
  }, [slug]);

  const joinMutation = useMutation({
    mutationFn: (pass?: string) => publicApi.contests.join(slug, pass),
    onSuccess: () => {
      setPasswordOpen(false);
      setPassword("");
      setJoinError(null);
      toast.success(isFinished ? "Virtual rejimda qo'shildingiz" : "Musobaqaga yozildingiz");
      void queryClient.invalidateQueries({ queryKey: ["contest", slug] });
      void queryClient.invalidateQueries({ queryKey: ["my-contests"] });
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : "Qo'shilishda xatolik yuz berdi.";
      if (passwordOpen) setJoinError(message);
      else toast.error("Qo'shib bo'lmadi", message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => publicApi.contests.leave(slug),
    onSuccess: () => {
      toast.success("Ro'yxatdan chiqarildingiz");
      void queryClient.invalidateQueries({ queryKey: ["contest", slug] });
      void queryClient.invalidateQueries({ queryKey: ["my-contests"] });
    },
    onError: (error) =>
      toast.error(
        "Bajarilmadi",
        error instanceof ApiError ? error.message : "Keyinroq urinib ko'ring.",
      ),
  });

  // Masalalar ochilgach avtomatik shu tabga o'tamiz
  useEffect(() => {
    if (contest?.can_see_problems && tab === "overview" && isRunning && joined) {
      setTab("problems");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contest?.can_see_problems]);

  const onJoin = () => {
    setJoinError(null);
    if (contest?.requires_password) {
      setPasswordOpen(true);
      return;
    }
    joinMutation.mutate(undefined);
  };

  const solvedCount = useMemo(
    () => (problemsData?.problems ?? []).filter((row) => row.is_solved).length,
    [problemsData],
  );

  if (isLoading) {
    // Skelet haqiqiy kartalar ketma-ketligini takrorlaydi
    return (
      <div className="flex flex-col gap-5">
        <Pane inset="lg">
          <Block className="h-3 w-40" />
          <Block className="mt-4 h-8 w-2/3" />
          <div className="mt-5 flex gap-3">
            <Block className="h-6 w-24 rounded-[var(--r-chip)]" />
            <Block className="h-6 w-32 rounded-[var(--r-chip)]" />
          </div>
        </Pane>
        <Pane inset="sm">
          <Block className="h-9 w-72 rounded-[var(--r-field)]" />
        </Pane>
        <Pane inset="lg">
          <Block className="h-56" />
        </Pane>
      </div>
    );
  }

  if (isError || !contest) {
    return (
      <Pane tone="solid" inset="none" className="overflow-hidden">
        <Empty
          icon={<Trophy className="size-5" />}
          title="Musobaqa topilmadi"
          description="Havola eskirgan yoki musobaqa olib tashlangan."
          action={<LinkButton href="/contests">Musobaqalarga qaytish</LinkButton>}
        />
      </Pane>
    );
  }

  const meta = STATUS_META[state] ?? STATUS_META.finished;
  const participation = contest.my_participation;

  return (
    /* Har bir mazmun bloki alohida oq kartada, orasi bir tekis 20px */
    <div className="flex flex-col gap-5">
      {/* ---------------------------------------------------- sarlavha kartasi */}
      <Pane inset="lg">
        <Breadcrumb
          items={[{ label: "Musobaqalar", href: "/contests" }, { label: contest.title_uz }]}
          className="mb-4"
        />

        <PageHead
          eyebrow="Musobaqa"
          title={contest.title_uz}
          meta={
            <>
              <Chip tone={meta.tone} dot>
                {meta.label}
              </Chip>
              {contest.is_rated ? <Chip tone="brand">reytingli</Chip> : null}
              {contest.requires_password ? (
                <Chip tone="neutral" icon={<Lock className="size-3" />}>
                  parol bilan
                </Chip>
              ) : null}
              <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-3)]">
                <Clock className="size-3.5 text-[var(--ink-4)]" />
                {formatDate(contest.start_time)} · <span className="t-num">{contest.duration_minutes}</span> daqiqa
              </span>
              <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-3)]">
                <Users className="size-3.5 text-[var(--ink-4)]" />
                <span className="t-num">{contest.participant_count}</span>
                {contest.max_participants ? (
                  <span className="t-num">/ {contest.max_participants}</span>
                ) : null}{" "}
                ishtirokchi
              </span>
              <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-3)]">
                <Trophy className="size-3.5 text-[var(--ink-4)]" />
                <span className="t-num">{contest.problem_count}</span> masala
              </span>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {state === "scheduled" ? (
                <Stat
                  label="Boshlanishiga"
                  tone="brand"
                  value={<Countdown target={contest.start_time} serverNow={contest.server_time} />}
                />
              ) : null}
              {isRunning ? (
                <Stat
                  label="Tugashiga"
                  tone="ok"
                  value={<Countdown target={contest.end_time} serverNow={contest.server_time} />}
                />
              ) : null}

              {!user ? (
                <LinkButton href={`/login?next=/contests/${slug}`} variant="primary">
                  Kirish va qo&apos;shilish
                </LinkButton>
              ) : joined ? (
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Chip tone="ok" icon={<Check className="size-3.5" />}>
                    {participation?.is_virtual ? "Virtual ishtirokchi" : "Ro'yxatdan o'tgansiz"}
                  </Chip>
                  {state === "scheduled" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<LogOut className="size-3.5" />}
                      onClick={() => leaveMutation.mutate()}
                      disabled={leaveMutation.isPending}
                      className="text-[var(--ink-4)] hover:text-[var(--bad)]"
                    >
                      Ro&apos;yxatdan chiqish
                    </Button>
                  ) : null}
                </div>
              ) : isFinished && !contest.is_virtual_allowed ? (
                <span className="t-meta text-[var(--ink-4)]">Musobaqa yakunlangan</span>
              ) : (
                <Button
                  variant="primary"
                  onClick={onJoin}
                  loading={joinMutation.isPending}
                  icon={isFinished ? <History className="size-4" /> : undefined}
                >
                  {isFinished ? "Virtual rejimda yechish" : "Musobaqaga qo'shilish"}
                </Button>
              )}
            </div>
          }
        />
      </Pane>

      {/* ------------------------------------------------- o'z natijam kartasi */}
      {participation ? (
        <Pane inset="lg" className="enter">
          {/* Statistika karta panjarasi emas — ochiq ustunlar */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4">
            <Stat label="O'rin" value={participation.rank ? `#${participation.rank}` : "—"} />
            <Stat label="Ball" value={participation.score} />
            <Stat label="Yechilgan" value={participation.solved_count} />
            <Stat
              label="Reyting o'zgarishi"
              tone={
                participation.rating_change > 0
                  ? "ok"
                  : participation.rating_change < 0
                    ? "bad"
                    : undefined
              }
              value={
                participation.rating_change !== 0
                  ? `${participation.rating_change > 0 ? "+" : ""}${participation.rating_change}`
                  : "—"
              }
            />
          </div>
        </Pane>
      ) : null}

      {/* ----------------------------------------------------- ogohlantirishlar */}
      {isFinished && participation?.is_virtual ? (
        <Alert tone="info" title="Virtual rejim">
          Bu musobaqa allaqachon tugagan. Yechimlaringiz amaliyot sifatida hisoblanadi va reytingga
          ta&apos;sir qilmaydi.
        </Alert>
      ) : null}

      {state === "scheduled" && joined ? (
        <Alert tone="ok" title="Siz ro'yxatdasiz">
          Musobaqa boshlanganda masalalar shu sahifada ochiladi. Boshlanishidan oldin sahifani ochiq
          qoldiring yoki eslatma qo&apos;ying.
        </Alert>
      ) : null}

      {/* Olimpiada paneli — masalalar ochiq bo'lsagina ko'rinadi (o'zi karta) */}
      {contest.can_see_problems ? (
        <ContestBar
          slug={slug}
          title={contest.title_uz}
          endTime={contest.end_time}
          serverTime={contest.server_time}
          state={state}
        />
      ) : null}

      {/* --------------------------------------------------------- tab kartasi */}
      <Pane inset="sm">
        <div className="-mx-1 overflow-x-auto px-1 py-0.5">
          <Segmented
            value={tab}
            onChange={setTab}
            items={[
              { value: "overview", label: "Umumiy" },
              { value: "problems", label: "Masalalar", count: contest.problem_count },
              { value: "standings", label: "Natijalar" },
            ]}
          />
        </div>
      </Pane>

      {/* ---------------------------------------------------- tab kontenti */}
      <div className="flex flex-col gap-5">
        {tab === "overview" ? (
          <div className="enter flex flex-col gap-5">
            {/* Uzun matn o'z kartasida — o'qish maydoni tinch bo'lsin */}
            <Pane inset="lg">
              {contest.description_uz?.trim() ? (
                <Markdown source={contest.description_uz} />
              ) : (
                <p className="t-body text-[var(--ink-3)]">Bu musobaqa uchun tavsif kiritilmagan.</p>
              )}
            </Pane>

            {/* Qoidalar va vaqt — bitta kartada, ikki ustun */}
            <Pane inset="lg" className="grid gap-8 sm:grid-cols-2">
              <div>
                <p className="t-eyebrow">Qoidalar</p>
                <ul className="t-body mt-3 flex flex-col gap-2 text-[var(--ink-2)]">
                  <li>• Har bir masala uchun belgilangan ball beriladi.</li>
                  <li>• Noto&apos;g&apos;ri urinish uchun 10 daqiqa jarima qo&apos;shiladi.</li>
                  <li>• Bir xil ballda jarimasi kamroq ishtirokchi yuqori turadi.</li>
                  <li>• Plagiat aniqlansa natija bekor qilinadi.</li>
                </ul>
              </div>
              <div>
                <p className="t-eyebrow">Vaqt</p>
                <dl className="t-body mt-3 flex flex-col gap-2">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-4)]">Boshlanishi</dt>
                    <dd className="t-num text-[var(--ink-2)]">{formatDate(contest.start_time)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-4)]">Tugashi</dt>
                    <dd className="t-num text-[var(--ink-2)]">{formatDate(contest.end_time)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-4)]">Davomiyligi</dt>
                    <dd className="t-num text-[var(--ink-2)]">{contest.duration_minutes} daqiqa</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-4)]">Reyting</dt>
                    <dd className="text-[var(--ink-2)]">
                      {contest.is_rated ? "hisoblanadi" : "hisoblanmaydi"}
                    </dd>
                  </div>
                </dl>
              </div>
            </Pane>
          </div>
        ) : null}

        {tab === "problems" ? (
          !contest.can_see_problems ? (
            <Pane tone="solid" inset="none" className="overflow-hidden">
              <Empty
                icon={<Lock className="size-5" />}
                title="Masalalar hali yopiq"
                description={
                  state === "scheduled"
                    ? "Masalalar musobaqa boshlangan payt ishtirokchilarga ochiladi."
                    : "Masalalarni ko'rish uchun musobaqaga qo'shiling."
                }
                action={
                  user && !joined ? (
                    <Button variant="primary" onClick={onJoin} loading={joinMutation.isPending}>
                      Musobaqaga qo&apos;shilish
                    </Button>
                  ) : undefined
                }
              />
            </Pane>
          ) : problemsLoading ? (
            <Pane inset="md">
              <ListSkeleton rows={4} />
            </Pane>
          ) : problemsError ? (
            <Alert tone="bad" title="Masalalarni yuklab bo'lmadi">
              Sahifani yangilang yoki birozdan so&apos;ng qayta urinib ko&apos;ring.
            </Alert>
          ) : (
            <Pane inset="none" className="enter overflow-hidden">
              {/* Progress kartaning ichida — alohida suzib yurmasin */}
              {joined ? (
                <div className="px-5 pt-5 pb-4 sm:px-6">
                  <Meter
                    value={solvedCount}
                    max={problemsData?.problems?.length ?? 0}
                    label={`Yechilgan: ${solvedCount} / ${problemsData?.problems?.length ?? 0}`}
                    tone="ok"
                    className="max-w-sm"
                  />
                </div>
              ) : null}

              <ul
                className={cn(
                  "enter-stagger divide-y divide-[var(--edge-soft)]",
                  joined && "border-t border-[var(--edge)]",
                )}
              >
                {(problemsData?.problems ?? []).map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/contests/${slug}/problems/${row.problem_slug}`}
                      className={cn(
                        "flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 focus-ring sm:px-6",
                        "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]",
                        row.is_solved && "edge-brand",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-[var(--r-ctl)]",
                          "text-[13.5px] font-semibold",
                          row.is_solved
                            ? "bg-[var(--ok-wash)] text-[var(--ok)]"
                            : "bg-[var(--brand-wash)] text-[var(--brand-ink)]",
                        )}
                      >
                        {row.label}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[var(--ink)]">
                          {row.title_uz}
                        </span>
                        <span className="t-meta mt-0.5 flex items-center gap-3 text-[var(--ink-4)]">
                          <span className="t-num">{row.points} ball</span>
                          {row.is_solved ? (
                            <span className="inline-flex items-center gap-1 text-[var(--ok)]">
                              <Check className="size-3" strokeWidth={3} />
                              yechilgan
                            </span>
                          ) : row.is_attempted ? (
                            <span className="inline-flex items-center gap-1 text-[var(--warn)]">
                              <CircleDashed className="size-3" />
                              urinilgan
                            </span>
                          ) : null}
                        </span>
                      </span>

                      <DifficultyMark
                        value={row.difficulty}
                        label={DIFFICULTY_LABEL[row.difficulty] ?? row.difficulty}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Pane>
          )
        ) : null}

        {tab === "standings" ? (
          standingsLoading && !board ? (
            <Pane inset="md">
              <ListSkeleton rows={6} />
            </Pane>
          ) : (board?.results?.length ?? 0) === 0 ? (
            <Pane tone="solid" inset="none" className="overflow-hidden">
              <Empty
                icon={<Medal className="size-5" />}
                title="Natijalar hali yo'q"
                description="Musobaqa boshlanib, birinchi yechimlar kelganda jadval to'ladi."
              />
            </Pane>
          ) : (
            <Pane inset="none" className="enter overflow-hidden">
              <div className="t-eyebrow grid grid-cols-[3.25rem_minmax(0,1fr)_auto_auto_auto] items-center gap-4 border-b border-[var(--edge)] px-5 py-3.5 sm:px-6">
                <span>#</span>
                <span>Ishtirokchi</span>
                <span className="text-right">Yechdi</span>
                <span className="text-right">Jarima</span>
                <span className="text-right">Ball</span>
              </div>
              <ul className="divide-y divide-[var(--edge-soft)]">
                {(board?.results ?? []).map((row) => (
                  <StandingRow
                    key={row.id}
                    row={row}
                    isMe={Boolean(user && row.username === user.username)}
                  />
                ))}
              </ul>
              {isRunning ? (
                <p className="flex items-center justify-center gap-2 border-t border-[var(--edge)] bg-[var(--pane-sunken)] px-5 py-2.5 text-center text-[11.5px] text-[var(--ink-4)]">
                  {isLive ? (
                    <>
                      <LiveDot tone="ok" />
                      Jonli — natijalar o&apos;zgargan zahoti yangilanadi
                    </>
                  ) : (
                    "Jadval har 20 soniyada yangilanadi"
                  )}
                </p>
              ) : null}
            </Pane>
          )
        ) : null}
      </div>

      {/* ---------------------------------------------------------- parol oynasi */}
      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Yopiq musobaqa"
        description="Qo'shilish uchun tashkilotchidan olingan parolni kiriting."
        size="sm"
        footer={
          <>
            <Button size="sm" onClick={() => setPasswordOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => joinMutation.mutate(password)}
              disabled={!password}
              loading={joinMutation.isPending}
            >
              Qo&apos;shilish
            </Button>
          </>
        }
      >
        <Field label="Parol" htmlFor="contest-password" error={joinError ?? undefined}>
          <Input
            id="contest-password"
            type="password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••"
          />
        </Field>
      </Modal>
    </div>
  );
}

/** Natijalar jadvalidagi bitta qator — o'z qatorim brend qirra bilan ajralib turadi. */
function StandingRow({ row, isMe }: { row: ContestParticipantRow; isMe: boolean }) {
  return (
    <li
      className={cn(
        "grid grid-cols-[3.25rem_minmax(0,1fr)_auto_auto_auto] items-center gap-4 px-5 py-3 sm:px-6",
        isMe && "edge-brand bg-[var(--brand-wash)]",
      )}
    >
      {/* O'rin — dastlabki uchlik yuvindili doira oladi */}
      {row.rank && row.rank <= 3 ? (
        <span className="t-num flex size-7 items-center justify-center rounded-full bg-[var(--brand-wash-strong)] text-[13px] font-semibold text-[var(--brand-ink)]">
          {row.rank}
        </span>
      ) : (
        <span className="t-num text-[13px] font-medium text-[var(--ink-3)]">{row.rank ?? "—"}</span>
      )}

      <Link
        href={`/u/${row.username}`}
        className="flex min-w-0 items-center gap-3 rounded-[var(--r-ctl)] focus-ring"
      >
        <PlayerAvatar src={row.avatar_url} name={row.full_name || row.username} rank={row.user_rank} size={32} />
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-medium text-[var(--ink)] transition-colors hover:text-[var(--brand)]">
            {row.username}
            {isMe ? (
              <span className="ml-1.5 text-[11px] font-semibold text-[var(--brand)]">siz</span>
            ) : null}
          </span>
          {row.is_virtual ? (
            <span className="t-eyebrow block text-[10px] text-[var(--ink-4)]">virtual</span>
          ) : null}
        </span>
      </Link>

      <span className="t-num text-right text-[13px] text-[var(--ink-2)]">{row.solved_count}</span>
      <span className="t-num text-right text-[13px] text-[var(--ink-4)]">{row.penalty}</span>
      <span className="t-num text-right text-[14.5px] font-semibold text-[var(--brand-ink)]">
        {row.score}
      </span>
    </li>
  );
}

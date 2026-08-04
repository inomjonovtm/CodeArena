"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Loader2, Lock, Play, RotateCcw, Send, Trophy } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth, useI18n, useToast } from "@/components/providers";
import {
  Alert,
  Block,
  Button,
  Chip,
  DifficultyMark,
  Empty,
  IconButton,
  LinkButton,
  Pane,
  Segmented,
} from "@/components/kit";
import { ContestBar } from "@/components/site/contest-bar";
import { CodeEditor } from "@/components/ui/code-editor";
import { Markdown } from "@/components/ui/markdown";
import { ApiError } from "@/lib/api";
import { publicApi, TERMINAL_STATUSES } from "@/lib/public-api";
import type { ContestProblemDetail, Language, PublicSubmission, RunResponse } from "@/lib/types";
import { formatDuration, formatRelative } from "@/lib/utils";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
];

const STARTER_KEY: Record<Language, keyof ContestProblemDetail> = {
  python: "starter_code_python",
  javascript: "starter_code_javascript",
  cpp: "starter_code_cpp",
};

const draftKey = (contest: string, slug: string, language: Language) =>
  `codearena-contest-draft-${contest}-${slug}-${language}`;

/** Yuborish holati — rang + belgi; tekshirilayotganda aylanuvchi belgi. */
const STATUS_TONE: Record<string, { tone: "ok" | "warn" | "bad" | "note" | "brand" | "neutral"; busy?: boolean }> = {
  EXECUTED: { tone: "note" },
  ACCEPTED: { tone: "ok" },
  WRONG_ANSWER: { tone: "bad" },
  TIME_LIMIT_EXCEEDED: { tone: "warn" },
  MEMORY_LIMIT_EXCEEDED: { tone: "warn" },
  RUNTIME_ERROR: { tone: "bad" },
  COMPILE_ERROR: { tone: "bad" },
  SYSTEM_ERROR: { tone: "bad" },
  PENDING: { tone: "neutral", busy: true },
  JUDGING: { tone: "brand", busy: true },
};

function StatusChip({ value }: { value: string }) {
  const { t } = useI18n();
  const meta = STATUS_TONE[value] ?? { tone: "neutral" as const };
  const label = (t.site.status as Record<string, string>)[value] ?? value;
  return (
    <Chip tone={meta.tone} icon={meta.busy ? <Loader2 className="size-3 animate-spin" /> : undefined}>
      {label}
    </Chip>
  );
}

/**
 * Musobaqa ichidagi masala sahifasi.
 *
 * Amaliyot sahifasidan **ataylab** farq qiladi: maslahat, tahlil va muhokama
 * yo'q (ular musobaqa davomida spoyler bo'lardi), tepada esa musobaqa
 * konteksti — panel orqali orqaga qaytish, masala almashtirgich va tugashgacha
 * qolgan vaqt. Backend ham bu ma'lumotlarni umuman qaytarmaydi.
 */
export default function ContestProblemPage() {
  const params = useParams<{ slug: string; problemSlug: string }>();
  const contestSlug = params?.slug ?? "";
  const problemSlug = params?.problemSlug ?? "";

  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PublicSubmission | null>(null);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["contest-problem", contestSlug, problemSlug],
    queryFn: () => publicApi.contests.problem(contestSlug, problemSlug),
    enabled: Boolean(contestSlug && problemSlug && user),
    retry: false,
  });

  const { data: judge } = useQuery({
    queryKey: ["judge-status"],
    queryFn: () => publicApi.judgeStatus(),
    staleTime: 60_000,
  });

  // Yuborishda contest id kerak — alohida so'rov (kesh odatda tayyor bo'ladi)
  const { data: contest } = useQuery({
    queryKey: ["public-contest", contestSlug],
    queryFn: () => publicApi.contests.retrieve(contestSlug),
    enabled: Boolean(contestSlug),
  });
  const contestId = contest?.id;

  const languageAvailable = useCallback(
    (value: Language) => judge?.languages?.[value] !== false,
    [judge],
  );

  // Qoralama tilga va masalaga bog'lab saqlanadi
  useEffect(() => {
    if (!data) return;
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem(draftKey(contestSlug, problemSlug, language))
        : null;
    setCode(saved ?? ((data[STARTER_KEY[language]] as string) ?? ""));
  }, [data, contestSlug, problemSlug, language]);

  useEffect(() => {
    if (!data || !code) return;
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey(contestSlug, problemSlug, language), code);
    }, 600);
    return () => clearTimeout(timer);
  }, [code, data, contestSlug, problemSlug, language]);

  useEffect(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const runMutation = useMutation({
    mutationFn: () =>
      publicApi.submissions.run({ problem_slug: problemSlug, language, code }),
    onSuccess: (response) => setRunResult(response),
    onError: (mutationError) =>
      toast.error(
        mutationError instanceof ApiError ? mutationError.message : t.site.problem.runFailed,
      ),
  });

  const poll = useCallback(
    (id: string, attempt = 0) => {
      pollRef.current = setTimeout(async () => {
        try {
          const next = await publicApi.submissions.retrieve(id);
          setResult(next);
          if (TERMINAL_STATUSES.has(next.status)) {
            setSubmitting(false);
            if (next.status === "ACCEPTED") {
              toast.success(t.site.problem.accepted, t.site.problem.acceptedBody);
            }
            void queryClient.invalidateQueries({ queryKey: ["contest-problem"] });
            void queryClient.invalidateQueries({ queryKey: ["contest-problems"] });
            void queryClient.invalidateQueries({ queryKey: ["contest-leaderboard"] });
            return;
          }
          if (attempt > 40) {
            setSubmitting(false);
            toast.error(t.site.problem.judgingTooLong);
            return;
          }
          poll(id, attempt + 1);
        } catch {
          setSubmitting(false);
          toast.error(t.site.problem.resultFailed);
        }
      }, 900);
    },
    [queryClient, t, toast],
  );

  const onSubmit = async () => {
    if (!code.trim()) {
      toast.error(t.site.problem.emptyCode);
      return;
    }
    setSubmitting(true);
    setRunResult(null);
    try {
      const submission = await publicApi.submissions.create({
        problem_slug: problemSlug,
        language,
        code,
        contest: contestId,
      });
      setResult(submission);
      poll(submission.id);
    } catch (submitError) {
      setSubmitting(false);
      toast.error(
        submitError instanceof ApiError ? submitError.message : t.site.problem.submitFailed,
      );
    }
  };

  if (authLoading || (isLoading && user)) {
    // Skelet ish maydonining shaklini takrorlaydi: shart, ostida muharrir
    return (
      <div className="flex flex-col gap-6">
        <Block className="h-12 rounded-[var(--r-pane)]" />
        <div className="flex items-center gap-3">
          <Block className="size-10 rounded-[var(--r-ctl)]" />
          <Block className="h-7 w-1/3" />
        </div>
        <Block className="h-[26rem] rounded-[var(--r-pane)]" />
        <Block className="h-[26rem] rounded-[var(--r-pane)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <Empty
        icon={<Lock className="size-5" />}
        title={t.site.contest.loginRequired}
        description={t.site.contest.loginRequiredHint}
        action={
          <LinkButton href="/login" variant="primary">
            {t.site.nav.signIn}
          </LinkButton>
        }
      />
    );
  }

  if (isError || !data) {
    const locked = error instanceof ApiError && error.status === 403;
    return (
      <Empty
        icon={<Lock className="size-5" />}
        title={locked ? t.site.contest.locked : t.site.problem.notFound}
        description={locked ? t.site.contest.lockedHint : t.site.problem.notFoundHint}
        action={
          <LinkButton href={`/contests/${contestSlug}`}>{t.site.contest.backToContest}</LinkButton>
        }
      />
    );
  }

  const isFinished = data.contest_state === "finished";

  return (
    <>
      {/* Musobaqa konteksti — nom, taymer, masala almashtirgich, natijalar */}
      <ContestBar
        slug={contestSlug}
        title={data.contest_title_uz}
        endTime={data.contest_end_time}
        serverTime={data.server_time}
        state={data.contest_state as "running" | "finished" | "scheduled"}
        activeProblemSlug={data.slug}
      />

      {/* ------------------------------------------------------- sarlavha */}
      <div className="enter flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-ctl)] bg-[var(--brand-wash)] text-[15px] font-semibold text-[var(--brand-ink)]">
          {data.label}
        </span>
        <h1 className="t-title min-w-0 flex-1 truncate text-[var(--ink)]">
          {data.title_uz}
        </h1>
        {data.is_solved ? (
          <Chip tone="ok" icon={<Check className="size-3.5" strokeWidth={3} />}>
            {t.site.problem.solved}
          </Chip>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--ink-3)]">
        <DifficultyMark
          value={data.difficulty}
          label={t.site.difficulty[data.difficulty] ?? data.difficulty}
        />
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="size-3.5 text-[var(--ink-4)]" />
          <span className="t-num">{data.points}</span> {t.site.problem.points}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5 text-[var(--ink-4)]" />
          <span className="t-num">{formatDuration(data.time_limit_ms)}</span>
        </span>
        <span className="t-num">
          {data.attempts} {t.site.problem.attempts}
        </span>
      </div>

      {/* ------------------------------------- ish maydoni: shart → muharrir
          Amaliyot sahifasi bilan bir xil tartib: shart tepada, kod pastda.
          Musobaqada ham ko'z bir xil yo'nalishda ishlaydi — o'qidim, yozdim. */}
      <div className="mt-7 flex flex-col gap-6">
        {/* Tepada — masala sharti va namunalar; uzun matn oq kartada o'qiladi */}
        <Pane tone="solid" inset="lg" className="min-w-0">
          {/* Matn o'qish kengligi bilan cheklanadi (72ch) — karta butun
              sahifa kengligida bo'lgani uchun matn ham cho'zilib ketardi.
              Namunalar esa ma'lumot: ular pastda to'liq kenglikda. */}
          <div className="max-w-[72ch]">
            <Markdown source={data.description_uz} />

            {data.constraints_uz.trim() ? (
              <div className="mt-7">
                <p className="t-eyebrow">{t.site.problem.constraints}</p>
                <div className="mt-2.5">
                  <Markdown source={data.constraints_uz} />
                </div>
              </div>
            ) : null}
          </div>

          {data.samples.length ? (
            <div className="mt-8 flex flex-col gap-5">
              {data.samples.map((sample, index) => (
                /* Har bir namuna soch chizig'i bilan ajraladi — amaliyot
                   sahifasidagi bilan bir xil */
                <div key={index} className="rule pt-4">
                  <p className="t-eyebrow">
                    {t.site.problem.sample} {index + 1}
                  </p>
                  {/* `flex-1` — kirish va chiqish bloklari qatorlar soni
                      har xil bo'lsa ham bir xil balandlikda turadi */}
                  <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col">
                      <p className="t-meta mb-1.5 text-[var(--ink-4)]">{t.site.problem.input}</p>
                      <pre className="pane-sunken flex-1 overflow-auto rounded-[var(--r-field)] p-3 font-mono text-[12.5px] text-[var(--ink)]">
                        {sample.input}
                      </pre>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <p className="t-meta mb-1.5 text-[var(--ink-4)]">{t.site.problem.output}</p>
                      <pre className="pane-sunken flex-1 overflow-auto rounded-[var(--r-field)] p-3 font-mono text-[12.5px] text-[var(--ink)]">
                        {sample.expected_output}
                      </pre>
                    </div>
                  </div>
                  {sample.explanation_uz ? (
                    <p className="t-meta mt-2.5 max-w-[72ch] text-[var(--ink-3)]">
                      {sample.explanation_uz}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </Pane>

        {/* Pastda — muharrir va natijalar */}
        <div className="flex min-w-0 flex-col gap-4">
          <Pane tone="solid" inset="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--edge)] px-3 py-2.5">
              <Segmented
                size="sm"
                value={language}
                onChange={setLanguage}
                items={LANGUAGES.map((item) => ({
                  value: item.value,
                  label: item.label,
                  disabled: !languageAvailable(item.value),
                }))}
              />
              <IconButton
                label={t.site.problem.resetCode}
                size="sm"
                className="ml-auto"
                onClick={() => {
                  localStorage.removeItem(draftKey(contestSlug, problemSlug, language));
                  setCode((data[STARTER_KEY[language]] as string) ?? "");
                  toast.info(t.site.problem.codeReset);
                }}
              >
                <RotateCcw className="size-4" />
              </IconButton>
            </div>

            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height="26rem"
              expandable
              className="rounded-none border-0"
            />

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--edge)] bg-[var(--pane-sunken)] px-3 py-2.5">
              <Button
                onClick={() => runMutation.mutate()}
                loading={runMutation.isPending}
                icon={runMutation.isPending ? undefined : <Play className="size-4" />}
                disabled={submitting || judge?.available === false}
              >
                {runMutation.isPending ? t.site.judge.running : t.site.judge.run}
              </Button>
              <Button
                variant="primary"
                onClick={onSubmit}
                loading={submitting}
                icon={submitting ? undefined : <Send className="size-4" />}
                disabled={runMutation.isPending || judge?.available === false}
              >
                {submitting ? t.site.judge.submitting : t.site.judge.submit}
              </Button>
            </div>
          </Pane>

          {judge && !judge.available ? (
            <Alert tone="bad" title={t.site.judge.unavailable}>
              {t.site.judge.unavailableHint}
            </Alert>
          ) : null}

          {isFinished ? <Alert tone="info">{t.site.contest.finishedSubmitNote}</Alert> : null}

          {/* Namunalarda sinash natijasi — konsol oq kartada turadi */}
          {runResult ? (
            <Pane tone="solid" inset="md" className="enter">
              <p className="t-eyebrow">{t.site.problem.runResult}</p>
              <p className="t-num mt-2 text-[14px] text-[var(--ink-2)]">
                {runResult.passed}/{runResult.total} {t.site.problem.sample.toLowerCase()}
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {runResult.results.map((row) => (
                  <div key={row.order} className="pane-sunken rounded-[var(--r-field)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-meta text-[var(--ink-3)]">
                        {t.site.problem.sample} {row.order}
                      </span>
                      <StatusChip value={row.status} />
                    </div>
                    {row.stdout ? (
                      <pre className="mt-2 max-h-32 overflow-auto rounded-[var(--r-ctl)] bg-[var(--pane-solid)] p-2.5 font-mono text-[12px] text-[var(--ink-2)]">
                        {row.stdout}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            </Pane>
          ) : null}

          {/* Mening urinishlarim */}
          {data.my_submissions.length > 0 ? (
            <Pane tone="solid" inset="none" className="overflow-hidden">
              <p className="t-eyebrow border-b border-[var(--edge)] px-4 py-3">
                {t.site.contest.myAttempts} · <span className="t-num">{data.my_submissions.length}</span>
              </p>
              <ul className="divide-y divide-[var(--edge-soft)]">
                {data.my_submissions.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <StatusChip value={row.status} />
                    <span className="t-num text-[12.5px] text-[var(--ink-2)]">
                      {row.passed_tests}/{row.total_tests}
                    </span>
                    <span className="t-meta text-[var(--ink-4)]">{row.language}</span>
                    {row.runtime_ms ? (
                      <span className="t-num t-meta text-[var(--ink-4)]">{row.runtime_ms} ms</span>
                    ) : null}
                    <span className="t-meta ml-auto text-[var(--ink-4)]">
                      {formatRelative(row.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Pane>
          ) : null}

          {/* Yuborilgan yechim natijasi — konsol oq kartada turadi */}
          {result ? (
            <Pane tone="solid" inset="md" className="enter">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="t-eyebrow">{t.site.problem.submitResult}</p>
                <StatusChip value={result.status} />
              </div>
              <p className="t-num mt-3 text-[14px] text-[var(--ink-2)]">
                {result.passed_tests}/{result.total_tests} test
                {result.runtime_ms ? ` · ${result.runtime_ms} ms` : ""}
              </p>
              {result.failed_test_index ? (
                <p className="t-meta mt-1 text-[var(--ink-3)]">
                  {t.site.contest.failedAt} <span className="t-num">{result.failed_test_index}</span>
                </p>
              ) : null}
              {result.compile_output ? (
                <pre className="pane-sunken mt-3 max-h-40 overflow-auto rounded-[var(--r-ctl)] p-3 font-mono text-[12px] whitespace-pre-wrap text-[var(--ink-2)]">
                  {result.compile_output}
                </pre>
              ) : null}
            </Pane>
          ) : null}
        </div>
      </div>
    </>
  );
}

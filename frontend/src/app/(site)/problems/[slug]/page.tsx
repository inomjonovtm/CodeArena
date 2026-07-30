"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Check,
  Clock,
  Copy,
  Cpu,
  FileCode2,
  Lightbulb,
  ListChecks,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Block,
  Breadcrumb,
  Button,
  Chip,
  DifficultyMark,
  Empty,
  IconButton,
  LinkButton,
  Meter,
  Modal,
  Pane,
  Segmented,
  Stat,
} from "@/components/kit";
import { useAuth, useI18n, useLocalized, useToast } from "@/components/providers";
import { DiscussionList } from "@/components/site/discussions";
import { CodeEditor } from "@/components/ui/code-editor";
import { Markdown } from "@/components/ui/markdown";
import { ApiError } from "@/lib/api";
import { publicApi, TERMINAL_STATUSES } from "@/lib/public-api";
import type {
  Language,
  PublicProblemDetail,
  PublicSubmission,
  PublicSubmissionRow,
  RunResponse,
  SubmissionStatus,
} from "@/lib/types";
import { cn, formatBytes, formatDuration, formatRelative } from "@/lib/utils";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
];

const STARTER_KEY: Record<Language, keyof PublicProblemDetail> = {
  python: "starter_code_python",
  javascript: "starter_code_javascript",
  cpp: "starter_code_cpp",
};

/** Yechim uchun localStorage kaliti — sahifa yangilansa ham kod yo'qolmaydi. */
const draftKey = (slug: string, language: Language) => `codearena-draft-${slug}-${language}`;
const langKey = "codearena-language";

const POLL_INTERVAL = 1200;
const POLL_TIMEOUT = 90_000;

type LeftTab = "description" | "hint" | "editorial" | "discussion" | "submissions";

/** Mobil ko'rinishda uch bo'lim almashinadi; desktopda ikkalasi yonma-yon. */
type MobilePane = "task" | "code" | "result";

/**
 * Eski `prose-ca` klassi eski tokenlarga tayanadi — yangi ranglarni
 * ustidan yozamiz (havola, kod bloki, iqtibos).
 */
const PROSE = [
  "t-body text-[var(--ink-2)]!",
  "[&_h1]:text-[var(--ink)] [&_h2]:text-[var(--ink)] [&_h3]:text-[var(--ink)]",
  "[&_a]:text-[var(--brand)]!",
  "[&_blockquote]:border-[var(--brand)]! [&_blockquote]:text-[var(--ink-3)]!",
  "[&_code]:bg-[var(--pane-sunken)]!",
  "[&_pre]:bg-[var(--pane-sunken)]! [&_pre]:border-[var(--edge)]!",
].join(" ");

/* ------------------------------------------------------------ status chip */

type StatusTone = "neutral" | "brand" | "ok" | "warn" | "bad" | "note";

const STATUS_TONE: Record<string, { tone: StatusTone; busy?: boolean }> = {
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

function StatusChip({ value }: { value: SubmissionStatus | string }) {
  const { t } = useI18n();
  const item = STATUS_TONE[value] ?? { tone: "neutral" as const };
  const label = (t.site.status as Record<string, string>)[value] ?? value;
  return (
    <Chip
      tone={item.tone}
      dot={!item.busy}
      icon={item.busy ? <Loader2 className="size-3 animate-spin" /> : undefined}
    >
      {label}
    </Chip>
  );
}

/* ------------------------------------------------------------- nusxa olish */

function CopyButton({ text, label = "Nusxalash" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard mavjud bo'lmasa jim qolamiz
        }
      }}
      className={cn(
        "flex size-7 items-center justify-center rounded-[var(--r-ctl)] focus-ring",
        "text-[var(--ink-4)] transition-colors hover:bg-[var(--pane-hover)] hover:text-[var(--ink-2)]",
      )}
    >
      {copied ? <Check className="size-3.5 text-[var(--ok)]" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** Namuna testdagi kirish/chiqish bloki — botiq blok ichida oq kod maydoni. */
/**
 * Namunadagi kirish yoki chiqish.
 *
 * Blok BOTIQ sirtda (`pane-sunken`) — kartaning o'zida. Ilgari u yana bitta
 * o'ram ichida turardi va ekranda uchta deyarli bir xil kulrang to'rtburchak
 * paydo bo'lardi (karta → quti → kod bloki). Ikkita sirt yetarli.
 *
 * `flex-1` — kirish ikki qatorli, chiqish bir qatorli bo'lsa ham ikki blok
 * bir xil balandlikda turadi va pastki qirralari tekislanadi.
 */
function SampleBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--ink-4)]">{label}</p>
        {text ? <CopyButton text={text} /> : null}
      </div>
      <pre
        className={cn(
          "pane-sunken flex-1 overflow-x-auto rounded-[var(--r-field)]",
          "p-3 font-mono text-[12.5px] leading-relaxed text-[var(--ink-2)]",
        )}
      >
        {text || "—"}
      </pre>
    </div>
  );
}

export default function ProblemDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const localized = useLocalized();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<LeftTab>("description");
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("task");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicSubmission | null>(null);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [bottomTab, setBottomTab] = useState<"run" | "submit">("submit");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: problem, isLoading, isError } = useQuery({
    queryKey: ["public-problem", slug],
    queryFn: () => publicApi.problems.retrieve(slug),
    enabled: Boolean(slug),
  });

  // Judge qaysi tillarni bajara oladi — serverga bog'liq (Judge0 bo'lmasa
  // lokal runner faqat o'rnatilgan tillarni qo'llaydi). Shu javob asosida
  // mavjud bo'lmagan til tanlash ro'yxatida o'chirib qo'yiladi.
  const { data: judge } = useQuery({
    queryKey: ["judge-status"],
    queryFn: () => publicApi.judgeStatus(),
    staleTime: 60_000,
  });

  const languageAvailable = useCallback(
    (value: Language) => judge?.languages?.[value] !== false,
    [judge],
  );

  const { data: mySubmissions } = useQuery({
    queryKey: ["problem-submissions", slug],
    queryFn: () => publicApi.problems.submissions(slug),
    enabled: Boolean(slug && user),
  });

  // Oxirgi tanlangan tilni eslab qolamiz
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(langKey) : null;
    if (saved && LANGUAGES.some((item) => item.value === saved)) {
      setLanguage(saved as Language);
    }
  }, []);

  // Til yoki masala o'zgarganda: saqlangan qoralama, bo'lmasa starter kod
  useEffect(() => {
    if (!problem) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem(draftKey(slug, language)) : null;
    setCode(saved ?? (problem[STARTER_KEY[language]] as string) ?? "");
  }, [problem, slug, language]);

  // Qoralamani saqlab boramiz
  useEffect(() => {
    if (!problem || !code) return;
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey(slug, language), code);
    }, 600);
    return () => clearTimeout(timer);
  }, [code, problem, slug, language]);

  // Sahifadan chiqilganda pollingni to'xtatamiz
  useEffect(
    () => () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    },
    [],
  );

  const poll = useCallback(
    (id: string, startedAt: number) => {
      pollRef.current = setTimeout(async () => {
        try {
          const next = await publicApi.submissions.retrieve(id);
          setResult(next);
          if (TERMINAL_STATUSES.has(next.status)) {
            setSubmitting(false);
            void queryClient.invalidateQueries({ queryKey: ["problem-submissions", slug] });
            void queryClient.invalidateQueries({ queryKey: ["public-problem", slug] });
            void queryClient.invalidateQueries({ queryKey: ["my-progress"] });
            if (next.status === "ACCEPTED") {
              toast.success(t.site.problem.accepted, t.site.problem.acceptedBody);
            }
            return;
          }
          if (Date.now() - startedAt > POLL_TIMEOUT) {
            setSubmitting(false);
            setSubmitError(t.site.problem.judgingTooLong);
            return;
          }
          poll(id, startedAt);
        } catch {
          setSubmitting(false);
          setSubmitError(t.site.problem.resultFailed);
        }
      }, POLL_INTERVAL);
    },
    [queryClient, slug, toast],
  );

  const runMutation = useMutation({
    mutationFn: () =>
      publicApi.submissions.run({
        problem_slug: slug,
        language,
        code,
        ...(showCustom && customInput.trim() ? { stdin: customInput } : {}),
      }),
    onMutate: () => {
      setSubmitError(null);
      setRunResult(null);
      setBottomTab("run");
    },
    onSuccess: (data) => setRunResult(data),
    onError: (error) => {
      setBottomTab("run");
      setSubmitError(
        error instanceof ApiError
          ? error.status === 429
            ? "Juda tez-tez yuboryapsiz. Bir oz kuting."
            : error.message
          : t.site.problem.runFailed,
      );
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => publicApi.problems.toggleBookmark(slug),
    onSuccess: (data) => {
      toast.success(data.bookmarked ? t.site.problem.bookmarkAdded : t.site.problem.bookmarkRemoved);
      void queryClient.invalidateQueries({ queryKey: ["public-problem", slug] });
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: () => toast.error(t.site.problem.actionFailed),
  });

  const onSubmit = async () => {
    if (!code.trim()) {
      setSubmitError(t.site.problem.emptyCode);
      return;
    }
    setSubmitError(null);
    setResult(null);
    setRunResult(null);
    setBottomTab("submit");
    setSubmitting(true);
    try {
      const created = await publicApi.submissions.create({
        problem_slug: slug,
        language,
        code,
      });
      setResult(created);
      poll(created.id, Date.now());
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        setSubmitError(
          err.status === 429
            ? "Juda tez-tez yuboryapsiz. Bir daqiqada 10 tagacha yechim yuborish mumkin."
            : err.message,
        );
      } else {
        setSubmitError(t.site.problem.submitFailed);
      }
    }
  };

  const resetCode = () => {
    if (!problem) return;
    localStorage.removeItem(draftKey(slug, language));
    setCode((problem[STARTER_KEY[language]] as string) ?? "");
    toast.info(t.site.problem.codeReset);
  };

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    localStorage.setItem(langKey, next);
  };

  const hint = localized(problem?.hint_uz, problem?.hint_en).trim();
  const editorial = localized(problem?.editorial_uz, problem?.editorial_en).trim();

  const tabs = useMemo(() => {
    const items: { value: LeftTab; label: string; icon?: React.ReactNode; count?: number }[] = [
      { value: "description", label: t.site.problem.tabDescription, icon: <FileCode2 className="size-3.5" /> },
    ];
    if (hint) items.push({ value: "hint", label: t.site.problem.tabHint, icon: <Lightbulb className="size-3.5" /> });
    // Tahlil bor bo'lsa tab har doim ko'rinadi — yechilmagan bo'lsa qulf bilan.
    // Ilgari tab shunchaki yo'qolib qolar va tahlil borligi bilinmasdi.
    if (problem?.has_editorial)
      items.push({
        value: "editorial",
        label: t.site.problem.tabEditorial,
        icon: problem.editorial_locked ? (
          <Lock className="size-3.5" />
        ) : (
          <Sparkles className="size-3.5" />
        ),
      });
    items.push({
      value: "discussion",
      label: t.site.problem.tabDiscussion,
      icon: <MessageSquare className="size-3.5" />,
    });
    if (user) {
      items.push({
        value: "submissions",
        label: t.site.problem.tabMySubmissions,
        icon: <ListChecks className="size-3.5" />,
        count: mySubmissions?.length,
      });
    }
    return items;
  }, [hint, problem?.has_editorial, problem?.editorial_locked, user, mySubmissions, t]);

  /* ------------------------------------------------- yuklanish skeleti */
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Block className="h-4 w-44" />
          <Block className="mt-4 h-9 w-2/3 max-w-md" />
          <Block className="mt-4 h-4 w-80 max-w-full" />
        </div>
        {/* Skelet haqiqiy tartibni takrorlaydi: shart tepada, muharrir pastda */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <Block className="h-9 w-72 max-w-full rounded-[var(--r-field)]" />
            <Block className="h-[26rem] rounded-[var(--r-pane)]" />
          </div>
          <div className="flex flex-col gap-4">
            <Block className="h-[28rem] rounded-[var(--r-pane)]" />
            <Block className="h-14 rounded-[var(--r-pane)]" />
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------- xato holati */
  if (isError || !problem) {
    return (
      <Pane tone="solid" className="enter">
        <Empty
          icon={<FileCode2 className="size-5" />}
          title={t.site.problem.notFound}
          description={t.site.problem.notFoundHint}
          action={
            <LinkButton href="/problems" variant="primary">
              Masalalarga qaytish
            </LinkButton>
          }
        />
      </Pane>
    );
  }

  const title = localized(problem.title_uz, problem.title_en);
  const constraints = localized(problem.constraints_uz, problem.constraints_en).trim();
  const difficultyLabel =
    (t.site.difficulty as Record<string, string>)[problem.difficulty] ?? problem.difficulty;

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------- sarlavha */}
      <header className="enter">
        <Breadcrumb items={[{ label: "Masalalar", href: "/problems" }, { label: title }]} />

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="t-title text-[var(--ink)]">{title}</h1>
              <DifficultyMark value={problem.difficulty} label={difficultyLabel} />
              {problem.is_solved ? (
                <Chip tone="ok" icon={<Check className="size-3.5" strokeWidth={3} />}>
                  {t.site.problem.solved}
                </Chip>
              ) : null}
            </div>

            <div className="t-meta mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[var(--ink-3)]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-[var(--ink-4)]" />
                <span className="t-num">{problem.time_limit_ms} ms</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="size-3.5 text-[var(--ink-4)]" />
                <span className="t-num">{Math.round(problem.memory_limit_kb / 1024)} MB</span>
              </span>
              <span className="t-num">{problem.points} ball</span>
              <Chip tone="neutral" className="t-num">
                {Math.round(problem.acceptance_rate)}% {t.site.problem.acceptanceRate}
              </Chip>
              <Chip tone="neutral" className="t-num">
                {problem.total_submissions} {t.site.problem.attempts}
              </Chip>
            </div>
          </div>

          {user ? (
            <Button
              variant={problem.is_bookmarked ? "brand-soft" : "quiet"}
              onClick={() => bookmarkMutation.mutate()}
              disabled={bookmarkMutation.isPending}
              icon={
                problem.is_bookmarked ? (
                  <BookmarkCheck className="size-4" />
                ) : (
                  <Bookmark className="size-4" />
                )
              }
            >
              {problem.is_bookmarked ? t.site.problem.bookmarked : t.site.problem.bookmark}
            </Button>
          ) : null}
        </div>

        {problem.tags.length ? (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {problem.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/problems?tag=${tag.slug}`}
                className={cn(
                  "rounded-[var(--r-chip)] border border-[var(--edge)] bg-[var(--pane)] px-2.5 py-1",
                  "text-[11.5px] font-medium text-[var(--ink-3)] focus-ring",
                  "transition-colors hover:border-[var(--edge-strong)] hover:text-[var(--ink)]",
                )}
              >
                {tag.name_uz}
              </Link>
            ))}
          </div>
        ) : null}

        {/* Sarlavhani ish maydonidan ajratuvchi chiziq — barcha sahifalarda bir xil */}
        <div aria-hidden className="rule enter-draw mt-5" />
      </header>

      {/* Mobil: uch bo'lim orasida almashinish — telefonda uzun varaqni
          aylantirmaslik uchun. Kengroq ekranda uchalasi ustma-ust turadi. */}
      <Segmented
        full
        className="lg:hidden"
        value={mobilePane}
        onChange={setMobilePane}
        items={[
          { value: "task", label: "Masala", icon: <FileCode2 className="size-3.5" /> },
          { value: "code", label: "Kod", icon: <Terminal className="size-3.5" /> },
          { value: "result", label: "Natija", icon: <ListChecks className="size-3.5" /> },
        ]}
      />

      {/* Ish maydoni bitta ustunda: SHART tepada, KOD pastda.
          Yonma-yon ikki ustunda matn ham, muharrir ham yarim kenglikda
          qolardi — uzun qatorli kod o'ralib ketar, shart esa tor ustunda
          o'qilardi. Vertikal tartibda ikkalasi ham to'liq kenglikni oladi
          va ko'z tabiiy yo'nalishda harakatlanadi: o'qidim → yozdim. */}
      <div className="flex flex-col gap-6">
        {/* ------------------------------------------------- tepada: masala */}
        <div
          className={cn(
            "min-w-0 flex-col gap-4",
            mobilePane === "task" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <div className="fade-edges -mx-1 overflow-x-auto px-1 pb-1">
            <Segmented size="sm" value={tab} onChange={setTab} items={tabs} />
          </div>

          {/* Muhokama bo'limi o'z kartalarini chizadi — karta ichida karta
              bo'lmasligi uchun bu yerda o'ram berilmaydi. */}
          <Pane
            tone={tab === "discussion" ? "bare" : "solid"}
            inset={tab === "discussion" ? "none" : "lg"}
            className="enter"
          >
            {tab === "description" ? (
              <>
                {/* Matn o'qish kengligi bilan cheklanadi (72ch): uzun qatorda
                    ko'z keyingi qator boshini yo'qotadi. Namunalar esa MA'LUMOT —
                    ular pastda, kartaning butun kengligini oladi. */}
                <div className="max-w-[72ch]">
                  <Markdown
                    className={PROSE}
                    source={localized(problem.description_uz, problem.description_en)}
                  />

                  {constraints ? (
                    <div className="mt-7">
                      <p className="t-eyebrow">{t.site.problem.constraints}</p>
                      <div className="mt-2.5">
                        <Markdown className={PROSE} source={constraints} />
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Namuna testlar — quti emas, soch chizig'i bilan ajratilgan
                    bo'limlar; kod bloklari yagona botiq sirtda */}
                {problem.sample_test_cases?.length ? (
                  <div className="mt-8 flex flex-col gap-5">
                    {problem.sample_test_cases.map((sample, index) => (
                      <div key={index} className="rule pt-4">
                        <p className="t-eyebrow">
                          {t.site.problem.sample} {index + 1}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <SampleBlock label={t.site.problem.input} text={sample.input} />
                          <SampleBlock
                            label={t.site.problem.output}
                            text={sample.expected_output}
                          />
                        </div>
                        {localized(sample.explanation_uz, sample.explanation_en) ? (
                          <p className="t-meta mt-3 max-w-[72ch] text-[var(--ink-3)]">
                            {localized(sample.explanation_uz, sample.explanation_en)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            {tab === "hint" ? <Markdown className={PROSE} source={hint ?? ""} /> : null}

            {tab === "editorial" ? (
              problem.editorial_locked ? (
                <Empty
                  compact
                  icon={<Lock className="size-5" />}
                  title={t.site.problem.editorialLocked}
                  description={t.site.problem.editorialLockedHint}
                />
              ) : (
                <>
                  <Alert tone="info" className="mb-5">
                    {t.site.problem.editorialUnlocked}
                  </Alert>
                  <Markdown className={PROSE} source={editorial ?? ""} />
                </>
              )
            ) : null}

            {tab === "discussion" ? (
              <DiscussionList
                problemSlug={slug}
                problemId={problem.id}
                emptyHint={t.site.problem.firstQuestion}
              />
            ) : null}

            {tab === "submissions" ? <MySubmissions rows={mySubmissions ?? []} /> : null}
          </Pane>
        </div>

        {/* --------------------------------------------------- pastda: kod */}
        <div className="flex min-w-0 flex-col gap-4">
          <div
            className={cn(
              "min-w-0 flex-col gap-4",
              mobilePane === "code" ? "flex" : "hidden",
              "lg:flex",
            )}
          >
            <Pane tone="solid" inset="none" className="enter overflow-hidden">
              {/* muharrir asboblar paneli */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--edge)] p-2.5">
                <Segmented
                  size="sm"
                  value={language}
                  onChange={changeLanguage}
                  items={LANGUAGES.map((item) => ({
                    value: item.value,
                    label: item.label,
                    disabled: !languageAvailable(item.value),
                  }))}
                />

                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    title={t.site.problem.customInput}
                    onClick={() => setShowCustom((value) => !value)}
                    icon={<Terminal className="size-3.5" />}
                    className={cn(
                      showCustom && "bg-[var(--brand-wash)] text-[var(--brand-ink)]",
                    )}
                  >
                    Maxsus kirish
                  </Button>
                  <IconButton size="sm" label={t.site.problem.resetCode} onClick={resetCode}>
                    <RotateCcw className="size-4" />
                  </IconButton>
                </div>
              </div>

              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                height="24rem"
                expandable
                className="rounded-none border-0"
              />

              {showCustom ? (
                <div className="enter-pop border-t border-[var(--edge)] bg-[var(--pane-sunken)] p-3.5">
                  <label htmlFor="custom-input" className="t-eyebrow">
                    {t.site.problem.customInputLabel}
                  </label>
                  <textarea
                    id="custom-input"
                    rows={3}
                    value={customInput}
                    onChange={(event) => setCustomInput(event.target.value)}
                    placeholder={t.site.problem.customInputPlaceholder}
                    className={cn(
                      "mt-2 w-full resize-y rounded-[var(--r-field)] border border-[var(--edge)]",
                      "bg-[var(--pane-solid)] px-3 py-2.5 font-mono text-[12.5px] text-[var(--ink)]",
                      "placeholder:text-[var(--ink-4)] outline-none",
                      "transition-[border-color,box-shadow] duration-[var(--t-fast)]",
                      "focus:border-[var(--brand-edge)] focus:shadow-[0_0_0_var(--focus-w)_var(--focus)]",
                    )}
                  />
                </div>
              ) : null}
            </Pane>

            {/* Judge umuman ishlamayotgan bo'lsa — sababini oldindan aytamiz,
                foydalanuvchi "yuborish" bosib xatoga urilmasin */}
            {judge && !judge.available ? (
              <Alert tone="bad" title={t.site.judge.unavailable}>
                {t.site.judge.unavailableHint}
              </Alert>
            ) : null}

            {submitError ? <Alert tone="bad">{submitError}</Alert> : null}

            {/* yopishqoq amal paneli — sahifadagi yagona primary juftlik */}
            {authLoading ? null : user ? (
              <div className="sticky bottom-[calc(var(--tabbar)+12px)] z-30 lg:bottom-4">
                <div
                  className={cn(
                    "pane flex flex-wrap items-center gap-2.5 rounded-[var(--r-pane)]",
                    "px-3 py-2.5 shadow-[var(--lift-2)]",
                  )}
                >
                  <Button
                    variant="quiet"
                    onClick={() => runMutation.mutate()}
                    loading={runMutation.isPending}
                    disabled={runMutation.isPending || submitting || judge?.available === false}
                    icon={<Play className="size-4" />}
                  >
                    {runMutation.isPending ? t.site.judge.running : t.site.judge.run}
                  </Button>

                  <Button
                    variant="primary"
                    onClick={onSubmit}
                    loading={submitting}
                    disabled={submitting || runMutation.isPending || judge?.available === false}
                    icon={<Send className="size-4" />}
                  >
                    {submitting ? t.site.judge.submitting : t.site.judge.submit}
                  </Button>

                  <span className="t-meta ml-auto hidden text-[var(--ink-4)] sm:block">
                    {t.site.problem.rateLimit}
                  </span>
                </div>
              </div>
            ) : (
              <Pane inset="sm" className="flex flex-wrap items-center gap-3">
                <p className="t-body min-w-0 flex-1 text-[var(--ink-2)]">
                  Yechim yuborish uchun hisobingizga kiring.
                </p>
                <LinkButton href="/register" size="sm" variant="primary">
                  Ro&apos;yxatdan o&apos;tish
                </LinkButton>
                {/* `problem.input` EMAS: u namunadagi "Kirish" (input) uchun,
                    inglizchada tugmada "Input" deb chiqib qolardi */}
                <LinkButton href="/login" size="sm" variant="quiet">
                  {t.site.nav.signIn}
                </LinkButton>
              </Pane>
            )}
          </div>

          {/* ------------------------------------------------ pastki konsol */}
          <div
            className={cn(
              "min-w-0 flex-col gap-4",
              mobilePane === "result" ? "flex" : "hidden",
              "lg:flex",
            )}
          >
            {result || runResult ? (
              <Pane tone="solid" inset="none" className="enter overflow-hidden">
                <div className="border-b border-[var(--edge)] p-2.5">
                  <Segmented
                    size="sm"
                    value={bottomTab}
                    onChange={setBottomTab}
                    items={[
                      { value: "run", label: t.site.problem.runResult },
                      { value: "submit", label: t.site.problem.submitResult },
                    ]}
                  />
                </div>
                <div className="p-5">
                  {bottomTab === "run" ? (
                    runResult ? (
                      <RunResultView data={runResult} />
                    ) : (
                      <p className="t-meta text-[var(--ink-4)]">
                        «Ishga tushirish» tugmasi kodni faqat namuna testlarda sinaydi — ball
                        berilmaydi.
                      </p>
                    )
                  ) : result ? (
                    <SubmissionResult result={result} />
                  ) : (
                    <p className="t-meta text-[var(--ink-4)]">Hali yechim yuborilmagan.</p>
                  )}
                </div>
              </Pane>
            ) : (
              <Pane tone="solid" inset="none" className="lg:block">
                <Empty
                  compact
                  icon={<ListChecks className="size-5" />}
                  title="Natija shu yerda ko'rinadi"
                  description="Kodni ishga tushiring yoki yechim yuboring — testlar natijasi shu panelga tushadi."
                />
              </Pane>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- run natijasi */

function RunResultView({ data }: { data: RunResponse }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Chip
          tone={data.all_passed ? "ok" : "neutral"}
          dot
          className="t-num"
        >
          {data.results.some((row) => row.is_custom)
            ? t.site.problem.customInput
            : `${data.passed}/${data.total} ${t.site.problem.sample.toLowerCase()}`}
        </Chip>
      </div>

      {data.results.map((row) => (
        <div key={row.order} className="pane-sunken rounded-[var(--r-pane)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] font-medium text-[var(--ink-2)]">
              {row.is_custom ? t.site.problem.customInput : `${t.site.problem.sample} ${row.order}`}
            </p>
            <div className="flex items-center gap-3">
              {row.runtime_ms !== null ? (
                <span className="t-num text-[11.5px] text-[var(--ink-4)]">
                  {formatDuration(row.runtime_ms)}
                </span>
              ) : null}
              <StatusChip value={row.status} />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11.5px] text-[var(--ink-4)]">Kirish</p>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-[var(--r-ctl)] bg-[var(--pane-solid)] p-2.5 font-mono text-[12px] text-[var(--ink-2)]">
                {row.input || "—"}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-[11.5px] text-[var(--ink-4)]">Sizning chiqishingiz</p>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-[var(--r-ctl)] bg-[var(--pane-solid)] p-2.5 font-mono text-[12px] text-[var(--ink-2)]">
                {row.stdout || "—"}
              </pre>
            </div>
            {row.expected_output !== null ? (
              <div className="sm:col-span-2">
                <p className="mb-1 text-[11.5px] text-[var(--ink-4)]">Kutilgan chiqish</p>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-[var(--r-ctl)] bg-[var(--pane-solid)] p-2.5 font-mono text-[12px] text-[var(--ink-2)]">
                  {row.expected_output || "—"}
                </pre>
              </div>
            ) : null}
          </div>

          {row.compile_output ? (
            <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-[var(--r-ctl)] bg-[var(--bad-wash)] p-2.5 font-mono text-[11.5px] text-[var(--bad)]">
              {row.compile_output}
            </pre>
          ) : null}
          {row.stderr ? (
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-[var(--r-ctl)] bg-[var(--warn-wash)] p-2.5 font-mono text-[11.5px] text-[var(--warn)]">
              {row.stderr}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ natija */

function SubmissionResult({ result }: { result: PublicSubmission }) {
  const { t } = useI18n();
  const accepted = result.status === "ACCEPTED";
  const pending = !TERMINAL_STATUSES.has(result.status);

  return (
    <div className={cn(accepted && "-m-1 rounded-[var(--r-pane)] bg-[var(--ok-wash)] p-4")}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip value={result.status} />
        {!pending && result.total_tests > 0 ? (
          <span className="t-num text-[13.5px] text-[var(--ink-3)]">
            {result.passed_tests}/{result.total_tests} test
          </span>
        ) : null}
      </div>

      {!pending ? (
        <>
          {result.total_tests > 0 ? (
            <Meter
              className="mt-4"
              value={result.passed_tests}
              max={result.total_tests}
              tone={accepted ? "ok" : "warn"}
            />
          ) : null}

          {/* ish vaqti va xotira — t-num statistikalar */}
          {result.runtime_ms !== null || result.memory_kb !== null ? (
            <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
              {result.runtime_ms !== null ? (
                <Stat
                  label="Vaqt"
                  icon={<Clock className="size-3.5" />}
                  value={formatDuration(result.runtime_ms)}
                />
              ) : null}
              {result.memory_kb !== null ? (
                <Stat
                  label="Xotira"
                  icon={<Cpu className="size-3.5" />}
                  value={formatBytes(result.memory_kb)}
                />
              ) : null}
            </div>
          ) : null}

          {/* xatolik tafsiloti — botiq maydonda */}
          {result.failed_test_index || result.compile_output || result.error_message ? (
            <div className="pane-sunken mt-5 flex flex-col gap-2 rounded-[var(--r-field)] p-3.5">
              {result.failed_test_index ? (
                <p className="t-num text-[13px] font-medium text-[var(--bad)]">
                  {result.failed_test_index}-testda xato
                </p>
              ) : null}
              {result.compile_output ? (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--r-ctl)] bg-[var(--bad-wash)] p-3 font-mono text-[12px] text-[var(--bad)]">
                  {result.compile_output}
                </pre>
              ) : null}
              {result.error_message ? (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--r-ctl)] bg-[var(--pane-solid)] p-3 font-mono text-[12px] text-[var(--ink-2)]">
                  {result.error_message}
                </pre>
              ) : null}
            </div>
          ) : null}

          {result.sample_results?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.sample_results.map((test) => (
                <Chip key={test.id} tone={test.status === "ACCEPTED" ? "ok" : "bad"} dot>
                  {t.site.problem.sample} {test.order}
                </Chip>
              ))}
            </div>
          ) : null}

          <p className="t-meta mt-4 flex items-center gap-1.5 text-[var(--ink-4)]">
            <AlertTriangle className="size-3" />
            {t.site.problem.hiddenNote}
          </p>
        </>
      ) : (
        <div className="t-meta mt-3 flex items-center gap-2 text-[var(--ink-3)]">
          <Loader2 className="size-3.5 animate-spin text-[var(--brand)]" />
          Yechimingiz navbatda — natija bir necha soniyada tayyor bo&apos;ladi.
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- urinishlar ro'yxati */

function MySubmissions({ rows }: { rows: PublicSubmissionRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["submission-full", openId],
    queryFn: () => publicApi.submissions.full(openId as string),
    enabled: Boolean(openId),
  });

  if (!rows.length) {
    return (
      <p className="t-meta py-6 text-center text-[var(--ink-4)]">
        Bu masala bo&apos;yicha hali urinish yo&apos;q.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-[var(--edge-soft)]">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => setOpenId(row.id)}
              className={cn(
                "flex w-full flex-wrap items-center gap-3 rounded-[var(--r-ctl)] px-2 py-3 text-left focus-ring",
                "transition-colors hover:bg-[var(--pane-hover)]",
              )}
            >
              <StatusChip value={row.status} />
              <span className="t-meta text-[var(--ink-3)]">
                {LANGUAGES.find((item) => item.value === row.language)?.label ?? row.language}
              </span>
              <span className="t-num text-[12.5px] text-[var(--ink-4)]">
                {row.total_tests ? `${row.passed_tests}/${row.total_tests}` : "—"}
              </span>
              <span className="t-num text-[12.5px] text-[var(--ink-4)]">
                {formatDuration(row.runtime_ms)}
              </span>
              <span className="ml-auto text-[12px] text-[var(--ink-4)]">
                {formatRelative(row.created_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        title="Yuborilgan yechim"
        description={detail ? formatRelative(detail.created_at) : undefined}
        size="lg"
      >
        {isLoading || !detail ? (
          <Block className="h-64 rounded-[var(--r-pane)]" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip value={detail.status} />
              <span className="t-num t-meta text-[var(--ink-3)]">
                {detail.passed_tests}/{detail.total_tests} test
              </span>
              <span className="t-num t-meta text-[var(--ink-3)]">
                {formatDuration(detail.runtime_ms)}
              </span>
              <span className="t-num t-meta text-[var(--ink-3)]">
                {formatBytes(detail.memory_kb)}
              </span>
            </div>

            <div className="overflow-hidden rounded-[var(--r-field)] border border-[var(--edge)]">
              <CodeEditor
                value={detail.code}
                language={detail.language}
                height="20rem"
                readOnly
                className="rounded-none border-0"
              />
            </div>

            {detail.error_message ? (
              <pre className="pane-sunken max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--r-field)] p-3 font-mono text-[12px] text-[var(--ink-2)]">
                {detail.error_message}
              </pre>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  );
}

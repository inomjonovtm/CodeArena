"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Lightbulb,
  ListChecks,
  Play,
  RotateCcw,
  Send,
  Terminal,
  X,
} from "lucide-react";
import { useState } from "react";

import { Alert, Button, Chip, LinkButton, Meter, Pane } from "@/components/kit";
import { useAuth, useToast } from "@/components/providers";
import { CodeEditor } from "@/components/ui/code-editor";
import { Markdown } from "@/components/ui/markdown";
import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";
import type {
  CourseExample,
  CourseExercise,
  CourseQuizQuestion,
  ExerciseSubmitResult,
  QuizResult,
  SnippetRunResult,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Umumiy yordamchilar
   ========================================================================== */

const STATUS_LABEL: Record<string, string> = {
  ACCEPTED: "To'g'ri",
  EXECUTED: "Bajarildi",
  WRONG_ANSWER: "Javob noto'g'ri",
  TIME_LIMIT_EXCEEDED: "Vaqt chegarasidan oshdi",
  MEMORY_LIMIT_EXCEEDED: "Xotira chegarasidan oshdi",
  RUNTIME_ERROR: "Bajarilishda xato",
  COMPILE_ERROR: "Kompilyatsiya xatosi",
  SYSTEM_ERROR: "Tizim xatosi",
};

const statusLabel = (value: string) => STATUS_LABEL[value] ?? value;

/** Kod bajarish natijasi ko'rsatiladigan qora terminal maydoni. */
function Console({
  title,
  children,
  tone = "neutral",
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "bad";
}) {
  return (
    <div className="overflow-hidden rounded-[var(--r-field)] border border-[var(--edge)]">
      {title ? (
        <div
          className={cn(
            "flex items-center gap-2 border-b border-[var(--edge)] px-3.5 py-2",
            "t-eyebrow bg-[var(--pane-sunken)]",
            tone === "ok" && "text-[var(--ok)]",
            tone === "bad" && "text-[var(--bad)]",
          )}
        >
          {title}
        </div>
      ) : null}
      <pre className="max-h-64 overflow-auto bg-[var(--pane-sunken)] px-3.5 py-3 font-[var(--font-mono)] text-[12.5px] leading-relaxed whitespace-pre-wrap text-[var(--ink-2)]">
        {children}
      </pre>
    </div>
  );
}

/**
 * Natija SAQLANMASLIGI haqidagi eslatma.
 *
 * Ilgari bu yerda «Kirish talab qilinadi» degan to'siq turardi va mehmonga
 * kod muharriri umuman ko'rsatilmasdi — ya'ni sayt nima berishini ko'rish
 * uchun avval ro'yxatdan o'tish kerak edi. Endi kod yozish ham, ishga
 * tushirish ham hammaga ochiq; hisob faqat NATIJANI saqlash uchun kerak,
 * shuning uchun bu blok to'sib qo'ymaydi — chetda turib eslatadi.
 */
function ProgressNote({ what }: { what: string }) {
  return (
    <Alert
      tone="info"
      action={
        <LinkButton href="/login" size="sm" variant="brand-soft">
          Kirish
        </LinkButton>
      }
    >
      {what} bemalol sinab ko&apos;ring. Natija progressingizga yozilishi va ball
      olish uchun hisobingizga kiring.
    </Alert>
  );
}

/* ==========================================================================
   Misol — «Sinab ko'rish»
   --------------------------------------------------------------------------
   Kutilgan chiqish sahifaning o'zida turadi (u kontent qismi), tugma esa
   HAQIQIY natijani ko'rsatadi. Shu tufayli sahifa judge ishlamayotganda ham
   to'liq o'qiladi — faqat tugma xabar beradi.
   ========================================================================== */

export function ExampleBlock({ example, index }: { example: CourseExample; index: number }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(example.code);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<SnippetRunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: () =>
      publicApi.courses.run({ language: example.language, code, stdin: stdin || undefined }),
    onSuccess: (data) => {
      setResult(data);
      setFailure(null);
    },
    onError: (error: unknown) => {
      setResult(null);
      setFailure(error instanceof ApiError ? error.message : "Kodni bajarib bo'lmadi.");
    },
  });

  return (
    <Pane tone="solid" inset="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <p className="t-eyebrow flex items-center gap-2">
          <span className="text-[var(--brand)]">{String(index + 1).padStart(2, "0")}</span>
          <span aria-hidden className="h-px w-3 bg-[var(--edge-strong)]" />
          {example.title_uz || "Misol"}
        </p>
        {example.is_runnable ? (
          <Button
            size="sm"
            variant={open ? "ghost" : "quiet"}
            icon={open ? <ChevronDown className="size-3.5" /> : <Play className="size-3.5" />}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Yopish" : "Sinab ko'rish"}
          </Button>
        ) : null}
      </div>

      <CodeEditor
        value={example.code}
        language={example.language}
        readOnly
        height={`${Math.min(Math.max(example.code.split("\n").length, 3) * 20 + 24, 420)}px`}
        className="rounded-none border-y border-[var(--edge)]"
      />

      {example.expected_output ? (
        <div className="border-b border-[var(--edge)] bg-[var(--pane-sunken)] px-5 py-3.5">
          <p className="t-eyebrow mb-2">Chiqish</p>
          <pre className="font-[var(--font-mono)] text-[12.5px] leading-relaxed whitespace-pre-wrap text-[var(--ink-2)]">
            {example.expected_output}
          </pre>
        </div>
      ) : null}

      {example.explanation_uz ? (
        <div className="px-5 py-4">
          <Markdown source={example.explanation_uz} className="text-[14px]" />
        </div>
      ) : null}

      {/* --------------------------------------------- interaktiv maydon */}
      {open ? (
        <div className="flex flex-col gap-4 border-t border-[var(--edge)] bg-[var(--pane-sunken)] p-5">
              <div>
                <p className="t-eyebrow mb-2">Kodni o&apos;zgartiring va bajaring</p>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={example.language}
                  height="16rem"
                  expandable
                />
              </div>

              <label className="min-w-0">
                <span className="t-eyebrow mb-2 block">Kirish (stdin) — ixtiyoriy</span>
                <textarea
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  rows={2}
                  placeholder="Dastur input() yoki cin bilan o'qiydigan ma'lumot"
                  className={cn(
                    "focus-ring w-full resize-y rounded-[var(--r-field)] px-3.5 py-2.5",
                    "border border-[var(--edge)] bg-[var(--pane-solid)]",
                    "font-[var(--font-mono)] text-[12.5px] text-[var(--ink)]",
                  )}
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="brand"
                  icon={<Play className="size-3.5" />}
                  loading={run.isPending}
                  onClick={() => run.mutate()}
                >
                  Ishga tushirish
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RotateCcw className="size-3.5" />}
                  onClick={() => {
                    setCode(example.code);
                    setStdin("");
                    setResult(null);
                    setFailure(null);
                  }}
                >
                  Asl kodga qaytarish
                </Button>
              </div>

              {failure ? <Alert tone="bad">{failure}</Alert> : null}

              {result ? (
                <Console
                  tone={result.status === "EXECUTED" ? "ok" : "bad"}
                  title={
                    <>
                      <Terminal className="size-3.5" />
                      Natija · {statusLabel(result.status)}
                      {result.runtime_ms ? (
                        <span className="t-num ml-auto font-normal text-[var(--ink-4)]">
                          {result.runtime_ms} ms
                        </span>
                      ) : null}
                    </>
                  }
                >
                  {result.compile_output || result.stderr || result.stdout || "(chiqish bo'sh)"}
                </Console>
              ) : null}
        </div>
      ) : null}
    </Pane>
  );
}

/* ==========================================================================
   Test
   --------------------------------------------------------------------------
   To'g'ri javoblar sahifaga umuman yuklanmaydi — ular faqat topshirilgandan
   keyingi javobda keladi. Shu sababli natija serverdan qaytgach saqlanadi
   va shu asosda variantlar bo'yaladi.
   ========================================================================== */

export function QuizBlock({
  questions,
  courseSlug,
  lessonSlug,
  passed,
  onCompleted,
}: {
  questions: CourseQuizQuestion[];
  courseSlug: string;
  lessonSlug: string;
  passed: boolean;
  onCompleted: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const submit = useMutation({
    mutationFn: () => publicApi.courses.submitQuiz(courseSlug, lessonSlug, answers),
    onSuccess: (data) => {
      setResult(data);
      if (data.is_passed) {
        toast.success(
          "Test topshirildi",
          data.is_saved
            ? `${data.score}/${data.total} to'g'ri javob`
            : `${data.score}/${data.total} to'g'ri — natija saqlanmadi, kiring`,
        );
        if (data.is_saved) onCompleted();
      } else {
        toast.info("Yana urinib ko'ring", `${data.score}/${data.total} — o'tish uchun ${data.pass_percent}% kerak`);
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Testni topshirib bo'lmadi.");
    },
  });

  const answeredAll = questions.every((question) => answers[String(question.id)] !== undefined);
  const verdict = result
    ? new Map(result.results.map((row) => [String(row.id), row]))
    : null;

  return (
    <Pane tone="solid" inset="lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-eyebrow mb-2.5 flex items-center gap-2">
            <ListChecks className="size-3.5" />
            Mavzu testi
          </p>
          <h2 className="t-section text-[var(--ink)]">O&apos;zingizni tekshiring</h2>
          <p className="t-meta mt-1.5 text-[var(--ink-3)]">
            {questions.length} ta savol · o&apos;tish uchun 70% to&apos;g&apos;ri javob kerak
          </p>
        </div>
        {passed ? (
          <Chip tone="ok" icon={<Check className="size-3.5" strokeWidth={3} />}>
            Topshirilgan
          </Chip>
        ) : null}
      </div>

      {!user ? (
        <div className="mt-5">
          <ProgressNote what="Testni" />
        </div>
      ) : null}

      <ol className="mt-6 flex flex-col gap-6">
        {questions.map((question, index) => {
          const key = String(question.id);
          const row = verdict?.get(key);
          return (
            <li key={question.id}>
              <p className="flex gap-2.5 text-[14.5px] font-semibold text-[var(--ink)]">
                <span className="t-num shrink-0 text-[var(--ink-4)]">{index + 1}.</span>
                <span className="min-w-0">{question.question_uz}</span>
              </p>

              <div className="mt-3 ml-7 flex flex-col gap-2">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[key] === optionIndex;
                  const isCorrect = row ? row.correct_index === optionIndex : false;
                  const isWrongPick = row ? selected && !row.is_correct : false;

                  return (
                    <label
                      key={optionIndex}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-[var(--r-field)] px-3.5 py-2.5",
                        "border transition-colors duration-[var(--t-fast)]",
                        row
                          ? isCorrect
                            ? "border-[color-mix(in_oklab,var(--ok)_35%,transparent)] bg-[var(--ok-wash)]"
                            : isWrongPick
                              ? "border-[color-mix(in_oklab,var(--bad)_35%,transparent)] bg-[var(--bad-wash)]"
                              : "border-[var(--edge)]"
                          : selected
                            ? "border-[var(--brand-edge)] bg-[var(--brand-wash)]"
                            : "border-[var(--edge)] hover:bg-[var(--pane-hover)]",
                        row && "cursor-default",
                      )}
                    >
                      <input
                        type="radio"
                        name={`quiz-${question.id}`}
                        className="sr-only"
                        checked={selected}
                        disabled={Boolean(row)}
                        onChange={() => setAnswers((prev) => ({ ...prev, [key]: optionIndex }))}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border",
                          row && isCorrect
                            ? "border-[var(--ok)] bg-[var(--ok)] text-[var(--canvas)]"
                            : row && isWrongPick
                              ? "border-[var(--bad)] bg-[var(--bad)] text-[var(--canvas)]"
                              : selected
                                ? "border-[var(--brand)] bg-[var(--brand)]"
                                : "border-[var(--edge-strong)]",
                        )}
                      >
                        {row && isCorrect ? (
                          <Check className="size-3" strokeWidth={3} />
                        ) : row && isWrongPick ? (
                          <X className="size-3" strokeWidth={3} />
                        ) : selected ? (
                          <span className="size-1.5 rounded-full bg-[var(--ink-on-brand)]" />
                        ) : null}
                      </span>
                      <span className="min-w-0 text-[14px] text-[var(--ink-2)]">{option}</span>
                    </label>
                  );
                })}
              </div>

              {row?.explanation_uz ? (
                <p className="mt-2.5 ml-7 text-[13px] leading-relaxed text-[var(--ink-3)]">
                  {row.explanation_uz}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[var(--edge)] pt-5">
        {result ? (
          <>
            <Chip tone={result.is_passed ? "ok" : "warn"} dot>
              <span className="t-num">
                {result.score}/{result.total}
              </span>{" "}
              · {result.percent}%
            </Chip>
            <Button
              size="sm"
              variant="quiet"
              icon={<RotateCcw className="size-3.5" />}
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
            >
              Qayta topshirish
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            icon={<Send className="size-4" />}
            loading={submit.isPending}
            disabled={!answeredAll}
            onClick={() => submit.mutate()}
          >
            Javoblarni tekshirish
          </Button>
        )}
        {!result && !answeredAll ? (
          <span className="t-meta text-[var(--ink-4)]">
            Barcha savolga javob bering ({Object.keys(answers).length}/{questions.length})
          </span>
        ) : null}
      </div>
    </Pane>
  );
}

/* ==========================================================================
   Topshiriq
   --------------------------------------------------------------------------
   Ikki tugma ataylab ajratilgan:
     «Ishga tushirish» — faqat OCHIQ testlar, natija saqlanmaydi;
     «Topshirish»      — barcha testlar, natija progressga yoziladi.
   Bu masalalar sahifasidagi bilan bir xil mantiq — o'quvchi ikkinchi joyda
   yangi qoidani o'rganishi shart emas.
   ========================================================================== */

export function ExerciseBlock({
  exercise,
  index,
  onSolved,
}: {
  exercise: CourseExercise;
  index: number;
  onSolved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [code, setCode] = useState(exercise.my_code || exercise.starter_code);
  const [result, setResult] = useState<ExerciseSubmitResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const solved = result?.is_solved ?? exercise.is_solved;
  const solution = result?.solution_code || exercise.solution_code;

  const handleError = (error: unknown) => {
    setResult(null);
    setFailure(error instanceof ApiError ? error.message : "Kodni bajarib bo'lmadi.");
  };

  const run = useMutation({
    mutationFn: () => publicApi.courses.runExercise(exercise.id, code),
    onSuccess: (data) => {
      // «Ishga tushirish» topshirish emas — natijani bir xil shaklda
      // ko'rsatish uchun yetishmagan maydonlar bo'sh qiymat bilan to'ldiriladi.
      setResult({
        ...data,
        attempt_id: "",
        is_solved: false,
        solution_code: "",
        lesson_completed: false,
        points: 0,
      });
      setFailure(null);
    },
    onError: handleError,
  });

  const submit = useMutation({
    mutationFn: () => publicApi.courses.submitExercise(exercise.id, code),
    onSuccess: (data) => {
      setResult(data);
      setFailure(null);
      if (data.is_solved) {
        toast.success("Topshiriq bajarildi", `+${data.points} ball`);
        onSolved();
      } else {
        toast.error(
          "Yechim to'liq emas",
          `${data.passed}/${data.total} test o'tdi — ${statusLabel(data.status)}`,
        );
      }
    },
    onError: handleError,
  });

  const busy = run.isPending || submit.isPending;

  return (
    <Pane tone="solid" inset="none" className="overflow-hidden">
      {/* ------------------------------------------------------ sarlavha */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div className="min-w-0">
          <p className="t-eyebrow mb-2.5 flex items-center gap-2">
            <Terminal className="size-3.5" />
            Topshiriq {index + 1}
          </p>
          <h3 className="t-section text-[var(--ink)]">{exercise.title_uz}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Chip tone="brand">
            <span className="t-num">{exercise.points}</span> ball
          </Chip>
          {solved ? (
            <Chip tone="ok" icon={<Check className="size-3.5" strokeWidth={3} />}>
              Bajarilgan
            </Chip>
          ) : null}
        </div>
      </div>

      <div className="px-6 pb-5">
        <Markdown source={exercise.prompt_md} className="text-[14px]" />
      </div>

      {/* -------------------------------------------------- namuna testlar */}
      {exercise.sample_tests.length ? (
        <div className="border-t border-[var(--edge)] bg-[var(--pane-sunken)] px-6 py-4">
          <p className="t-eyebrow mb-3">Namuna testlar</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {exercise.sample_tests.map((test, testIndex) => (
              <div
                key={testIndex}
                className="rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-solid)] p-3"
              >
                <p className="t-meta mb-1.5 text-[var(--ink-4)]">
                  Kirish {test.input ? "" : "(bo'sh)"}
                </p>
                <pre className="font-[var(--font-mono)] text-[12px] whitespace-pre-wrap text-[var(--ink-2)]">
                  {test.input || "—"}
                </pre>
                <p className="t-meta mt-3 mb-1.5 text-[var(--ink-4)]">Chiqish</p>
                <pre className="font-[var(--font-mono)] text-[12px] whitespace-pre-wrap text-[var(--ink-2)]">
                  {test.expected_output || "—"}
                </pre>
                {test.explanation_uz ? (
                  <p className="mt-2.5 text-[12.5px] text-[var(--ink-3)]">{test.explanation_uz}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------- muharrir */}
      <div className="flex flex-col gap-4 border-t border-[var(--edge)] p-6">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={exercise.language}
              height="20rem"
              expandable
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="quiet"
                icon={<Play className="size-3.5" />}
                loading={run.isPending}
                disabled={busy}
                onClick={() => run.mutate()}
              >
                Ishga tushirish
              </Button>
              {/* Topshirish natijani SAQLAYDI — bu yagona joyda hisob kerak.
                  Mehmonga tugmani o'chirib qo'yish o'rniga to'g'ridan-to'g'ri
                  kirish sahifasiga havola beriladi: bosish behuda ketmaydi. */}
              {user ? (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Send className="size-3.5" />}
                  loading={submit.isPending}
                  disabled={busy}
                  onClick={() => submit.mutate()}
                >
                  Topshirish
                </Button>
              ) : (
                <LinkButton
                  href="/login"
                  size="sm"
                  variant="primary"
                  icon={<Send className="size-3.5" />}
                >
                  Topshirish uchun kiring
                </LinkButton>
              )}
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw className="size-3.5" />}
                disabled={busy}
                onClick={() => {
                  setCode(exercise.starter_code);
                  setResult(null);
                  setFailure(null);
                }}
              >
                Boshidan
              </Button>

              <div className="ml-auto flex items-center gap-2">
                {exercise.hint_uz ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Lightbulb className="size-3.5" />}
                    onClick={() => setShowHint((value) => !value)}
                  >
                    Yordam
                  </Button>
                ) : null}
                {solved && solution ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSolution((value) => !value)}
                  >
                    {showSolution ? "Yechimni yashirish" : "Namuna yechim"}
                  </Button>
                ) : null}
              </div>
            </div>

            {showHint && exercise.hint_uz ? (
              <Alert tone="info" title="Yordam">
                <Markdown source={exercise.hint_uz} className="text-[13px]" />
              </Alert>
            ) : null}

            {failure ? <Alert tone="bad">{failure}</Alert> : null}

            {/* ----------------------------------------------- natijalar */}
            {result ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Chip tone={result.all_passed ? "ok" : "bad"} dot>
                    {statusLabel(result.status)}
                  </Chip>
                  {result.total ? (
                    <Meter
                      className="min-w-40 flex-1"
                      value={result.passed}
                      max={result.total}
                      tone={result.all_passed ? "ok" : "bad"}
                      label={
                        <>
                          <span className="t-num">
                            {result.passed}/{result.total}
                          </span>{" "}
                          test o&apos;tdi
                        </>
                      }
                    />
                  ) : null}
                </div>

                {result.results.map((row) => (
                  <div
                    key={row.order}
                    className={cn(
                      "rounded-[var(--r-field)] border px-3.5 py-3",
                      row.status === "ACCEPTED"
                        ? "border-[color-mix(in_oklab,var(--ok)_28%,transparent)] bg-[var(--ok-wash)]"
                        : "border-[color-mix(in_oklab,var(--bad)_28%,transparent)] bg-[var(--bad-wash)]",
                    )}
                  >
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
                      {row.status === "ACCEPTED" ? (
                        <Check className="size-3.5 text-[var(--ok)]" strokeWidth={3} />
                      ) : (
                        <X className="size-3.5 text-[var(--bad)]" strokeWidth={3} />
                      )}
                      Test {row.order}
                      {row.is_hidden ? (
                        <span className="t-meta font-normal text-[var(--ink-4)]">(yopiq)</span>
                      ) : null}
                      <span className="t-num ml-auto font-normal text-[var(--ink-4)]">
                        {row.runtime_ms ? `${row.runtime_ms} ms` : ""}
                      </span>
                    </p>

                    {!row.is_hidden && row.status !== "ACCEPTED" ? (
                      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="t-meta mb-1 text-[var(--ink-4)]">Kutilgan</p>
                          <pre className="font-[var(--font-mono)] text-[12px] whitespace-pre-wrap text-[var(--ink-2)]">
                            {row.expected_output || "—"}
                          </pre>
                        </div>
                        <div>
                          <p className="t-meta mb-1 text-[var(--ink-4)]">Sizniki</p>
                          <pre className="font-[var(--font-mono)] text-[12px] whitespace-pre-wrap text-[var(--ink-2)]">
                            {row.stdout || "—"}
                          </pre>
                        </div>
                      </div>
                    ) : null}

                    {row.compile_output || row.stderr ? (
                      <pre className="mt-2.5 max-h-40 overflow-auto font-[var(--font-mono)] text-[12px] whitespace-pre-wrap text-[var(--bad)]">
                        {row.compile_output || row.stderr}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {showSolution && solution ? (
              <div>
                <p className="t-eyebrow mb-2">Namuna yechim</p>
                <CodeEditor
                  value={solution}
                  language={exercise.language}
                  readOnly
                  height="14rem"
                />
              </div>
            ) : null}

            {!user ? <ProgressNote what="Topshiriqni" /> : null}
      </div>
    </Pane>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FlaskConical,
  Plus,
  Puzzle,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/providers";
import { Alert } from "@/components/kit";
import { Badge, PublishBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Checkbox,
  Field,
  Input,
  SegmentedControl,
  Select,
  Switch,
  Textarea,
} from "@/components/ui/field";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultiSelect } from "@/components/ui/misc";
import { RichEditor } from "@/components/ui/rich-editor";
import { api } from "@/lib/api";
import type { Difficulty, ProblemDetail, PublishState, Tag, TestCase } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

export interface ProblemFormValue {
  title_uz: string;
  slug: string;
  difficulty: Difficulty;
  points: number;
  status: PublishState;
  description_uz: string;
  constraints_uz: string;
  hint_uz: string;
  editorial_uz: string;
  tag_ids: (string | number)[];
  starter_code_python: string;
  starter_code_javascript: string;
  starter_code_cpp: string;
  solution_code_python: string;
  time_limit_ms: number;
  memory_limit_kb: number;
  is_premium: boolean;
  is_contest_only: boolean;
  cover_image_url: string;
  publish_at: string | null;
  test_cases: TestCase[];
}

export const emptyProblem: ProblemFormValue = {
  title_uz: "",
  slug: "",
  difficulty: "easy",
  points: 10,
  status: "draft",
  description_uz: "",
  constraints_uz: "",
  hint_uz: "",
  editorial_uz: "",
  tag_ids: [],
  starter_code_python:
    "def solve(nums: list[int], target: int) -> list[int]:\n    # kodingizni shu yerga yozing\n    pass\n",
  starter_code_javascript:
    "function solve(nums, target) {\n    // kodingizni shu yerga yozing\n}\n",
  starter_code_cpp:
    "vector<int> solve(vector<int>& nums, int target) {\n    // kodingizni shu yerga yozing\n}\n",
  solution_code_python: "",
  time_limit_ms: 2000,
  memory_limit_kb: 262144,
  is_premium: false,
  is_contest_only: false,
  cover_image_url: "",
  publish_at: null,
  test_cases: [],
};

export function fromDetail(detail: ProblemDetail): ProblemFormValue {
  return {
    title_uz: detail.title_uz,
    slug: detail.slug,
    difficulty: detail.difficulty,
    points: detail.points,
    status: detail.status,
    description_uz: detail.description_uz,
    constraints_uz: detail.constraints_uz,
    hint_uz: detail.hint_uz,
    editorial_uz: detail.editorial_uz,
    tag_ids: detail.tags.map((tag) => tag.id),
    starter_code_python: detail.starter_code_python,
    starter_code_javascript: detail.starter_code_javascript,
    starter_code_cpp: detail.starter_code_cpp,
    solution_code_python: detail.solution_code_python,
    time_limit_ms: detail.time_limit_ms,
    memory_limit_kb: detail.memory_limit_kb,
    is_premium: detail.is_premium,
    is_contest_only: detail.is_contest_only,
    cover_image_url: detail.cover_image_url ?? "",
    publish_at: detail.publish_at ? detail.publish_at.slice(0, 16) : null,
    test_cases: detail.test_cases ?? [],
  };
}

const DEFAULT_POINTS: Record<Difficulty, number> = { easy: 10, medium: 30, hard: 50 };

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

type StepKey = "basic" | "code" | "tests" | "publish";

export function ProblemForm({
  value,
  onChange,
  errors,
  sideExtra,
}: {
  value: ProblemFormValue;
  onChange: (next: ProblemFormValue) => void;
  errors?: Record<string, string>;
  /** Chap panel pastiga qo'shimcha tugmalar (Statistika, Ko'rish...). */
  sideExtra?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<StepKey>("basic");
  const [codeLang, setCodeLang] = useState<"python" | "javascript" | "cpp">("python");
  const [slugTouched, setSlugTouched] = useState(Boolean(value.slug));
  const [openTest, setOpenTest] = useState<number | null>(0);

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<Tag[]>("/admin/tags/"),
  });

  const set = <K extends keyof ProblemFormValue>(key: K, next: ProblemFormValue[K]) =>
    onChange({ ...value, [key]: next });

  useEffect(() => {
    if (slugTouched) return;
    if (value.title_uz) onChange({ ...value, slug: slugify(value.title_uz) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.title_uz, slugTouched]);

  const sampleCount = useMemo(
    () => value.test_cases.filter((tc) => tc.is_sample).length,
    [value.test_cases],
  );

  const checks = {
    title: Boolean(value.title_uz.trim()),
    description: Boolean(value.description_uz.trim()),
    starter: Boolean(
      value.starter_code_python || value.starter_code_javascript || value.starter_code_cpp,
    ),
    tests: value.test_cases.length > 0,
    sample: sampleCount > 0,
    tags: value.tag_ids.length > 0,
  };

  const steps: {
    key: StepKey;
    title: string;
    description: string;
    done: boolean;
  }[] = [
    {
      key: "basic",
      title: "Asosiy ma'lumot",
      description: "Sarlavha, tavsif va teglar",
      done: checks.title && checks.description && checks.tags,
    },
    {
      key: "code",
      title: "Kod shablonlari",
      description: "Python, JavaScript, C++",
      done: checks.starter,
    },
    {
      key: "tests",
      title: "Test-case'lar",
      description: `${value.test_cases.length} test · ${sampleCount} namuna`,
      done: checks.tests && checks.sample,
    },
    {
      key: "publish",
      title: "Ko'rib chiqish va nashr",
      description: "Limitlar, holat, tekshiruv",
      done: value.status === "published",
    },
  ];

  const stepIndex = steps.findIndex((item) => item.key === step);

  // Yopishqoq paneldagi holat uchun: xatolar va bajarilgan qadamlar
  const errorList = Object.values(errors ?? {}).filter(Boolean);
  const doneCount = steps.filter((item) => item.done).length;

  // ------------------------------------------------------------- testlar
  const addTestCase = (isSample: boolean) => {
    const next: TestCase = {
      order: value.test_cases.length,
      input: "",
      expected_output: "",
      is_sample: isSample,
      explanation_uz: "",
      time_limit_ms: null,
      memory_limit_kb: null,
    };
    onChange({ ...value, test_cases: [...value.test_cases, next] });
    setOpenTest(value.test_cases.length);
  };

  const updateTestCase = (index: number, patch: Partial<TestCase>) =>
    onChange({
      ...value,
      test_cases: value.test_cases.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });

  const removeTestCase = (index: number) => {
    onChange({
      ...value,
      test_cases: value.test_cases
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, order: i })),
    });
    setOpenTest(null);
  };

  const moveTestCase = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.test_cases.length) return;
    const rows = [...value.test_cases];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    onChange({ ...value, test_cases: rows.map((row, i) => ({ ...row, order: i })) });
    setOpenTest(target);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 lg:grid-cols-[18rem_1fr]">
        {/* ================================================== chap panel */}
        {/* Och ko'k band — ichida oq kartalar (karta ichida karta emas) */}
        <div className="pane flex flex-col gap-4 rounded-[var(--r-pane-lg)] p-4 lg:sticky lg:top-[calc(var(--bar)+1.25rem)]">
          {/* Qisqacha ko'rinish */}
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
                  <Puzzle className="size-5" />
                </span>
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--ink)]">
                  {value.title_uz || "Yangi masala"}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <PublishBadge value={value.status} />
                <Badge tone="outline">{DIFFICULTY_LABEL[value.difficulty]}</Badge>
                <Badge tone="outline" className="t-num">
                  {value.points} ball
                </Badge>
              </div>
              <p className="t-num mt-2.5 text-[11.5px] text-[var(--ink-4)]">
                {value.test_cases.length} test · {sampleCount} namuna · {value.tag_ids.length} teg
              </p>
            </CardBody>
          </Card>

          {/* Qadamlar */}
          <Card className="p-1.5">
            {steps.map((item, index) => {
              const isActive = item.key === step;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStep(item.key)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "focus-ring flex w-full items-start gap-3 rounded-[var(--r-ctl)] px-3 py-2.5 text-left",
                    "transition-colors duration-[var(--t-fast)]",
                    isActive ? "bg-[var(--brand-wash)]" : "hover:bg-[var(--pane-hover)]",
                  )}
                >
                  <span
                    className={cn(
                      "t-num mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      "transition-colors duration-[var(--t-fast)]",
                      item.done || isActive
                        ? "bg-[var(--brand)] text-[var(--ink-on-brand)]"
                        : "border border-[var(--edge-strong)] text-[var(--ink-4)]",
                    )}
                  >
                    {item.done && !isActive ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-[13px] font-semibold",
                        isActive ? "text-[var(--brand-ink)]" : "text-[var(--ink)]",
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--ink-4)]">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </Card>

          {sideExtra}
        </div>

        {/* ================================================= asosiy kontent */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Forma darajasidagi xatolar */}
          {errorList.length ? (
            <Alert tone="bad" title="Formada xatolar bor">
              <ul className="list-disc space-y-0.5 pl-4">
                {errorList.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {/* ------------------------------------------------ 1. Asosiy */}
          {step === "basic" ? (
            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader
                  title="Asosiy ma'lumot"
                  description="Sarlavha, URL va Markdown tavsif"
                />
                <CardBody className="flex flex-col gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t.problems.titleUz} required error={errors?.title_uz}>
                      <Input
                        value={value.title_uz}
                        invalid={Boolean(errors?.title_uz)}
                        onChange={(event) => set("title_uz", event.target.value)}
                        placeholder="Ikki sonning yig'indisi"
                      />
                    </Field>
                    <Field label={t.problems.slug} error={errors?.slug}>
                      <Input
                        value={value.slug}
                        invalid={Boolean(errors?.slug)}
                        onChange={(event) => {
                          setSlugTouched(true);
                          set("slug", event.target.value);
                        }}
                        className="font-mono"
                        placeholder="two-sum"
                      />
                    </Field>
                  </div>

                  <Field
                    label={`${t.problems.description} (Markdown)`}
                    required
                    error={errors?.description_uz}
                  >
                    <RichEditor
                      value={value.description_uz}
                      onChange={(next) => set("description_uz", next)}
                      minRows={10}
                      placeholder={"### Masala\n\nSizga massiv beriladi...\n\n**Kirish:** ...\n**Chiqish:** ..."}
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t.problems.constraints}>
                      <Textarea
                        rows={4}
                        className="font-mono text-[13px]"
                        value={value.constraints_uz}
                        onChange={(event) => set("constraints_uz", event.target.value)}
                        placeholder={"- `1 <= n <= 10^5`"}
                      />
                    </Field>
                    <Field label={t.problems.hint}>
                      <Textarea
                        rows={4}
                        value={value.hint_uz}
                        onChange={(event) => set("hint_uz", event.target.value)}
                      />
                    </Field>
                  </div>

                  <Field
                    label={t.problems.editorial}
                    hint="Yechim tahlili — masala yopilgach ko'rsatiladi."
                  >
                    <RichEditor
                      value={value.editorial_uz}
                      onChange={(next) => set("editorial_uz", next)}
                      minRows={6}
                    />
                  </Field>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Turkumlash" description="Qiyinlik, ball va teglar" />
                <CardBody className="grid gap-5 sm:grid-cols-2">
                  <Field label={t.problems.difficulty}>
                    <Select
                      value={value.difficulty}
                      onChange={(event) => {
                        const difficulty = event.target.value as Difficulty;
                        onChange({ ...value, difficulty, points: DEFAULT_POINTS[difficulty] });
                      }}
                      options={[
                        { value: "easy", label: `${t.problems.easy} (10 ball)` },
                        { value: "medium", label: `${t.problems.medium} (30 ball)` },
                        { value: "hard", label: `${t.problems.hard} (50 ball)` },
                      ]}
                    />
                  </Field>
                  <Field label={t.problems.points} hint="7-bo'lim: amaliyot ballari">
                    <Input
                      type="number"
                      value={value.points}
                      onChange={(event) => set("points", Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Muqova rasmi" className="sm:col-span-2">
                    <ImageUpload
                      value={value.cover_image_url}
                      onChange={(url) => set("cover_image_url", url)}
                      kind="cover"
                      aspect="aspect-[21/9]"
                    />
                  </Field>
                  <Field label={t.problems.tags}>
                    <MultiSelect
                      options={tags ?? []}
                      value={value.tag_ids}
                      onChange={(next) => set("tag_ids", next)}
                      labelOf={(tag) => tag.name_uz}
                      colorOf={(tag) => tag.color}
                      placeholder="Teg tanlang..."
                    />
                  </Field>
                </CardBody>
              </Card>
            </div>
          ) : null}

          {/* --------------------------------------------------- 2. Kod */}
          {step === "code" ? (
            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader
                  title={t.problems.starterCode}
                  description="Har bir til uchun shablon qo'lda kiritiladi (10-bo'lim)."
                  action={
                    <SegmentedControl
                      size="sm"
                      value={codeLang}
                      onChange={(next) => setCodeLang(next as "python" | "javascript" | "cpp")}
                      options={[
                        { value: "python", label: "Python" },
                        { value: "javascript", label: "JavaScript" },
                        { value: "cpp", label: "C++" },
                      ]}
                      ariaLabel="Kod tili"
                    />
                  }
                />
                <CardBody>
                  <CodeEditor
                    language={codeLang}
                    height="21rem"
                    value={
                      codeLang === "python"
                        ? value.starter_code_python
                        : codeLang === "javascript"
                          ? value.starter_code_javascript
                          : value.starter_code_cpp
                    }
                    onChange={(next) =>
                      set(
                        codeLang === "python"
                          ? "starter_code_python"
                          : codeLang === "javascript"
                            ? "starter_code_javascript"
                            : "starter_code_cpp",
                        next,
                      )
                    }
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title={t.problems.solutionCode}
                  description="Faqat ichki foydalanish uchun — foydalanuvchiga ko'rinmaydi."
                />
                <CardBody>
                  <CodeEditor
                    language="python"
                    height="15rem"
                    value={value.solution_code_python}
                    onChange={(next) => set("solution_code_python", next)}
                  />
                </CardBody>
              </Card>
            </div>
          ) : null}

          {/* ------------------------------------------------ 3. Testlar */}
          {step === "tests" ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader
                  title={t.problems.testCases}
                  description={`${value.test_cases.length} test · ${sampleCount} namuna. Namuna testlar foydalanuvchiga ochiq (8-bo'lim).`}
                  action={
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Eye className="size-3.5" />}
                        onClick={() => addTestCase(true)}
                      >
                        Namuna test
                      </Button>
                      <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => addTestCase(false)}>
                        Yashirin test
                      </Button>
                    </div>
                  }
                />

                {value.test_cases.length === 0 ? (
                  <EmptyState
                    icon={<FlaskConical className="size-5" />}
                    title={t.problems.noTestCases}
                    description="Kamida bitta namuna va bir nechta yashirin test qo'shing."
                    action={
                      <Button size="sm" icon={<Plus className="size-4" />} onClick={() => addTestCase(true)}>
                        {t.problems.addTestCase}
                      </Button>
                    }
                  />
                ) : (
                  // Takrorlanuvchi qatorlar — alohida kartalar emas, chiziq bilan ajraladi
                  <div className="divide-y divide-[var(--edge-soft)]">
                    {value.test_cases.map((testCase, index) => {
                      const isOpen = openTest === index;
                      return (
                        <div key={index} className={cn(isOpen && "edge-brand")}>
                          <div className="flex items-center gap-2.5 px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => setOpenTest(isOpen ? null : index)}
                              aria-expanded={isOpen}
                              className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--r-ctl)] py-1 text-left"
                            >
                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-[var(--ink-4)]",
                                  "transition-transform duration-[var(--t-base)] ease-[var(--ease-snap)]",
                                  !isOpen && "-rotate-90",
                                )}
                              />
                              <span className="t-num flex size-8 shrink-0 items-center justify-center rounded-[var(--r-ctl)] bg-[var(--brand-wash)] font-mono text-[11px] font-bold text-[var(--brand-ink)]">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                                    {testCase.is_sample ? "Namuna test" : "Yashirin test"}
                                  </span>
                                  {testCase.is_sample ? (
                                    <Badge tone="accent">ochiq</Badge>
                                  ) : (
                                    <Badge tone="neutral">yashirin</Badge>
                                  )}
                                </span>
                                <span className="block max-w-md truncate font-mono text-[11px] text-[var(--ink-4)]">
                                  {testCase.input.split("\n")[0]?.slice(0, 48) || "kirish —"} →{" "}
                                  {testCase.expected_output.split("\n")[0]?.slice(0, 24) || "—"}
                                </span>
                              </span>
                            </button>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="iconSm"
                                onClick={() => moveTestCase(index, -1)}
                                disabled={index === 0}
                                aria-label="Yuqoriga"
                              >
                                <ChevronUp className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="iconSm"
                                onClick={() => moveTestCase(index, 1)}
                                disabled={index === value.test_cases.length - 1}
                                aria-label="Pastga"
                              >
                                <ChevronDown className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="iconSm"
                                onClick={() => removeTestCase(index)}
                                className="text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
                                aria-label={t.common.delete}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          {isOpen ? (
                            <div className="border-t border-[var(--edge)] px-4 py-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t.problems.input}>
                                  <Textarea
                                    rows={5}
                                    className="font-mono text-[12.5px]"
                                    value={testCase.input}
                                    onChange={(event) => updateTestCase(index, { input: event.target.value })}
                                  />
                                </Field>
                                <Field label={t.problems.expectedOutput}>
                                  <Textarea
                                    rows={5}
                                    className="font-mono text-[12.5px]"
                                    value={testCase.expected_output}
                                    onChange={(event) =>
                                      updateTestCase(index, { expected_output: event.target.value })
                                    }
                                  />
                                </Field>
                              </div>
                              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <Field label={`${t.problems.timeLimit} (${t.common.optional})`}>
                                  <Input
                                    type="number"
                                    value={testCase.time_limit_ms ?? ""}
                                    onChange={(event) =>
                                      updateTestCase(index, {
                                        time_limit_ms: event.target.value ? Number(event.target.value) : null,
                                      })
                                    }
                                    placeholder={String(value.time_limit_ms)}
                                  />
                                </Field>
                                <Field label={`${t.problems.memoryLimit} (${t.common.optional})`}>
                                  <Input
                                    type="number"
                                    value={testCase.memory_limit_kb ?? ""}
                                    onChange={(event) =>
                                      updateTestCase(index, {
                                        memory_limit_kb: event.target.value ? Number(event.target.value) : null,
                                      })
                                    }
                                    placeholder={String(value.memory_limit_kb)}
                                  />
                                </Field>
                              </div>
                              {testCase.is_sample ? (
                                <Field
                                  label={t.problems.explanation}
                                  className="mt-4"
                                  hint="Faqat namuna testlar uchun foydalanuvchiga ko'rsatiladi."
                                >
                                  <Textarea
                                    rows={2}
                                    value={testCase.explanation_uz}
                                    onChange={(event) =>
                                      updateTestCase(
                                        index,
                                        { explanation_uz: event.target.value },
                                      )
                                    }
                                  />
                                </Field>
                              ) : null}
                              <div className="mt-4">
                                <Checkbox
                                  checked={testCase.is_sample}
                                  onChange={(event) =>
                                    updateTestCase(index, { is_sample: event.target.checked })
                                  }
                                  label={t.problems.sampleTest}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <button
                type="button"
                onClick={() => addTestCase(false)}
                className={cn(
                  "focus-ring flex w-full items-center justify-center gap-2 rounded-[var(--r-pane)]",
                  "border border-dashed border-[var(--edge-strong)] bg-[var(--pane-sunken)] py-3.5",
                  "text-[13px] font-medium text-[var(--ink-3)]",
                  "transition-colors duration-[var(--t-fast)]",
                  "hover:border-[var(--brand-edge)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-ink)]",
                )}
              >
                <Plus className="size-4" />
                {t.problems.addTestCase}
              </button>
            </div>
          ) : null}

          {/* -------------------------------------------------- 4. Nashr */}
          {step === "publish" ? (
            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader title="Nashr sozlamalari" description="Holat, jadval va limitlar" />
                <CardBody className="grid gap-5 sm:grid-cols-2">
                  <Field label={t.common.status}>
                    <Select
                      value={value.status}
                      onChange={(event) => set("status", event.target.value as PublishState)}
                      options={[
                        { value: "draft", label: t.problems.draft },
                        { value: "published", label: t.problems.published },
                        { value: "archived", label: t.problems.archived },
                      ]}
                    />
                  </Field>
                  <Field
                    label="Rejalashtirilgan nashr"
                    hint="Belgilangan vaqtda avtomatik chop etiladi (qoralama bo'lsa)"
                  >
                    <Input
                      type="datetime-local"
                      value={value.publish_at ?? ""}
                      onChange={(event) => set("publish_at", event.target.value || null)}
                    />
                  </Field>
                  <Field label={t.problems.timeLimit} hint="Tavsiya: 2000–5000 ms">
                    <Input
                      type="number"
                      value={value.time_limit_ms}
                      onChange={(event) => set("time_limit_ms", Number(event.target.value))}
                    />
                  </Field>
                  <Field label={t.problems.memoryLimit} hint="262144 KB = 256 MB">
                    <Input
                      type="number"
                      value={value.memory_limit_kb}
                      onChange={(event) => set("memory_limit_kb", Number(event.target.value))}
                    />
                  </Field>
                </CardBody>
                <CardBody className="flex flex-col gap-5 border-t border-[var(--edge)]">
                  <Switch
                    checked={value.is_premium}
                    onChange={(next) => set("is_premium", next)}
                    label={t.problems.isPremium}
                    description="Faqat premium foydalanuvchilar uchun"
                  />
                  <Switch
                    checked={value.is_contest_only}
                    onChange={(next) => set("is_contest_only", next)}
                    label={t.problems.isContestOnly}
                    description="Contest tugagunga qadar ommaviy ro'yxatda ko'rinmaydi (11-bo'lim)"
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Tekshiruv ro'yxati" description="Chop etishdan oldin tekshiring" />
                <CardBody className="grid gap-2.5 sm:grid-cols-2">
                  {[
                    { ok: checks.title, label: "Sarlavha (uz)" },
                    { ok: checks.description, label: "Tavsif (uz)" },
                    { ok: checks.tests, label: "Kamida 1 ta test" },
                    { ok: checks.sample, label: "Kamida 1 ta namuna test" },
                    { ok: checks.starter, label: "Starter kod" },
                    { ok: checks.tags, label: "Kamida 1 ta teg" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 text-[13px]">
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full",
                          item.ok
                            ? "bg-[var(--ok-wash)] text-[var(--ok)]"
                            : "border border-[var(--edge-strong)] text-[var(--ink-4)]",
                        )}
                      >
                        {item.ok ? <Check className="size-3" /> : null}
                      </span>
                      <span className={item.ok ? "text-[var(--ink)]" : "text-[var(--ink-4)]"}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      {/* -------------------- Yopishqoq amal paneli: holat + Oldingi/Keyingi */}
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] pane-solid px-4 py-3 shadow-[var(--lift-3)]">
        <div className="flex min-w-0 items-center gap-2.5">
          {errorList.length ? (
            <Badge tone="danger" className="t-num">
              {errorList.length} ta xato
            </Badge>
          ) : (
            <Badge tone={doneCount === steps.length ? "success" : "neutral"} className="t-num">
              {doneCount}/{steps.length} qadam tayyor
            </Badge>
          )}
          <span className="t-meta truncate text-[var(--ink-3)]">{steps[stepIndex].title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            icon={<ArrowLeft className="size-4" />}
            disabled={stepIndex === 0}
            onClick={() => setStep(steps[stepIndex - 1].key)}
          >
            Oldingi
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button size="md" onClick={() => setStep(steps[stepIndex + 1].key)}>
              Keyingi
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

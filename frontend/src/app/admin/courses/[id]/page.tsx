"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FlaskConical,
  GripVertical,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { Alert, Block, Chip, Segmented } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { Badge, PublishBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api, resource } from "@/lib/api";
import type {
  AdminCourse,
  AdminCourseExample,
  AdminCourseExercise,
  AdminCourseExerciseTest,
  AdminCourseLessonDetail,
  AdminCourseQuizQuestion,
  AdminCourseTree,
  CourseLanguage,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const courses = resource<AdminCourse>("courses");
const modulesApi = resource<AdminCourseTree["modules"][number]>("course-modules");
const lessonsApi = resource<AdminCourseLessonDetail>("course-lessons");
const examplesApi = resource<AdminCourseExample>("course-examples");
const quizApi = resource<AdminCourseQuizQuestion>("course-quiz");
const exercisesApi = resource<AdminCourseExercise>("course-exercises");

type Tab = "content" | "examples" | "quiz" | "exercises";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

/* ==========================================================================
   Chap ustun — kurs daraxti
   ========================================================================== */

function CourseTree({
  tree,
  selected,
  onSelect,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onAddLesson,
}: {
  tree: AdminCourseTree;
  selected: string | null;
  onSelect: (id: string) => void;
  onAddModule: () => void;
  onEditModule: (module: AdminCourseTree["modules"][number]) => void;
  onDeleteModule: (module: AdminCourseTree["modules"][number]) => void;
  onAddLesson: (moduleId: string) => void;
}) {
  return (
    <div className="pane overflow-hidden rounded-[var(--r-pane)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <p className="t-eyebrow flex items-center gap-2">
          <Layers className="size-3.5" />
          Tuzilma
        </p>
        <Button size="xs" variant="outline" icon={<Plus className="size-3.5" />} onClick={onAddModule}>
          Bo&apos;lim
        </Button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto border-t border-[var(--edge)]">
        {tree.modules.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-[var(--ink-4)]">
            Hali bo&apos;lim yo&apos;q. Birinchi bo&apos;limni qo&apos;shing.
          </p>
        ) : (
          tree.modules.map((module, index) => (
            <div key={module.id} className="border-b border-[var(--edge-soft)] last:border-b-0">
              <div className="group flex items-start gap-2 bg-[var(--pane-sunken)] px-4 py-2.5">
                <span className="t-num mt-0.5 shrink-0 text-[11px] font-semibold text-[var(--ink-4)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--ink)]">
                    {module.title_uz}
                  </p>
                  <p className="t-num truncate text-[11px] text-[var(--ink-4)]">
                    {module.lessons.length} mavzu
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="iconSm"
                    title="Bo'limni tahrirlash"
                    aria-label="Bo'limni tahrirlash"
                    onClick={() => onEditModule(module)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    title="Mavzu qo'shish"
                    aria-label="Mavzu qo'shish"
                    onClick={() => onAddLesson(module.id)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    title="Bo'limni o'chirish"
                    aria-label="Bo'limni o'chirish"
                    className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
                    onClick={() => onDeleteModule(module)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>

              {module.lessons.map((lesson) => {
                const active = lesson.id === selected;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onSelect(lesson.id)}
                    className={cn(
                      "focus-ring flex w-full items-center gap-2 px-4 py-2 text-left",
                      "transition-colors duration-[var(--t-fast)]",
                      active
                        ? "bg-[var(--brand-wash)] text-[var(--brand-ink)]"
                        : "text-[var(--ink-2)] hover:bg-[var(--pane-hover)]",
                    )}
                  >
                    <GripVertical className="size-3 shrink-0 text-[var(--ink-4)]" />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[12.5px]",
                        active && "font-semibold",
                      )}
                    >
                      {lesson.title_uz}
                    </span>
                    {lesson.status !== "published" ? (
                      <span className="t-meta shrink-0 text-[10px] text-[var(--warn)]">
                        qoralama
                      </span>
                    ) : null}
                    <span className="t-num shrink-0 text-[10.5px] text-[var(--ink-4)]">
                      {lesson.exercise_count}·{lesson.quiz_count}
                    </span>
                  </button>
                );
              })}

              {module.lessons.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onAddLesson(module.id)}
                  className="focus-ring w-full px-4 py-2.5 text-left text-[12px] text-[var(--ink-4)] hover:bg-[var(--pane-hover)]"
                >
                  + Birinchi mavzuni qo&apos;shish
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Misol formasi
   ========================================================================== */

type ExampleDraft = Omit<AdminCourseExample, "id"> & { id?: number };

function ExampleModal({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  draft: ExampleDraft | null;
  onChange: (next: ExampleDraft) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft?.id ? "Misolni tahrirlash" : "Yangi misol"}
      description="Kod va uning kutilgan chiqishi. Chiqish qo'lda yoziladi — sahifa ochilishida kod bajarilmaydi."
      size="xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button size="sm" loading={saving} disabled={!draft?.code.trim()} onClick={onSave}>
            Saqlash
          </Button>
        </>
      }
    >
      {draft ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Field label="Sarlavha" hint="Bo'sh qoldirilsa «Misol» deb chiqadi">
              <Input
                value={draft.title_uz}
                onChange={(event) => onChange({ ...draft, title_uz: event.target.value })}
              />
            </Field>
            <Field label="Til">
              <Select
                value={draft.language}
                onChange={(event) =>
                  onChange({ ...draft, language: event.target.value as CourseLanguage })
                }
                options={[
                  { value: "python", label: "Python" },
                  { value: "javascript", label: "JavaScript" },
                  { value: "cpp", label: "C++" },
                ]}
              />
            </Field>
          </div>

          <Field label="Kod" required>
            <CodeEditor
              value={draft.code}
              onChange={(value) => onChange({ ...draft, code: value })}
              language={draft.language}
              height="18rem"
              expandable
            />
          </Field>

          <Field label="Kutilgan chiqish">
            <Textarea
              rows={4}
              className="font-[var(--font-mono)] text-[12.5px]"
              value={draft.expected_output}
              onChange={(event) => onChange({ ...draft, expected_output: event.target.value })}
            />
          </Field>

          <Field label="Izoh" hint="Markdown — misol ostida chiqadi">
            <Textarea
              rows={3}
              value={draft.explanation_uz}
              onChange={(event) => onChange({ ...draft, explanation_uz: event.target.value })}
            />
          </Field>

          <Switch
            checked={draft.is_runnable}
            onChange={(next) => onChange({ ...draft, is_runnable: next })}
            label="«Sinab ko'rish» tugmasi"
            description="O'quvchi kodni o'zgartirib ishga tushira oladi"
          />
        </div>
      ) : null}
    </Modal>
  );
}

/* ==========================================================================
   Test savoli formasi
   ========================================================================== */

type QuizDraft = Omit<AdminCourseQuizQuestion, "id"> & { id?: number };

function QuizModal({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  draft: QuizDraft | null;
  onChange: (next: QuizDraft) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const valid =
    draft !== null &&
    draft.question_uz.trim().length > 0 &&
    draft.options.filter((option) => option.trim()).length >= 2;

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft?.id ? "Savolni tahrirlash" : "Yangi savol"}
      description="To'g'ri javob o'quvchiga faqat test topshirilgandan keyin ko'rinadi."
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button size="sm" loading={saving} disabled={!valid} onClick={onSave}>
            Saqlash
          </Button>
        </>
      }
    >
      {draft ? (
        <div className="flex flex-col gap-5">
          <Field label="Savol" required>
            <Textarea
              rows={2}
              autoFocus
              value={draft.question_uz}
              onChange={(event) => onChange({ ...draft, question_uz: event.target.value })}
            />
          </Field>

          <div>
            <p className="t-eyebrow mb-2.5">Variantlar — to&apos;g&apos;risini belgilang</p>
            <div className="flex flex-col gap-2">
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`${index + 1}-variantni to'g'ri deb belgilash`}
                    onClick={() => onChange({ ...draft, correct_index: index })}
                    className={cn(
                      "focus-ring grid size-8 shrink-0 place-items-center rounded-full border",
                      draft.correct_index === index
                        ? "border-[var(--ok)] bg-[var(--ok)] text-[var(--canvas)]"
                        : "border-[var(--edge-strong)] text-[var(--ink-4)] hover:border-[var(--ok)]",
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </button>
                  <Input
                    value={option}
                    placeholder={`${index + 1}-variant`}
                    onChange={(event) => {
                      const options = [...draft.options];
                      options[index] = event.target.value;
                      onChange({ ...draft, options });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="iconSm"
                    title="Variantni o'chirish"
                    aria-label="Variantni o'chirish"
                    disabled={draft.options.length <= 2}
                    onClick={() => {
                      const options = draft.options.filter((_, i) => i !== index);
                      onChange({
                        ...draft,
                        options,
                        correct_index: Math.min(draft.correct_index, options.length - 1),
                      });
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="xs"
              className="mt-3"
              icon={<Plus className="size-3.5" />}
              onClick={() => onChange({ ...draft, options: [...draft.options, ""] })}
            >
              Variant qo&apos;shish
            </Button>
          </div>

          <Field label="Izoh" hint="Javobdan keyin ko'rinadi — nima uchun aynan shunday">
            <Textarea
              rows={2}
              value={draft.explanation_uz}
              onChange={(event) => onChange({ ...draft, explanation_uz: event.target.value })}
            />
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}

/* ==========================================================================
   Topshiriq formasi — testlari bilan birga
   ========================================================================== */

type ExerciseDraft = Omit<AdminCourseExercise, "id"> & { id?: string };

function ExerciseModal({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  draft: ExerciseDraft | null;
  onChange: (next: ExerciseDraft) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [tab, setTab] = useState<"task" | "code" | "tests">("task");

  // Oyna har safar «Shart» tabidan ochilsin — avvalgi tahrirdan qolgan
  // «Testlar» tabi yangi topshiriqda chalkashtiradi.
  const open = draft !== null;
  useEffect(() => {
    if (open) setTab("task");
  }, [open]);

  const setTest = (index: number, patch: Partial<AdminCourseExerciseTest>) => {
    if (!draft) return;
    const tests = draft.tests.map((test, i) => (i === index ? { ...test, ...patch } : test));
    onChange({ ...draft, tests });
  };

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft?.id ? "Topshiriqni tahrirlash" : "Yangi topshiriq"}
      size="xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            size="sm"
            loading={saving}
            disabled={!draft?.title_uz.trim() || !draft?.prompt_md.trim()}
            onClick={onSave}
          >
            Saqlash
          </Button>
        </>
      }
    >
      {draft ? (
        <div className="flex flex-col gap-5">
          <Segmented
            value={tab}
            onChange={setTab}
            items={[
              { value: "task", label: "Shart" },
              { value: "code", label: "Kod" },
              { value: "tests", label: "Testlar", count: draft.tests.length },
            ]}
          />

          {tab === "task" ? (
            <div className="flex flex-col gap-4">
              <Field label="Sarlavha" required>
                <Input
                  autoFocus
                  value={draft.title_uz}
                  onChange={(event) => onChange({ ...draft, title_uz: event.target.value })}
                />
              </Field>
              <Field label="Shart" required hint="Markdown — kirish/chiqish namunasini ham shu yerda yozing">
                <Textarea
                  rows={8}
                  value={draft.prompt_md}
                  onChange={(event) => onChange({ ...draft, prompt_md: event.target.value })}
                />
              </Field>
              <Field label="Yordam" hint="O'quvchi «Yordam» tugmasini bosganda ochiladi">
                <Textarea
                  rows={2}
                  value={draft.hint_uz}
                  onChange={(event) => onChange({ ...draft, hint_uz: event.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Til">
                  <Select
                    value={draft.language}
                    onChange={(event) =>
                      onChange({ ...draft, language: event.target.value as CourseLanguage })
                    }
                    options={[
                      { value: "python", label: "Python" },
                      { value: "javascript", label: "JavaScript" },
                      { value: "cpp", label: "C++" },
                    ]}
                  />
                </Field>
                <Field label="Ball">
                  <Input
                    type="number"
                    min={0}
                    value={draft.points}
                    onChange={(event) => onChange({ ...draft, points: Number(event.target.value) })}
                  />
                </Field>
                <Field label="Vaqt chegarasi (ms)">
                  <Input
                    type="number"
                    min={500}
                    step={500}
                    value={draft.time_limit_ms}
                    onChange={(event) =>
                      onChange({ ...draft, time_limit_ms: Number(event.target.value) })
                    }
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {tab === "code" ? (
            <div className="flex flex-col gap-4">
              <Field label="Boshlang'ich kod" hint="Muharrirda shu kod ochiladi">
                <CodeEditor
                  value={draft.starter_code}
                  onChange={(value) => onChange({ ...draft, starter_code: value })}
                  language={draft.language}
                  height="14rem"
                  expandable
                />
              </Field>
              <Field
                label="Namuna yechim"
                hint="Faqat topshiriq bajarilgandan keyin o'quvchiga ochiladi"
              >
                <CodeEditor
                  value={draft.solution_code}
                  onChange={(value) => onChange({ ...draft, solution_code: value })}
                  language={draft.language}
                  height="14rem"
                  expandable
                />
              </Field>
            </div>
          ) : null}

          {tab === "tests" ? (
            <div className="flex flex-col gap-3">
              <Alert tone="info">
                Ochiq test o&apos;quvchiga ko&apos;rinadi va «Ishga tushirish»da ishlatiladi. Yopiq
                test faqat «Topshirish»da tekshiriladi va uning kirishi ko&apos;rsatilmaydi.
              </Alert>

              {draft.tests.map((test, index) => (
                <div
                  key={index}
                  className="rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] p-3.5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="t-eyebrow">Test {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={test.is_sample}
                        onChange={(next) => setTest(index, { is_sample: next })}
                        label="Ochiq"
                      />
                      <Button
                        variant="ghost"
                        size="iconSm"
                        title="Testni o'chirish"
                        aria-label="Testni o'chirish"
                        className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
                        onClick={() =>
                          onChange({ ...draft, tests: draft.tests.filter((_, i) => i !== index) })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Kirish (stdin)">
                      <Textarea
                        rows={3}
                        className="font-[var(--font-mono)] text-[12.5px]"
                        value={test.input}
                        onChange={(event) => setTest(index, { input: event.target.value })}
                      />
                    </Field>
                    <Field label="Kutilgan chiqish">
                      <Textarea
                        rows={3}
                        className="font-[var(--font-mono)] text-[12.5px]"
                        value={test.expected_output}
                        onChange={(event) =>
                          setTest(index, { expected_output: event.target.value })
                        }
                      />
                    </Field>
                  </div>

                  {test.is_sample ? (
                    <Field label="Izoh" className="mt-3">
                      <Input
                        value={test.explanation_uz}
                        onChange={(event) =>
                          setTest(index, { explanation_uz: event.target.value })
                        }
                      />
                    </Field>
                  ) : null}
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={() =>
                  onChange({
                    ...draft,
                    tests: [
                      ...draft.tests,
                      {
                        input: "",
                        expected_output: "",
                        is_sample: draft.tests.length === 0,
                        explanation_uz: "",
                        order: draft.tests.length,
                      },
                    ],
                  })
                }
              >
                Test qo&apos;shish
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

/* ==========================================================================
   Sahifa
   ========================================================================== */

export default function CourseEditorPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("content");

  const [moduleDraft, setModuleDraft] = useState<{
    id?: string;
    title_uz: string;
    slug: string;
    summary_uz: string;
  } | null>(null);
  const [lessonDraft, setLessonDraft] = useState<{
    id?: string;
    module: string;
    title_uz: string;
    slug: string;
    summary_uz: string;
    status: string;
    points: number;
    estimated_minutes: number;
  } | null>(null);
  const [exampleDraft, setExampleDraft] = useState<ExampleDraft | null>(null);
  const [quizDraft, setQuizDraft] = useState<QuizDraft | null>(null);
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    label: string;
    run: () => void;
  } | null>(null);

  // Nazariya matni alohida holatda: har bir tugmada saqlash emas, ochiq
  // «Saqlash» tugmasi bilan — uzun matnni yozayotganda avtomatik saqlash
  // kursorni sakratib yuborardi.
  const [contentDraft, setContentDraft] = useState<string>("");

  const treeQuery = useQuery({
    queryKey: ["admin-course-tree", courseId],
    queryFn: () => api.get<AdminCourseTree>(`/admin/courses/${courseId}/tree/`),
  });

  const lessonQuery = useQuery({
    queryKey: ["admin-course-lesson", selectedLessonId],
    queryFn: () => lessonsApi.retrieve(selectedLessonId!),
    enabled: Boolean(selectedLessonId),
  });

  const lesson = lessonQuery.data;
  const course = treeQuery.data?.course;

  // Birinchi mavzu avtomatik tanlanadi — bo'sh o'ng ustun bilan ochilish
  // muharrirda «endi nima qilaman?» savolini tug'diradi.
  useEffect(() => {
    if (selectedLessonId || !treeQuery.data) return;
    const first = treeQuery.data.modules.flatMap((module) => module.lessons)[0];
    if (first) setSelectedLessonId(first.id);
  }, [treeQuery.data, selectedLessonId]);

  useEffect(() => {
    setContentDraft(lesson?.content_md ?? "");
  }, [lesson?.id, lesson?.content_md]);

  /* ----------------------------------------------------------- mutatsiyalar */

  const publishMutation = useCrudMutation(
    (publish: boolean) => courses.action<AdminCourse>(courseId, "publish", { publish }),
    { invalidate: [["admin-course-tree", courseId], ["admin-courses"]], successMessage: "Holat yangilandi" },
  );

  const moduleMutation = useCrudMutation(
    (payload: NonNullable<typeof moduleDraft>) =>
      payload.id
        ? modulesApi.update(payload.id, payload)
        : modulesApi.create({ ...payload, course: courseId }),
    { invalidate: [["admin-course-tree", courseId]], successMessage: "Saqlandi", onSuccess: () => setModuleDraft(null) },
  );

  const moduleDeleteMutation = useCrudMutation((id: string) => modulesApi.remove(id), {
    invalidate: [["admin-course-tree", courseId]],
    successMessage: "Bo'lim o'chirildi",
    onSuccess: () => setConfirmDelete(null),
  });

  const lessonMutation = useCrudMutation(
    (payload: NonNullable<typeof lessonDraft>) =>
      payload.id ? lessonsApi.update(payload.id, payload) : lessonsApi.create(payload),
    {
      invalidate: [["admin-course-tree", courseId]],
      successMessage: "Saqlandi",
      onSuccess: (created) => {
        setLessonDraft(null);
        const row = created as AdminCourseLessonDetail;
        if (row?.id) setSelectedLessonId(row.id);
      },
    },
  );

  const contentMutation = useCrudMutation(
    (markdown: string) => lessonsApi.update(selectedLessonId!, { content_md: markdown }),
    { invalidate: [["admin-course-lesson", selectedLessonId]], successMessage: "Matn saqlandi" },
  );

  const lessonDeleteMutation = useCrudMutation((id: string) => lessonsApi.remove(id), {
    invalidate: [["admin-course-tree", courseId]],
    successMessage: "Mavzu o'chirildi",
    onSuccess: () => {
      setConfirmDelete(null);
      setSelectedLessonId(null);
    },
  });

  const duplicateMutation = useCrudMutation(
    (id: string) => lessonsApi.action<AdminCourseLessonDetail>(id, "duplicate"),
    {
      invalidate: [["admin-course-tree", courseId]],
      successMessage: "Mavzu nusxalandi",
      onSuccess: (row) => setSelectedLessonId(row.id),
    },
  );

  const exampleMutation = useCrudMutation(
    (payload: ExampleDraft) =>
      payload.id
        ? examplesApi.update(payload.id, payload)
        : examplesApi.create({ ...payload, lesson: selectedLessonId }),
    { invalidate: [["admin-course-lesson", selectedLessonId], ["admin-course-tree", courseId]], successMessage: "Saqlandi", onSuccess: () => setExampleDraft(null) },
  );

  const quizMutation = useCrudMutation(
    (payload: QuizDraft) =>
      payload.id
        ? quizApi.update(payload.id, payload)
        : quizApi.create({ ...payload, lesson: selectedLessonId }),
    { invalidate: [["admin-course-lesson", selectedLessonId], ["admin-course-tree", courseId]], successMessage: "Saqlandi", onSuccess: () => setQuizDraft(null) },
  );

  const exerciseMutation = useCrudMutation(
    (payload: ExerciseDraft) =>
      payload.id
        ? exercisesApi.update(payload.id, payload)
        : exercisesApi.create({ ...payload, lesson: selectedLessonId }),
    { invalidate: [["admin-course-lesson", selectedLessonId], ["admin-course-tree", courseId]], successMessage: "Saqlandi", onSuccess: () => setExerciseDraft(null) },
  );

  const deleteChild = useCrudMutation(
    ({ kind, id }: { kind: "example" | "quiz" | "exercise"; id: string | number }) =>
      kind === "example"
        ? examplesApi.remove(id)
        : kind === "quiz"
          ? quizApi.remove(id)
          : exercisesApi.remove(id),
    {
      invalidate: [["admin-course-lesson", selectedLessonId], ["admin-course-tree", courseId]],
      successMessage: "O'chirildi",
      onSuccess: () => setConfirmDelete(null),
    },
  );

  if (treeQuery.isLoading || !treeQuery.data) {
    return (
      <div className="flex flex-col gap-5">
        <Block className="h-20 rounded-[var(--r-pane)]" />
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Block className="h-96 rounded-[var(--r-pane)]" />
          <Block className="h-96 rounded-[var(--r-pane)]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={course?.title_uz ?? "Kurs"}
        description={course?.subtitle_uz}
        backHref="/admin/courses"
        actions={
          <>
            {course ? <PublishBadge value={course.status} /> : null}
            <Button
              size="sm"
              variant="outline"
              loading={publishMutation.isPending}
              onClick={() => publishMutation.mutate(course?.status !== "published")}
            >
              {course?.status === "published" ? "Qoralamaga qaytarish" : "Chop etish"}
            </Button>
            <Link
              href={`/courses/${course?.slug}`}
              target="_blank"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-[var(--r-ctl)] border border-[var(--edge)] px-3 text-[13px] font-medium text-[var(--ink-2)] hover:bg-[var(--pane-hover)]"
            >
              <ExternalLink className="size-3.5" />
              Saytda ko&apos;rish
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-4">
          <CourseTree
            tree={treeQuery.data}
            selected={selectedLessonId}
            onSelect={setSelectedLessonId}
            onAddModule={() => setModuleDraft({ title_uz: "", slug: "", summary_uz: "" })}
            onEditModule={(module) =>
              setModuleDraft({
                id: module.id,
                title_uz: module.title_uz,
                slug: module.slug,
                summary_uz: module.summary_uz,
              })
            }
            onDeleteModule={(module) =>
              setConfirmDelete({
                label: `«${module.title_uz}» bo'limi va uning ${module.lessons.length} ta mavzusi butunlay o'chiriladi.`,
                run: () => moduleDeleteMutation.mutate(module.id),
              })
            }
            onAddLesson={(moduleId) =>
              setLessonDraft({
                module: moduleId,
                title_uz: "",
                slug: "",
                summary_uz: "",
                status: "published",
                points: 10,
                estimated_minutes: 10,
              })
            }
          />
        </div>

        {/* ------------------------------------------------ mavzu muharriri */}
        <div className="min-w-0">
          {!selectedLessonId || !lesson ? (
            <div className="pane grid min-h-64 place-items-center rounded-[var(--r-pane)] p-8 text-center">
              <div>
                <BookOpen className="mx-auto size-6 text-[var(--ink-4)]" />
                <p className="mt-3 text-[14px] font-semibold text-[var(--ink)]">
                  Mavzu tanlanmagan
                </p>
                <p className="t-meta mt-1.5 text-[var(--ink-3)]">
                  Chapdagi ro&apos;yxatdan mavzuni tanlang yoki yangisini qo&apos;shing.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="pane rounded-[var(--r-pane)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="t-eyebrow mb-2">{lesson.module_title}</p>
                    <h2 className="t-section truncate text-[var(--ink)]">{lesson.title_uz}</h2>
                    <p className="t-num mt-1 text-[11.5px] text-[var(--ink-4)]">/{lesson.slug}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone={lesson.status === "published" ? "success" : "warning"}>
                      {lesson.status === "published" ? "Chop etilgan" : "Qoralama"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Pencil className="size-3.5" />}
                      onClick={() =>
                        setLessonDraft({
                          id: lesson.id,
                          module: lesson.module,
                          title_uz: lesson.title_uz,
                          slug: lesson.slug,
                          summary_uz: lesson.summary_uz,
                          status: lesson.status,
                          points: lesson.points,
                          estimated_minutes: lesson.estimated_minutes,
                        })
                      }
                    >
                      Sozlamalar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Copy className="size-3.5" />}
                      loading={duplicateMutation.isPending}
                      onClick={() => duplicateMutation.mutate(lesson.id)}
                    >
                      Nusxalash
                    </Button>
                    <Button
                      size="iconSm"
                      variant="ghost"
                      title="Mavzuni o'chirish"
                      aria-label="Mavzuni o'chirish"
                      className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
                      onClick={() =>
                        setConfirmDelete({
                          label: `«${lesson.title_uz}» mavzusi barcha misol, savol va topshiriqlari bilan o'chiriladi.`,
                          run: () => lessonDeleteMutation.mutate(lesson.id),
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <Segmented
                    value={tab}
                    onChange={setTab}
                    items={[
                      { value: "content", label: "Nazariya" },
                      { value: "examples", label: "Misollar", count: lesson.examples.length },
                      { value: "quiz", label: "Test", count: lesson.quiz_questions.length },
                      {
                        value: "exercises",
                        label: "Topshiriqlar",
                        count: lesson.exercises.length,
                      },
                    ]}
                  />
                </div>
              </div>

              {/* ------------------------------------------------- nazariya */}
              {tab === "content" ? (
                <div className="pane rounded-[var(--r-pane)] p-5">
                  <Field
                    label="Nazariya matni"
                    hint="Markdown: sarlavha (#), ro'yxat, jadval va ```kod``` bloklari qo'llanadi"
                  >
                    <Textarea
                      rows={22}
                      className="font-[var(--font-mono)] text-[13px]"
                      value={contentDraft}
                      onChange={(event) => setContentDraft(event.target.value)}
                    />
                  </Field>
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      size="sm"
                      loading={contentMutation.isPending}
                      disabled={contentDraft === lesson.content_md}
                      onClick={() => contentMutation.mutate(contentDraft)}
                    >
                      Matnni saqlash
                    </Button>
                    {contentDraft !== lesson.content_md ? (
                      <span className="t-meta text-[var(--warn)]">Saqlanmagan o&apos;zgarish bor</span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* -------------------------------------------------- misollar */}
              {tab === "examples" ? (
                <ChildList
                  title="Misollar"
                  icon={<FlaskConical className="size-3.5" />}
                  onAdd={() =>
                    setExampleDraft({
                      lesson: lesson.id,
                      title_uz: "",
                      language: (course?.language ?? "python") as CourseLanguage,
                      code: "",
                      expected_output: "",
                      explanation_uz: "",
                      is_runnable: true,
                      order: lesson.examples.length,
                    })
                  }
                  empty="Misol yo'q. Nazariyani kod bilan mustahkamlang."
                  rows={lesson.examples.map((example, index) => ({
                    key: example.id,
                    title: example.title_uz || `Misol ${index + 1}`,
                    meta: (
                      <>
                        <Badge tone="neutral">{example.language}</Badge>
                        {example.is_runnable ? <Chip tone="brand">sinab ko&apos;rish</Chip> : null}
                      </>
                    ),
                    preview: example.code,
                    onEdit: () => setExampleDraft({ ...example }),
                    onDelete: () =>
                      setConfirmDelete({
                        label: "Misol o'chiriladi.",
                        run: () => deleteChild.mutate({ kind: "example", id: example.id }),
                      }),
                  }))}
                />
              ) : null}

              {/* ------------------------------------------------------ test */}
              {tab === "quiz" ? (
                <ChildList
                  title="Test savollari"
                  icon={<ListChecks className="size-3.5" />}
                  onAdd={() =>
                    setQuizDraft({
                      lesson: lesson.id,
                      question_uz: "",
                      options: ["", ""],
                      correct_index: 0,
                      explanation_uz: "",
                      order: lesson.quiz_questions.length,
                    })
                  }
                  empty="Savol yo'q. Mavzuni mustahkamlash uchun 3 ta savol yetarli."
                  rows={lesson.quiz_questions.map((question, index) => ({
                    key: question.id,
                    title: `${index + 1}. ${question.question_uz}`,
                    meta: (
                      <Badge tone="success">
                        {question.options[question.correct_index] ?? "—"}
                      </Badge>
                    ),
                    preview: question.options.join("  ·  "),
                    onEdit: () => setQuizDraft({ ...question }),
                    onDelete: () =>
                      setConfirmDelete({
                        label: "Savol o'chiriladi.",
                        run: () => deleteChild.mutate({ kind: "quiz", id: question.id }),
                      }),
                  }))}
                />
              ) : null}

              {/* ------------------------------------------------ topshiriqlar */}
              {tab === "exercises" ? (
                <ChildList
                  title="Topshiriqlar"
                  icon={<Terminal className="size-3.5" />}
                  onAdd={() =>
                    setExerciseDraft({
                      lesson: lesson.id,
                      title_uz: "",
                      prompt_md: "",
                      language: (course?.language ?? "python") as CourseLanguage,
                      starter_code: "",
                      solution_code: "",
                      hint_uz: "",
                      points: 5,
                      order: lesson.exercises.length,
                      time_limit_ms: 5000,
                      memory_limit_kb: 262144,
                      tests: [
                        { input: "", expected_output: "", is_sample: true, explanation_uz: "", order: 0 },
                      ],
                    })
                  }
                  empty="Topshiriq yo'q. Har bir mavzuda kamida bitta amaliy mashq bo'lgani ma'qul."
                  rows={lesson.exercises.map((exercise, index) => ({
                    key: exercise.id,
                    title: `${index + 1}. ${exercise.title_uz}`,
                    meta: (
                      <>
                        <Badge tone="neutral">{exercise.language}</Badge>
                        <Chip tone="brand">{exercise.points} ball</Chip>
                        <Chip tone={exercise.tests.length ? "neutral" : "warn"}>
                          {exercise.tests.length} test
                        </Chip>
                      </>
                    ),
                    preview: exercise.prompt_md,
                    onEdit: () => setExerciseDraft({ ...exercise, tests: [...exercise.tests] }),
                    onDelete: () =>
                      setConfirmDelete({
                        label: `«${exercise.title_uz}» topshirig'i o'chiriladi.`,
                        run: () => deleteChild.mutate({ kind: "exercise", id: exercise.id }),
                      }),
                  }))}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ bo'lim formasi */}
      <Modal
        open={Boolean(moduleDraft)}
        onClose={() => setModuleDraft(null)}
        title={moduleDraft?.id ? "Bo'limni tahrirlash" : "Yangi bo'lim"}
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModuleDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={moduleMutation.isPending}
              disabled={!moduleDraft?.title_uz.trim() || !moduleDraft?.slug.trim()}
              onClick={() => moduleDraft && moduleMutation.mutate(moduleDraft)}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        {moduleDraft ? (
          <div className="flex flex-col gap-4">
            <Field label="Nomi" required>
              <Input
                autoFocus
                value={moduleDraft.title_uz}
                onChange={(event) =>
                  setModuleDraft({
                    ...moduleDraft,
                    title_uz: event.target.value,
                    slug: moduleDraft.id ? moduleDraft.slug : slugify(event.target.value),
                  })
                }
              />
            </Field>
            <Field label="Slug" required>
              <Input
                value={moduleDraft.slug}
                onChange={(event) => setModuleDraft({ ...moduleDraft, slug: event.target.value })}
              />
            </Field>
            <Field label="Qisqa izoh">
              <Input
                value={moduleDraft.summary_uz}
                onChange={(event) =>
                  setModuleDraft({ ...moduleDraft, summary_uz: event.target.value })
                }
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      {/* ------------------------------------------------------ mavzu formasi */}
      <Modal
        open={Boolean(lessonDraft)}
        onClose={() => setLessonDraft(null)}
        title={lessonDraft?.id ? "Mavzu sozlamalari" : "Yangi mavzu"}
        description="Nazariya matni, misollar va topshiriqlar mavzu yaratilgandan keyin qo'shiladi."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setLessonDraft(null)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={lessonMutation.isPending}
              disabled={!lessonDraft?.title_uz.trim() || !lessonDraft?.slug.trim()}
              onClick={() => lessonDraft && lessonMutation.mutate(lessonDraft)}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        {lessonDraft ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nomi" required>
                <Input
                  autoFocus
                  value={lessonDraft.title_uz}
                  onChange={(event) =>
                    setLessonDraft({
                      ...lessonDraft,
                      title_uz: event.target.value,
                      slug: lessonDraft.id ? lessonDraft.slug : slugify(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Slug" required hint="Kurs ichida noyob bo'lishi kerak">
                <Input
                  value={lessonDraft.slug}
                  onChange={(event) => setLessonDraft({ ...lessonDraft, slug: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Qisqa izoh">
              <Input
                value={lessonDraft.summary_uz}
                onChange={(event) =>
                  setLessonDraft({ ...lessonDraft, summary_uz: event.target.value })
                }
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Bo'lim">
                <Select
                  value={lessonDraft.module}
                  onChange={(event) =>
                    setLessonDraft({ ...lessonDraft, module: event.target.value })
                  }
                  options={(treeQuery.data?.modules ?? []).map((module) => ({
                    value: module.id,
                    label: module.title_uz,
                  }))}
                />
              </Field>
              <Field label="Ball" hint="Mavzu yakunlanganda">
                <Input
                  type="number"
                  min={0}
                  value={lessonDraft.points}
                  onChange={(event) =>
                    setLessonDraft({ ...lessonDraft, points: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Davomiyligi (daq)">
                <Input
                  type="number"
                  min={1}
                  value={lessonDraft.estimated_minutes}
                  onChange={(event) =>
                    setLessonDraft({
                      ...lessonDraft,
                      estimated_minutes: Number(event.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Holat">
              <Select
                value={lessonDraft.status}
                onChange={(event) => setLessonDraft({ ...lessonDraft, status: event.target.value })}
                options={[
                  { value: "published", label: "Chop etilgan" },
                  { value: "draft", label: "Qoralama" },
                ]}
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <ExampleModal
        draft={exampleDraft}
        onChange={setExampleDraft}
        onClose={() => setExampleDraft(null)}
        onSave={() => exampleDraft && exampleMutation.mutate(exampleDraft)}
        saving={exampleMutation.isPending}
      />
      <QuizModal
        draft={quizDraft}
        onChange={setQuizDraft}
        onClose={() => setQuizDraft(null)}
        onSave={() => quizDraft && quizMutation.mutate(quizDraft)}
        saving={quizMutation.isPending}
      />
      <ExerciseModal
        draft={exerciseDraft}
        onChange={setExerciseDraft}
        onClose={() => setExerciseDraft(null)}
        onSave={() => exerciseDraft && exerciseMutation.mutate(exerciseDraft)}
        saving={exerciseMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete?.run()}
        loading={
          deleteChild.isPending || lessonDeleteMutation.isPending || moduleDeleteMutation.isPending
        }
        title="O'chirish"
        message={`${confirmDelete?.label ?? ""} Bu amalni qaytarib bo'lmaydi.`}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
      />
    </>
  );
}

/* ==========================================================================
   Ichki kontent ro'yxati — misol / savol / topshiriq uchun bir xil shakl
   ========================================================================== */

function ChildList({
  title,
  icon,
  rows,
  empty,
  onAdd,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  onAdd: () => void;
  rows: {
    key: string | number;
    title: string;
    meta?: React.ReactNode;
    preview?: string;
    onEdit: () => void;
    onDelete: () => void;
  }[];
}) {
  return (
    <div className="pane overflow-hidden rounded-[var(--r-pane)]">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <p className="t-eyebrow flex items-center gap-2">
          {icon}
          {title}
        </p>
        <Button size="sm" variant="outline" icon={<Plus className="size-3.5" />} onClick={onAdd}>
          Qo&apos;shish
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-[var(--edge)] px-5 py-8 text-center text-[13px] text-[var(--ink-4)]">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--edge-soft)] border-t border-[var(--edge)]">
          {rows.map((row) => (
            <li key={row.key} className="group flex items-start gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-[var(--ink)]">{row.title}</p>
                {row.meta ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{row.meta}</div>
                ) : null}
                {row.preview ? (
                  <p className="mt-2 line-clamp-2 font-[var(--font-mono)] text-[11.5px] whitespace-pre-wrap text-[var(--ink-4)]">
                    {row.preview}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="iconSm" title="Tahrirlash" aria-label="Tahrirlash" onClick={row.onEdit}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  title="O'chirish"
                  aria-label="O'chirish"
                  className="text-[var(--bad)] hover:bg-[var(--bad-wash)]"
                  onClick={row.onDelete}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

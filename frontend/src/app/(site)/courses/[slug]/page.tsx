"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Check,
  Circle,
  Clock,
  GraduationCap,
  ListChecks,
  Terminal,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import {
  Block,
  Breadcrumb,
  Chip,
  Empty,
  LinkButton,
  Meter,
  PageHead,
  Pane,
  PaneHead,
  SplitLayout,
  Stat,
} from "@/components/kit";
import { useAuth } from "@/components/providers";
import { Markdown } from "@/components/ui/markdown";
import { ApiError } from "@/lib/api";
import type { PublicLessonNode } from "@/lib/types";
import { publicApi } from "@/lib/public-api";
import { cn } from "@/lib/utils";

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Boshlang'ich",
  intermediate: "O'rta",
  advanced: "Yuqori",
};

/** Mavzular ro'yxatining bitta qatori — holat belgisi bilan. */
function LessonRow({
  lesson,
  courseSlug,
  index,
}: {
  lesson: PublicLessonNode;
  courseSlug: string;
  index: number;
}) {
  const state = lesson.my_state;
  const done = state?.is_completed;

  return (
    <Link
      href={`/courses/${courseSlug}/${lesson.slug}`}
      className={cn(
        "focus-ring group flex items-center gap-4 px-5 py-3.5",
        "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]",
      )}
    >
      {/* Holat belgisi: tugallangan mavzuda belgi, aks holda tartib raqami.
          Rang yolg'iz signal emas — shakl ham o'zgaradi. */}
      <span
        aria-hidden
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold",
          done
            ? "bg-[var(--ok-wash)] text-[var(--ok)]"
            : state?.is_read
              ? "border border-[var(--brand-edge)] bg-[var(--brand-wash)] text-[var(--brand-ink)]"
              : "border border-[var(--edge-strong)] text-[var(--ink-4)]",
        )}
      >
        {done ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : state?.is_read ? (
          <Circle className="size-2 fill-current" />
        ) : (
          <span className="t-num">{index + 1}</span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[var(--ink)] group-hover:text-[var(--brand)]">
          {lesson.title_uz}
        </p>
        {lesson.summary_uz ? (
          <p className="t-meta mt-0.5 truncate text-[var(--ink-4)]">{lesson.summary_uz}</p>
        ) : null}
      </div>

      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        {lesson.quiz_count ? (
          <span className="t-meta inline-flex items-center gap-1 text-[var(--ink-4)]">
            <ListChecks className="size-3.5" />
            <span className="t-num">{lesson.quiz_count}</span>
          </span>
        ) : null}
        {lesson.exercise_count ? (
          <span className="t-meta inline-flex items-center gap-1 text-[var(--ink-4)]">
            <Terminal className="size-3.5" />
            <span className="t-num">
              {state?.exercises_solved ?? 0}/{lesson.exercise_count}
            </span>
          </span>
        ) : null}
        <span className="t-meta t-num w-12 text-right text-[var(--ink-4)]">
          {lesson.estimated_minutes} daq
        </span>
      </div>
    </Link>
  );
}

export default function CoursePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => publicApi.courses.retrieve(slug),
    retry: false,
  });

  if (error instanceof ApiError && error.status === 404) notFound();

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Block className="h-40 rounded-[var(--r-pane)]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Block className="h-[28rem] rounded-[var(--r-pane)]" />
          <Block className="h-64 rounded-[var(--r-pane)]" />
        </div>
      </div>
    );
  }

  const accent = data.accent_color || "var(--brand)";
  const progress = data.my_progress;
  const completed = progress?.completed_lessons ?? 0;

  // Kurs bo'ylab tekis raqamlash: mavzu raqami bo'lim chegarasida qaytadan
  // boshlanmaydi, chunki o'quvchi kursni bitta oqim sifatida o'qiydi.
  let counter = -1;

  const firstLesson = data.modules.flatMap((module) => module.lessons)[0];
  const continueSlug = progress?.last_lesson_slug ?? firstLesson?.slug;

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb
        items={[
          { label: "Kurslar", href: "/courses" },
          { label: data.title_uz },
        ]}
      />

      <PageHead
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="t-num grid size-5 place-items-center rounded-[5px] text-[10px] font-bold"
              style={{
                color: accent,
                backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
              }}
            >
              {data.badge || data.language.slice(0, 2)}
            </span>
            {LEVEL_LABEL[data.level] ?? data.level} daraja
          </span>
        }
        title={data.title_uz}
        lead={data.subtitle_uz}
        actions={
          continueSlug ? (
            <LinkButton
              href={`/courses/${slug}/${continueSlug}`}
              variant="primary"
              size="lg"
              iconAfter={<ArrowRight className="size-4" />}
            >
              {progress?.last_lesson_slug ? "Davom etish" : "Kursni boshlash"}
            </LinkButton>
          ) : null
        }
        meta={
          <>
            <Chip tone="neutral" icon={<BookOpen className="size-3.5" />}>
              <span className="t-num">{data.lesson_count}</span> mavzu
            </Chip>
            <Chip tone="neutral" icon={<Terminal className="size-3.5" />}>
              <span className="t-num">{data.exercise_count}</span> topshiriq
            </Chip>
            {data.estimated_hours ? (
              <Chip tone="neutral" icon={<Clock className="size-3.5" />}>
                ~<span className="t-num">{data.estimated_hours}</span> soat
              </Chip>
            ) : null}
            <Chip tone="brand" icon={<Trophy className="size-3.5" />}>
              <span className="t-num">{data.total_points}</span> ball
            </Chip>
            {progress?.completed_at ? (
              <Chip tone="ok" icon={<Check className="size-3.5" strokeWidth={3} />}>
                Tugatilgan
              </Chip>
            ) : null}
          </>
        }
      />

      <SplitLayout
        aside={
          <div className="flex flex-col gap-5">
            {user ? (
              <Pane inset="md">
                <p className="t-eyebrow">Sizning holatingiz</p>
                <Meter
                  className="mt-4"
                  value={completed}
                  max={data.lesson_count || 1}
                  tone={progress?.completed_at ? "ok" : "brand"}
                  label="Tugallangan mavzular"
                />
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <Stat
                    label="Mavzular"
                    value={`${completed}/${data.lesson_count}`}
                    tone={progress?.completed_at ? "ok" : undefined}
                  />
                  <Stat
                    label="To'plangan ball"
                    value={progress?.points_earned ?? 0}
                    sub={`${data.total_points} balldan`}
                    tone="brand"
                    icon={<Trophy className="size-3.5" />}
                  />
                </div>
              </Pane>
            ) : (
              <Pane inset="md">
                <p className="t-meta text-[var(--ink-2)]">
                  Mavzularni o&apos;qish uchun ro&apos;yxatdan o&apos;tish shart emas. Ammo
                  progressingiz saqlanishi, test va topshiriqlarni bajarish uchun hisobingizga
                  kiring.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <LinkButton href="/register" size="sm" variant="brand-soft">
                    Ro&apos;yxatdan o&apos;tish
                  </LinkButton>
                  <LinkButton
                    href="/login"
                    size="sm"
                    className="border-[var(--edge)] bg-[var(--pane-sunken)] hover:bg-[var(--pane-hover)]"
                  >
                    Kirish
                  </LinkButton>
                </div>
              </Pane>
            )}

            {data.description_uz ? (
              <Pane inset="md">
                <PaneHead title="Kurs haqida" />
                <div className="mt-4">
                  <Markdown source={data.description_uz} />
                </div>
              </Pane>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {data.modules.length === 0 ? (
            <Pane tone="solid" inset="none">
              <Empty
                icon={<GraduationCap className="size-5" />}
                title="Kurs hali to'ldirilmagan"
                description="Mavzular tayyorlanmoqda. Shu orada boshqa kurslarni ko'rib chiqing."
                action={
                  <LinkButton href="/courses" variant="primary">
                    Katalogga qaytish
                  </LinkButton>
                }
              />
            </Pane>
          ) : (
            data.modules.map((module, moduleIndex) => (
              <Pane key={module.id} tone="solid" inset="none" className="overflow-hidden">
                <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                  <div className="min-w-0">
                    <p className="t-eyebrow mb-2 flex items-center gap-2">
                      <span className="text-[var(--brand)]">
                        {String(moduleIndex + 1).padStart(2, "0")}
                      </span>
                      <span aria-hidden className="h-px w-4 bg-[var(--edge-strong)]" />
                      Bo&apos;lim
                    </p>
                    <h2 className="t-section text-[var(--ink)]">{module.title_uz}</h2>
                    {module.summary_uz ? (
                      <p className="t-meta mt-1.5 text-[var(--ink-3)]">{module.summary_uz}</p>
                    ) : null}
                  </div>
                  <span className="t-meta t-num shrink-0 text-[var(--ink-4)]">
                    {module.lessons.length} mavzu
                  </span>
                </div>

                <div className="divide-y divide-[var(--edge-soft)] border-t border-[var(--edge)]">
                  {module.lessons.map((lesson) => {
                    counter += 1;
                    return (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        courseSlug={slug}
                        index={counter}
                      />
                    );
                  })}
                </div>
              </Pane>
            ))
          )}
        </div>
      </SplitLayout>
    </div>
  );
}

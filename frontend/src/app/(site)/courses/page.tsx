"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  GraduationCap,
  ListChecks,
  Play,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Block,
  Chip,
  Empty,
  LinkButton,
  Meter,
  PageHead,
  Pane,
  Section,
  Segmented,
} from "@/components/kit";
import { useAuth } from "@/components/providers";
import type { CourseLanguage, PublicCourseCard } from "@/lib/types";
import { publicApi } from "@/lib/public-api";
import { cn } from "@/lib/utils";

const LANGUAGE_LABEL: Record<CourseLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Boshlang'ich",
  intermediate: "O'rta",
  advanced: "Yuqori",
};

type Filter = "all" | CourseLanguage;

/**
 * Kurs kartasi.
 *
 * Til belgisi (`Py`, `JS`, `C++`) — rasmsiz, monoshriftli plitka: katalogda
 * o'nlab logotip yuklanishini kutish shart emas va kartalar bir zumda bir xil
 * balandlikda turadi. Rang esa kursning o'z urg'usidan olinadi.
 */
function CourseCard({ course }: { course: PublicCourseCard }) {
  const accent = course.accent_color || "var(--brand)";
  const progress = course.my_progress;
  const done = progress?.completed_lessons ?? 0;
  const total = course.lesson_count || 1;

  const href = progress?.last_lesson_slug
    ? `/courses/${course.slug}/${progress.last_lesson_slug}`
    : `/courses/${course.slug}`;

  return (
    <Pane
      tone="solid"
      inset="none"
      interactive
      className="group relative flex flex-col overflow-hidden"
    >
      <Link href={href} className="focus-ring flex flex-1 flex-col p-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="t-num grid size-12 shrink-0 place-items-center rounded-[var(--r-ctl)] text-[15px] font-bold"
            style={{
              color: accent,
              backgroundColor: `color-mix(in oklab, ${accent} 12%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 26%, transparent)`,
            }}
          >
            {course.badge || LANGUAGE_LABEL[course.language].slice(0, 2)}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="t-section truncate text-[var(--ink)]">{course.title_uz}</h3>
            <p className="t-meta mt-1 text-[var(--ink-3)]">
              {LANGUAGE_LABEL[course.language]} · {LEVEL_LABEL[course.level] ?? course.level}
            </p>
          </div>
        </div>

        {course.subtitle_uz ? (
          <p className="t-body mt-4 line-clamp-2 text-[var(--ink-3)]">{course.subtitle_uz}</p>
        ) : null}

        {/* Sonlar — kursning «hajmi» bir qarashda ko'rinsin */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-4)]">
            <BookOpen className="size-3.5" />
            <span className="t-num">{course.lesson_count}</span> mavzu
          </span>
          <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-4)]">
            <Terminal className="size-3.5" />
            <span className="t-num">{course.exercise_count}</span> topshiriq
          </span>
          {course.estimated_hours ? (
            <span className="t-meta inline-flex items-center gap-1.5 text-[var(--ink-4)]">
              <Clock className="size-3.5" />~<span className="t-num">{course.estimated_hours}</span>{" "}
              soat
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-6">
          {progress ? (
            <Meter
              value={done}
              max={total}
              tone={progress.completed_at ? "ok" : "brand"}
              label={
                progress.completed_at ? (
                  <span className="inline-flex items-center gap-1.5 text-[var(--ok)]">
                    <Check className="size-3.5" strokeWidth={3} />
                    Tugatilgan
                  </span>
                ) : (
                  <>
                    <span className="t-num">{done}</span> / {total} mavzu
                  </>
                )
              }
            />
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-2 text-[13.5px] font-semibold",
                "text-[var(--ink-2)] transition-colors duration-[var(--t-fast)]",
                "group-hover:text-[var(--brand)]",
              )}
            >
              Kursni boshlash
              <ArrowRight className="size-4 transition-transform duration-[var(--t-fast)] group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </Link>
    </Pane>
  );
}

export default function CoursesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["courses", filter],
    queryFn: () => publicApi.courses.list(filter === "all" ? undefined : { language: filter }),
  });

  const { data: mine } = useQuery({
    queryKey: ["my-courses"],
    queryFn: () => publicApi.courses.mine(),
    enabled: Boolean(user),
  });

  const courses = data ?? [];
  const inProgress = (mine ?? []).filter((row) => !row.completed_at && row.last_lesson_slug);

  return (
    <div className="flex flex-col gap-10">
      <PageHead
        eyebrow="O'quv markazi"
        title="Kurslar"
        lead="Dasturlash tillarini noldan o'rganing: qisqa nazariya, shu yerning o'zida ishga tushadigan misollar, mavzu oxirida test va kod yozib bajariladigan topshiriqlar."
        meta={
          <>
            <Chip tone="brand" icon={<GraduationCap className="size-3.5" />}>
              <span className="t-num">{courses.length}</span> kurs
            </Chip>
            <Chip tone="neutral" icon={<Play className="size-3.5" />}>
              Misollarni brauzerda bajarish
            </Chip>
            <Chip tone="neutral" icon={<ListChecks className="size-3.5" />}>
              Har mavzuda test va topshiriq
            </Chip>
          </>
        }
      />

      {/* ------------------------------------------------- davom ettirish */}
      {inProgress.length ? (
        <Section eyebrow="Davom etish" index={1} title="Boshlangan kurslaringiz">
          <div className="grid gap-4 sm:grid-cols-2">
            {inProgress.map((row) => (
              <Pane key={row.slug} tone="card" inset="md" interactive className="min-w-0">
                <Link
                  href={`/courses/${row.slug}/${row.last_lesson_slug}`}
                  className="focus-ring flex items-center gap-4"
                >
                  <span
                    aria-hidden
                    className="t-num grid size-10 shrink-0 place-items-center rounded-[var(--r-ctl)] text-[13px] font-bold"
                    style={{
                      color: row.accent_color || "var(--brand)",
                      backgroundColor: `color-mix(in oklab, ${row.accent_color || "var(--brand)"} 12%, transparent)`,
                    }}
                  >
                    {row.badge || row.language.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="t-meta text-[var(--ink-4)]">{row.title_uz}</p>
                    <p className="truncate text-[14px] font-semibold text-[var(--ink)]">
                      {row.last_lesson_title}
                    </p>
                    <Meter
                      className="mt-2.5"
                      value={row.completed_lessons}
                      max={row.lesson_count || 1}
                    />
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-[var(--ink-4)]" />
                </Link>
              </Pane>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------------- katalog */}
      <Section
        eyebrow="Katalog"
        index={inProgress.length ? 2 : 1}
        title="Barcha kurslar"
        action={
          <Segmented
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "Barchasi" },
              { value: "python", label: "Python" },
              { value: "javascript", label: "JavaScript" },
              { value: "cpp", label: "C++" },
            ]}
          />
        }
      >
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Block key={index} className="h-64 rounded-[var(--r-pane)]" />
            ))}
          </div>
        ) : isError ? (
          <Pane tone="solid" inset="none">
            <Empty
              icon={<GraduationCap className="size-5" />}
              title="Kurslarni yuklab bo'lmadi"
              description="Server bilan bog'lanishda xatolik yuz berdi. Sahifani yangilab ko'ring."
            />
          </Pane>
        ) : courses.length === 0 ? (
          <Pane tone="solid" inset="none">
            <Empty
              icon={<GraduationCap className="size-5" />}
              title="Bu til bo'yicha kurs yo'q"
              description="Boshqa tilni tanlang yoki keyinroq qaytib keling — kurslar muntazam qo'shilmoqda."
              action={
                <LinkButton href="/problems" variant="primary">
                  Masalalarga o&apos;tish
                </LinkButton>
              }
            />
          </Pane>
        ) : (
          <div className="enter-stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

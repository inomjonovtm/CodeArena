"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Code2,
  ListChecks,
  Terminal,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Block,
  Breadcrumb,
  Button,
  Chip,
  Empty,
  LinkButton,
  Meter,
  Pane,
  SplitLayout,
} from "@/components/kit";
import { useAuth } from "@/components/providers";
import { ExampleBlock, ExerciseBlock, QuizBlock } from "@/components/site/course-lesson";
import { LessonReader } from "@/components/site/lesson-reader";
import { LessonTabs, type LessonTab } from "@/components/site/lesson-tabs";
import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";
import type { CourseLanguage } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANGUAGE_LABEL: Record<CourseLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

/**
 * Bo'limlar: DARSLIK (nazariya + misollar) · TEST · TOPSHIRIQLAR.
 *
 * Misollar ataylab alohida bo'lim EMAS. Ular nazariyaning davomi: matn nimani
 * tushuntirsa, misol o'shani ishlab ko'rsatadi. Alohida qo'yilganda o'quvchi
 * bir xil mavzuni ikki marta, ikki joyda o'qishga majbur bo'lardi.
 */
type TabKey = "lesson" | "quiz" | "exercises";

/**
 * Mavzu «o'qildi» deb NAZARIYA OXIRIGA yetganda belgilanadi.
 *
 * Ochilishi bilan belgilash bosh sahifadan tasodifiy o'tish ham «o'qildi»
 * degani bo'lardi; alohida tugma esa foydalanuvchini keraksiz amalga
 * majburlaydi. Kuzatgich matn tugagan joyda turadi — u ko'ringan bo'lsa,
 * mavzu haqiqatan ham ko'zdan o'tkazilgan.
 */
function useMarkReadOnScroll(enabled: boolean, onRead: () => void) {
  const sentinel = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || fired.current) return;
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !fired.current) {
          fired.current = true;
          onRead();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, onRead]);

  return sentinel;
}

export default function LessonPage() {
  const params = useParams<{ slug: string; lessonSlug: string }>();
  const { slug, lessonSlug } = params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [justCompleted, setJustCompleted] = useState(false);
  const [tab, setTab] = useState<TabKey>("lesson");

  // Bo'lim almashganda kontent tepasiga qaytariladi — aks holda uzun
  // nazariyadan keyin topshiriqqa o'tilganda sahifa o'rtasida qolib ketardi.
  const contentTop = useRef<HTMLDivElement>(null);
  const switchTab = useCallback((next: TabKey) => {
    setTab(next);
    contentTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const lessonQuery = useQuery({
    queryKey: ["course-lesson", slug, lessonSlug],
    queryFn: () => publicApi.courses.lesson(slug, lessonSlug),
    retry: false,
  });

  // Judge holati — kurs tili serverda bajarilmasa, buni tugmani bosishdan
  // OLDIN aytish kerak: aks holda o'quvchi xatoni o'z kodidan qidiradi.
  const judgeQuery = useQuery({
    queryKey: ["judge-status"],
    queryFn: () => publicApi.judgeStatus(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Chapdagi mavzular daraxti kurs so'rovidan keladi va u sahifalar
  // orasida keshda qoladi — mavzudan mavzuga o'tishda qayta yuklanmaydi.
  const courseQuery = useQuery({
    queryKey: ["course", slug],
    queryFn: () => publicApi.courses.retrieve(slug),
    retry: false,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["course-lesson", slug, lessonSlug] });
    void queryClient.invalidateQueries({ queryKey: ["course", slug] });
    void queryClient.invalidateQueries({ queryKey: ["my-courses"] });
  }, [queryClient, slug, lessonSlug]);

  const markRead = useMutation({
    mutationFn: () => publicApi.courses.markRead(slug, lessonSlug),
    onSuccess: (data) => {
      if (data.is_completed) setJustCompleted(true);
      refresh();
    },
  });

  const lesson = lessonQuery.data;
  const alreadyRead = lesson?.my_state?.is_read ?? false;

  const sentinel = useMarkReadOnScroll(
    Boolean(user) && Boolean(lesson) && !alreadyRead && tab === "lesson",
    () => markRead.mutate(),
  );

  // Yangi mavzuga o'tilganda birinchi bo'limdan boshlanadi
  useEffect(() => {
    setTab("lesson");
    setJustCompleted(false);
  }, [lessonSlug]);

  const solvedExercises = useMemo(
    () => (lesson?.exercises ?? []).filter((exercise) => exercise.is_solved).length,
    [lesson],
  );

  const tabs = useMemo<LessonTab[]>(() => {
    if (!lesson) return [];
    const state = lesson.my_state;
    const rows: LessonTab[] = [
      {
        key: "lesson",
        label: "Darslik",
        icon: <BookOpen className="size-4" />,
        done: alreadyRead,
      },
    ];
    if (lesson.quiz_questions.length) {
      rows.push({
        key: "quiz",
        label: "Test",
        icon: <ListChecks className="size-4" />,
        count: lesson.quiz_questions.length,
        done: Boolean(state?.quiz_passed),
      });
    }
    if (lesson.exercises.length) {
      rows.push({
        key: "exercises",
        label: "Topshiriqlar",
        icon: <Terminal className="size-4" />,
        count: lesson.exercises.length,
        done: solvedExercises === lesson.exercises.length,
      });
    }
    return rows;
  }, [lesson, alreadyRead, solvedExercises]);

  if (lessonQuery.error instanceof ApiError && lessonQuery.error.status === 404) notFound();

  if (lessonQuery.isLoading || !lesson) {
    return (
      <div className="flex flex-col gap-6">
        <Block className="h-24 rounded-[var(--r-pane)]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Block className="h-[32rem] rounded-[var(--r-pane)]" />
          <Block className="h-96 rounded-[var(--r-pane)]" />
        </div>
      </div>
    );
  }

  const state = lesson.my_state;
  const completed = state?.is_completed || justCompleted;

  // `judgeQuery` javob bermasa hech narsa ko'rsatilmaydi — noaniq holatda
  // «ishlamaydi» deb qo'rqitgandan ko'ra jim turgan ma'qul.
  const languageOff =
    judgeQuery.data !== undefined &&
    judgeQuery.data.languages?.[lesson.course_language] !== true;

  // Qolgan shartlar ro'yxati: foydalanuvchi «yana nima kerak» degan
  // savolga javobni taxmin qilmasligi kerak.
  const remaining = [
    ...(user && !alreadyRead ? ["nazariyani o'qish"] : []),
    ...(lesson.quiz_questions.length && !state?.quiz_passed ? ["testni topshirish"] : []),
    ...(lesson.exercises.length > solvedExercises
      ? [`${lesson.exercises.length - solvedExercises} ta topshiriq`]
      : []),
  ];

  // Mavzuning kurs ichidagi o'rni — «qanchasi qoldi» degan savolga javob.
  // Kurs so'rovi kelmaguncha ko'rsatilmaydi (noto'g'ri raqamdan ko'ra yo'qroq).
  const flatLessons = (courseQuery.data?.modules ?? []).flatMap((module) => module.lessons);
  const position = flatLessons.findIndex((row) => row.slug === lessonSlug);

  const tabIndex = Math.max(0, tabs.findIndex((row) => row.key === tab));
  const previousTab = tabs[tabIndex - 1];
  const nextTab = tabs[tabIndex + 1];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Kurslar", href: "/courses" },
          { label: lesson.course_title, href: `/courses/${slug}` },
          { label: lesson.title_uz },
        ]}
      />

      <SplitLayout
        aside={
          <div className="flex flex-col gap-5">
            {/* ------------------------------------------- mavzu holati */}
            {user ? (
              <Pane inset="md">
                <p className="t-eyebrow">Mavzu holati</p>
                <div className="mt-4 flex flex-col gap-2.5">
                  <StatusRow label="Nazariya o'qildi" done={alreadyRead} />
                  {lesson.quiz_questions.length ? (
                    <StatusRow
                      label={`Test (${state?.quiz_best_score ?? 0}/${lesson.quiz_questions.length})`}
                      done={Boolean(state?.quiz_passed)}
                    />
                  ) : null}
                  {lesson.exercises.length ? (
                    <StatusRow
                      label={`Topshiriqlar (${solvedExercises}/${lesson.exercises.length})`}
                      done={solvedExercises === lesson.exercises.length}
                    />
                  ) : null}
                </div>

                {completed ? (
                  <div className="mt-4 rounded-[var(--r-field)] bg-[var(--ok-wash)] px-3.5 py-2.5">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ok)]">
                      <Check className="size-3.5" strokeWidth={3} />
                      Mavzu tugallandi
                    </p>
                  </div>
                ) : remaining.length ? (
                  <p className="t-meta mt-4 text-[var(--ink-3)]">
                    Yakunlash uchun: {remaining.join(", ")}.
                  </p>
                ) : null}
              </Pane>
            ) : null}

            {/* --------------------------------------- kurs mavzulari */}
            <Pane inset="none" className="overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <p className="t-eyebrow">Kurs mavzulari</p>
                <Link
                  href={`/courses/${slug}`}
                  className="focus-ring mt-1.5 block truncate text-[14px] font-semibold text-[var(--ink)] hover:text-[var(--brand)]"
                >
                  {lesson.course_title}
                </Link>
                {courseQuery.data ? (
                  <Meter
                    className="mt-3"
                    value={courseQuery.data.my_progress?.completed_lessons ?? 0}
                    max={courseQuery.data.lesson_count || 1}
                  />
                ) : null}
              </div>

              <nav className="max-h-[26rem] overflow-y-auto border-t border-[var(--edge)]">
                {(courseQuery.data?.modules ?? []).map((module) => (
                  <div key={module.id}>
                    <p className="t-eyebrow sticky top-0 z-[1] bg-[var(--pane)] px-4 py-2 backdrop-blur">
                      {module.title_uz}
                    </p>
                    {module.lessons.map((row) => {
                      const active = row.slug === lessonSlug;
                      return (
                        <Link
                          key={row.id}
                          href={`/courses/${slug}/${row.slug}`}
                          className={cn(
                            "focus-ring flex items-center gap-2.5 px-4 py-2 text-[13.5px]",
                            "transition-colors duration-[var(--t-fast)]",
                            active
                              ? "bg-[var(--brand-wash)] font-semibold text-[var(--brand-ink)]"
                              : "text-[var(--ink-2)] hover:bg-[var(--pane-hover)]",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-4 shrink-0 place-items-center rounded-full",
                              row.my_state?.is_completed
                                ? "bg-[var(--ok)] text-[var(--canvas)]"
                                : "border border-[var(--edge-strong)]",
                            )}
                          >
                            {row.my_state?.is_completed ? (
                              <Check className="size-2.5" strokeWidth={4} />
                            ) : null}
                          </span>
                          <span className="min-w-0 truncate">{row.title_uz}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </Pane>
          </div>
        }
      >
        <div className="flex min-w-0 flex-col gap-6">
          {/* --------------------------------------------------- sarlavha */}
          <header>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="t-eyebrow">{lesson.module_title}</p>
              {position >= 0 ? (
                <>
                  <span aria-hidden className="h-px w-4 bg-[var(--edge-strong)]" />
                  <p className="t-eyebrow text-[var(--ink-4)]">
                    <span className="t-num">{position + 1}</span> / {flatLessons.length} mavzu
                  </p>
                </>
              ) : null}
            </div>
            <h1 className="t-title mt-3 text-[var(--ink)]">{lesson.title_uz}</h1>
            {lesson.summary_uz ? (
              <p className="t-body mt-3 text-[var(--ink-3)]">{lesson.summary_uz}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <Chip tone="neutral" icon={<Clock className="size-3.5" />}>
                ~<span className="t-num">{lesson.estimated_minutes}</span> daqiqa
              </Chip>
              <Chip tone="brand" icon={<Trophy className="size-3.5" />}>
                <span className="t-num">{lesson.points}</span> ball
              </Chip>
              <Chip tone="neutral" icon={<Code2 className="size-3.5" />}>
                {LANGUAGE_LABEL[lesson.course_language]}
              </Chip>
              {completed ? (
                <Chip tone="ok" icon={<Check className="size-3.5" strokeWidth={3} />}>
                  Tugallandi
                </Chip>
              ) : null}
            </div>
          </header>

          {/* ------------------------------------------------ bo'limlar */}
          <div ref={contentTop} className="scroll-mt-[calc(var(--bar)+16px)]">
            <LessonTabs tabs={tabs} value={tab} onChange={(next) => switchTab(next as TabKey)} />
          </div>

          {/* Til bajarilmasa — ogohlantirish kod bo'limlarining tepasida */}
          {languageOff && tab !== "quiz" ? (
            <Alert tone="warn" title="Kod hozircha bajarilmaydi">
              Serverda <strong>{LANGUAGE_LABEL[lesson.course_language]}</strong> uchun muhit
              sozlanmagan, shuning uchun kodni ishga tushirish xato qaytaradi. Nazariya,
              misollar matni va test to&apos;liq ishlaydi.
            </Alert>
          ) : null}

          {/* ------------------------------------------ darslik: nazariya + misollar
              Misollar nazariyadan keyin, lekin O'SHA oqimda: sarlavha ostidagi
              chiziq ularni ajratadi, alohida bo'lim qilmaydi. */}
          {tab === "lesson" ? (
            <section className="enter">
              {lesson.content_md ? (
                <article>
                  <LessonReader
                    source={lesson.content_md}
                    language={lesson.course_language}
                  />
                </article>
              ) : lesson.examples.length ? null : (
                <Pane tone="solid" inset="none">
                  <Empty
                    compact
                    icon={<BookOpen className="size-5" />}
                    title="Bu mavzuda darslik matni yo'q"
                    description="To'g'ridan-to'g'ri test va topshiriqlarga o'ting."
                  />
                </Pane>
              )}

              {lesson.examples.length ? (
                <div className={cn(lesson.content_md && "mt-10")}>
                  <div className="mb-6 border-b border-[var(--edge)] pb-4">
                    <p className="t-eyebrow flex items-center gap-2">
                      <Code2 className="size-3.5" />
                      Misollar
                    </p>
                    <h2 className="t-section mt-2 text-[var(--ink)]">
                      Tayyor kodni o&apos;zgartirib ko&apos;ring
                    </h2>
                    <p className="t-meta mt-1.5 text-[var(--ink-3)]">
                      Har birini shu yerning o&apos;zida ishga tushirish mumkin — hisob
                      talab qilinmaydi.
                    </p>
                  </div>
                  <div className="flex flex-col gap-5">
                    {lesson.examples.map((example, index) => (
                      <ExampleBlock key={example.id} example={example} index={index} />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Darslik tugagan nuqta — «o'qildi» shu yerda belgilanadi */}
              <div ref={sentinel} aria-hidden className="h-px" />
            </section>
          ) : null}

          {/* -------------------------------------------------------- test */}
          {tab === "quiz" ? (
            <section className="enter">
              <QuizBlock
                questions={lesson.quiz_questions}
                courseSlug={slug}
                lessonSlug={lessonSlug}
                passed={Boolean(state?.quiz_passed)}
                onCompleted={refresh}
              />
            </section>
          ) : null}

          {/* -------------------------------------------------- topshiriqlar */}
          {tab === "exercises" ? (
            <section className="enter flex flex-col gap-6">
              <p className="t-meta text-[var(--ink-3)]">
                Kod serverda bajariladi va testlar bilan tekshiriladi. «Ishga tushirish» —
                faqat namuna testlar, «Topshirish» — barchasi va ball.
              </p>
              {lesson.exercises.map((exercise, index) => (
                <ExerciseBlock
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  onSolved={refresh}
                />
              ))}
            </section>
          ) : null}

          {/* --------------------------------------------------- o'tish
              Avval mavzu ichidagi bo'limlar bo'ylab, oxirgisidan keyin
              keyingi mavzuga — o'quvchi «endi qayerga» deb o'ylamaydi. */}
          <nav className="rule grid gap-3 pt-6 sm:grid-cols-2">
            {previousTab ? (
              <Button
                icon={<ArrowLeft className="size-4" />}
                onClick={() => switchTab(previousTab.key as TabKey)}
                className="justify-start border-[var(--edge)] bg-[var(--pane-solid)] px-4 text-left hover:bg-[var(--pane-hover)]"
              >
                <span className="min-w-0 truncate">
                  <span className="t-meta block text-[var(--ink-4)]">Oldingi bo&apos;lim</span>
                  <span className="truncate">{previousTab.label}</span>
                </span>
              </Button>
            ) : lesson.previous ? (
              <LinkButton
                href={`/courses/${slug}/${lesson.previous.slug}`}
                icon={<ArrowLeft className="size-4" />}
                className="justify-start border-[var(--edge)] bg-[var(--pane-solid)] px-4 text-left hover:bg-[var(--pane-hover)]"
              >
                <span className="min-w-0 truncate">
                  <span className="t-meta block text-[var(--ink-4)]">Oldingi mavzu</span>
                  <span className="truncate">{lesson.previous.title_uz}</span>
                </span>
              </LinkButton>
            ) : (
              <span />
            )}

            {nextTab ? (
              <Button
                variant="primary"
                iconAfter={<ArrowRight className="size-4" />}
                onClick={() => switchTab(nextTab.key as TabKey)}
                className="justify-between px-4 text-left sm:col-start-2"
              >
                <span className="min-w-0 truncate">
                  <span className="t-meta block opacity-70">Keyingi bo&apos;lim</span>
                  <span className="truncate">
                    {nextTab.label}
                    {nextTab.count ? ` (${nextTab.count})` : ""}
                  </span>
                </span>
              </Button>
            ) : lesson.next ? (
              <LinkButton
                href={`/courses/${slug}/${lesson.next.slug}`}
                variant="primary"
                iconAfter={<ArrowRight className="size-4" />}
                className="justify-between px-4 text-left sm:col-start-2"
              >
                <span className="min-w-0 truncate">
                  <span className="t-meta block opacity-70">Keyingi mavzu</span>
                  <span className="truncate">{lesson.next.title_uz}</span>
                </span>
              </LinkButton>
            ) : (
              <LinkButton
                href={`/courses/${slug}`}
                variant="primary"
                icon={<BookOpen className="size-4" />}
                className="sm:col-start-2"
              >
                Kursga qaytish
              </LinkButton>
            )}
          </nav>
        </div>
      </SplitLayout>
    </div>
  );
}

/** Yon paneldagi shart qatori — bajarilgani belgi bilan ajraladi. */
function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          "grid size-4.5 shrink-0 place-items-center rounded-full",
          done ? "bg-[var(--ok)] text-[var(--canvas)]" : "border border-[var(--edge-strong)]",
        )}
      >
        {done ? <Check className="size-2.5" strokeWidth={4} /> : null}
      </span>
      <span className={cn("text-[13.5px]", done ? "text-[var(--ink-2)]" : "text-[var(--ink-3)]")}>
        {label}
      </span>
    </div>
  );
}

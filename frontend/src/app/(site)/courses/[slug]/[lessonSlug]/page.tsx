"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  ListChecks,
  Terminal,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Block,
  Breadcrumb,
  Chip,
  LinkButton,
  Meter,
  Pane,
  Section,
  SplitLayout,
} from "@/components/kit";
import { useAuth } from "@/components/providers";
import { ExampleBlock, ExerciseBlock, QuizBlock } from "@/components/site/course-lesson";
import { Markdown } from "@/components/ui/markdown";
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

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["course-lesson", slug, lessonSlug] });
    void queryClient.invalidateQueries({ queryKey: ["course", slug] });
    void queryClient.invalidateQueries({ queryKey: ["my-courses"] });
  };

  const markRead = useMutation({
    mutationFn: () => publicApi.courses.markRead(slug, lessonSlug),
    onSuccess: (data) => {
      if (data.is_completed) setJustCompleted(true);
      refresh();
    },
  });

  const lesson = lessonQuery.data;
  const alreadyRead = lesson?.my_state?.is_read ?? false;

  const sentinel = useMarkReadOnScroll(Boolean(user) && Boolean(lesson) && !alreadyRead, () =>
    markRead.mutate(),
  );

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
  const solvedExercises = lesson.exercises.filter((exercise) => exercise.is_solved).length;
  const completed = state?.is_completed || justCompleted;

  // Qolgan shartlar ro'yxati: foydalanuvchi «yana nima kerak» degan
  // savolga javobni taxmin qilmasligi kerak.
  // `judgeQuery` javob bermasa hech narsa ko'rsatilmaydi — noaniq holatda
  // «ishlamaydi» deb qo'rqitgandan ko'ra jim turgan ma'qul.
  const languageOff =
    judgeQuery.data !== undefined &&
    judgeQuery.data.languages?.[lesson.course_language] !== true;

  const remaining = [
    ...(user && !alreadyRead ? ["nazariyani oxirigacha o'qish"] : []),
    ...(lesson.quiz_questions.length && !state?.quiz_passed ? ["testni topshirish"] : []),
    ...(lesson.exercises.length > solvedExercises
      ? [`${lesson.exercises.length - solvedExercises} ta topshiriqni bajarish`]
      : []),
  ];

  return (
    <div className="flex flex-col gap-7">
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
                  className="mt-1.5 block truncate text-[14px] font-semibold text-[var(--ink)] hover:text-[var(--brand)] focus-ring"
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
        <div className="flex min-w-0 flex-col gap-8">
          {/* --------------------------------------------------- sarlavha */}
          <header>
            <p className="t-eyebrow">{lesson.module_title}</p>
            <h1 className="t-title mt-3 text-[var(--ink)]">{lesson.title_uz}</h1>
            {lesson.summary_uz ? (
              <p className="t-body mt-3 text-[var(--ink-3)]">{lesson.summary_uz}</p>
            ) : null}

            <div className="rule mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-4">
              <Chip tone="neutral" icon={<Clock className="size-3.5" />}>
                ~<span className="t-num">{lesson.estimated_minutes}</span> daqiqa
              </Chip>
              {lesson.quiz_questions.length ? (
                <Chip tone="neutral" icon={<ListChecks className="size-3.5" />}>
                  <span className="t-num">{lesson.quiz_questions.length}</span> savol
                </Chip>
              ) : null}
              {lesson.exercises.length ? (
                <Chip tone="neutral" icon={<Terminal className="size-3.5" />}>
                  <span className="t-num">{lesson.exercises.length}</span> topshiriq
                </Chip>
              ) : null}
              <Chip tone="brand" icon={<Trophy className="size-3.5" />}>
                <span className="t-num">{lesson.points}</span> ball
              </Chip>
              {completed ? (
                <Chip tone="ok" icon={<Check className="size-3.5" strokeWidth={3} />}>
                  Tugallandi
                </Chip>
              ) : null}
            </div>
          </header>

          {/* --------------------------------------------------- nazariya */}
          {lesson.content_md ? (
            <article>
              <Markdown source={lesson.content_md} />
            </article>
          ) : null}

          {/* Nazariya tugagan nuqta — «o'qildi» shu yerda belgilanadi */}
          <div ref={sentinel} aria-hidden className="h-px" />

          {/* Til bajarilmasa — ogohlantirish misol va topshiriqlardan oldin */}
          {languageOff && (lesson.examples.length || lesson.exercises.length) ? (
            <Alert tone="warn" title="Kod hozircha bajarilmaydi">
              Serverda <strong>{LANGUAGE_LABEL[lesson.course_language]}</strong> uchun muhit
              sozlanmagan, shuning uchun «Sinab ko&apos;rish» va «Topshirish» tugmalari xato
              qaytaradi. Nazariya, misollar va test to&apos;liq ishlaydi.
            </Alert>
          ) : null}

          {/* --------------------------------------------------- misollar */}
          {lesson.examples.length ? (
            <Section
              eyebrow="Misollar"
              index={1}
              title="Kodni ko'ring va sinab ko'ring"
              hint="Har bir misolni o'zgartirib, shu yerning o'zida ishga tushirishingiz mumkin."
            >
              <div className="flex flex-col gap-5">
                {lesson.examples.map((example, index) => (
                  <ExampleBlock key={example.id} example={example} index={index} />
                ))}
              </div>
            </Section>
          ) : null}

          {/* -------------------------------------------------------- test */}
          {lesson.quiz_questions.length ? (
            <Section eyebrow="Test" index={lesson.examples.length ? 2 : 1} title="Mavzu bo'yicha savollar">
              <QuizBlock
                questions={lesson.quiz_questions}
                courseSlug={slug}
                lessonSlug={lessonSlug}
                passed={Boolean(state?.quiz_passed)}
                onCompleted={refresh}
              />
            </Section>
          ) : null}

          {/* -------------------------------------------------- topshiriqlar */}
          {lesson.exercises.length ? (
            <Section
              eyebrow="Topshiriqlar"
              index={(lesson.examples.length ? 1 : 0) + (lesson.quiz_questions.length ? 1 : 0) + 1}
              title="Kod yozib bajaring"
              hint="Kod serverda bajariladi va testlar bilan tekshiriladi."
            >
              <div className="flex flex-col gap-6">
                {lesson.exercises.map((exercise, index) => (
                  <ExerciseBlock
                    key={exercise.id}
                    exercise={exercise}
                    index={index}
                    onSolved={refresh}
                  />
                ))}
              </div>
            </Section>
          ) : null}

          {/* ----------------------------------------------------- o'tish */}
          <nav className="rule grid gap-3 pt-6 sm:grid-cols-2">
            {lesson.previous ? (
              <LinkButton
                href={`/courses/${slug}/${lesson.previous.slug}`}
                icon={<ArrowLeft className="size-4" />}
                className="justify-start border-[var(--edge)] bg-[var(--pane-solid)] px-4 text-left hover:bg-[var(--pane-hover)]"
              >
                <span className="min-w-0 truncate">
                  <span className="t-meta block text-[var(--ink-4)]">Oldingi</span>
                  <span className="truncate">{lesson.previous.title_uz}</span>
                </span>
              </LinkButton>
            ) : (
              <span />
            )}
            {lesson.next ? (
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
      <span
        className={cn(
          "text-[13.5px]",
          done ? "text-[var(--ink-2)]" : "text-[var(--ink-3)]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

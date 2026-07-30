"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Button as KitButton } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { DifficultyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api, resource } from "@/lib/api";
import type { DailyChallenge, Paginated, ProblemListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const daily = resource<DailyChallenge>("daily-challenges");

const WEEKDAYS_UZ = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export default function DailyChallengePage() {
  const { t, locale } = useI18n();
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [assignDate, setAssignDate] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState("");
  const [bonus, setBonus] = useState(5);
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [autoFill, setAutoFill] = useState({ start_date: "", days: 7, difficulty: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["daily-challenges", cursor],
    queryFn: () =>
      api.get<{ year: number; month: number; days: DailyChallenge[] }>(
        "/admin/daily-challenges/calendar/",
        cursor,
      ),
  });

  const { data: problems } = useQuery({
    queryKey: ["problems", "published-picker"],
    queryFn: () =>
      api.get<Paginated<ProblemListItem>>("/admin/problems/", {
        status: "published",
        page_size: 300,
        ordering: "title_uz",
      }),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, DailyChallenge>();
    data?.days.forEach((row) => map.set(row.date, row));
    return map;
  }, [data]);

  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month - 1, 1);
    const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7; // dushanbadan boshlanadi
    const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(cursor.year, cursor.month - 1, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const assignMutation = useCrudMutation(
    (payload: { problem: string; date: string; bonus_points: number }) => daily.create(payload),
    {
      invalidate: [["daily-challenges"]],
      successMessage: "Kunlik masala tayinlandi",
      onSuccess: () => {
        setAssignDate(null);
        setSelectedProblem("");
      },
    },
  );

  const removeMutation = useCrudMutation((id: number) => daily.remove(id), {
    invalidate: [["daily-challenges"]],
    successMessage: "Olib tashlandi",
  });

  const autoFillMutation = useCrudMutation(
    (payload: typeof autoFill) =>
      daily.collectionAction<{ detail: string }>("auto-fill", {
        start_date: payload.start_date || undefined,
        days: payload.days,
        difficulty: payload.difficulty || undefined,
      }),
    {
      invalidate: [["daily-challenges"]],
      successMessage: "Kalendar to'ldirildi",
      onSuccess: () => setAutoFillOpen(false),
    },
  );

  const shift = (delta: number) => {
    setCursor((state) => {
      const month = state.month + delta;
      if (month < 1) return { year: state.year - 1, month: 12 };
      if (month > 12) return { year: state.year + 1, month: 1 };
      return { ...state, month };
    });
  };

  const todayISO = toISODate(today);

  // Oy qamrovi — nechta kun band, nechtasi bo'sh
  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate();
  const filledDays = data?.days.length ?? 0;
  const emptyDays = Math.max(daysInMonth - filledDays, 0);
  const todaysChallenge = byDate.get(todayISO);

  return (
    <>
      <PageHeader
        title={t.daily.title}
        description={t.daily.subtitle}
        actions={
          <KitButton
            variant="primary"
            size="sm"
            icon={<Sparkles className="size-4" />}
            onClick={() => setAutoFillOpen(true)}
          >
            {t.daily.autoFill}
          </KitButton>
        }
      />

      {/* --------------------------------------------------- oy qamrovi */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Band kunlar"
          value={`${filledDays} / ${daysInMonth}`}
          tone="accent"
          hint={`${MONTHS_UZ[cursor.month - 1]} ${cursor.year}`}
          icon={<CalendarDays className="size-[17px]" />}
        />
        <StatCard
          label="Bo'sh kunlar"
          value={emptyDays}
          tone={emptyDays ? "warning" : "neutral"}
          hint={emptyDays ? "avtomatik to'ldirish mumkin" : "hammasi tayinlangan"}
        />
        <StatCard
          label={t.common.today}
          value={todaysChallenge ? "Tayinlangan" : "Bo'sh"}
          tone={todaysChallenge ? "accent" : "danger"}
          hint={todaysChallenge?.problem_title ?? t.daily.noChallenge}
        />
      </div>

      {/* ------------------------------------------------- oy boshqaruvi */}
      <div className="pane mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3">
        <h2 className="t-num text-[15px] font-semibold text-[var(--ink)]">
          {MONTHS_UZ[cursor.month - 1]} {cursor.year}
        </h2>
        <div className="flex items-center gap-3">
          {/* Belgilar izohi — rang yagona signal bo'lib qolmasin */}
          <span className="hidden items-center gap-3 sm:flex">
            <span className="t-meta flex items-center gap-1.5 text-[var(--ink-3)]">
              <span className="size-2.5 rounded-[3px] border border-[var(--brand-edge)] bg-[var(--brand-wash)]" />
              tayinlangan
            </span>
            <span className="t-meta flex items-center gap-1.5 text-[var(--ink-4)]">
              <span className="size-2.5 rounded-[3px] border border-dashed border-[var(--edge-strong)]" />
              bo&apos;sh
            </span>
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="iconSm" onClick={() => shift(-1)} aria-label="Oldingi oy">
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() + 1 })}
            >
              {t.common.today}
            </Button>
            <Button variant="outline" size="iconSm" onClick={() => shift(1)} aria-label="Keyingi oy">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- kalendar */}
      <div className="pane-solid rounded-[var(--r-pane)] p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS_UZ.map((day) => (
            <div key={day} className="t-eyebrow pb-1 text-center">
              {day}
            </div>
          ))}

          {isLoading
            ? Array.from({ length: 35 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="loading-block h-[5.5rem] rounded-[var(--r-field)]" />
              ))
            : grid.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} />;
                const iso = toISODate(date);
                const challenge = byDate.get(iso);
                const isToday = iso === todayISO;
                const isPast = iso < todayISO;

                return (
                  <div
                    key={iso}
                    className={cn(
                      "group relative flex min-h-[5.5rem] flex-col rounded-[var(--r-field)] p-2",
                      "transition-[background-color,box-shadow] duration-[var(--t-fast)]",
                      // Oq karta ustida: band kun — brend yuvindisi, bo'sh kun — botiq katak
                      challenge
                        ? "border border-[var(--brand-edge)] bg-[var(--brand-wash)] hover:bg-[var(--brand-wash-strong)]"
                        : "border border-dashed border-[var(--edge-strong)] bg-[var(--pane-sunken)] hover:bg-[var(--brand-wash)]",
                      isToday && "shadow-[0_0_0_2px_var(--brand)]",
                      isPast && !challenge && "opacity-55",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "t-num text-[12px] font-semibold",
                          isToday ? "text-[var(--brand)]" : "text-[var(--ink-3)]",
                        )}
                      >
                        {date.getDate()}
                      </span>
                      {challenge ? (
                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(challenge.id)}
                          className="focus-ring rounded-[6px] text-[var(--ink-4)] opacity-0 transition-[opacity,color] hover:text-[var(--bad)] group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={t.common.delete}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAssignDate(iso);
                            setSelectedProblem("");
                          }}
                          className="focus-ring rounded-[6px] text-[var(--ink-4)] opacity-0 transition-[opacity,color] hover:text-[var(--brand)] group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={t.daily.assign}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {challenge ? (
                      <div className="mt-1 min-w-0 flex-1">
                        <Link
                          href={`/admin/problems/${challenge.problem}`}
                          className="focus-ring line-clamp-2 rounded-[6px] text-[11.5px] leading-tight font-medium text-[var(--ink)] transition-colors hover:text-[var(--brand)]"
                        >
                          {challenge.problem_title}
                        </Link>
                        <div className="mt-1.5">
                          <DifficultyBadge value={challenge.problem_difficulty} locale={locale} />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAssignDate(iso);
                          setSelectedProblem("");
                        }}
                        className="focus-ring mt-1 flex flex-1 items-center justify-center rounded-[var(--r-ctl)] text-[11px] text-[var(--ink-4)] transition-colors hover:text-[var(--brand)]"
                      >
                        {t.daily.noChallenge}
                      </button>
                    )}
                  </div>
                );
              })}
        </div>
      </div>

      {/* --------------------------------------------------------- tayinlash */}
      <Modal
        open={Boolean(assignDate)}
        onClose={() => setAssignDate(null)}
        title={
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-[var(--brand)]" />
            {t.daily.assign}: {assignDate}
          </span>
        }
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setAssignDate(null)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              disabled={!selectedProblem}
              loading={assignMutation.isPending}
              onClick={() =>
                assignDate &&
                assignMutation.mutate({
                  problem: selectedProblem,
                  date: assignDate,
                  bonus_points: bonus,
                })
              }
            >
              {t.daily.assign}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t.daily.selectProblem} required>
            <Select
              value={selectedProblem}
              onChange={(event) => setSelectedProblem(event.target.value)}
              placeholder="— tanlang —"
              options={(problems?.results ?? []).map((problem) => ({
                value: problem.id,
                label: `${problem.title_uz} (${problem.difficulty})`,
              }))}
            />
          </Field>
          <Field label={t.daily.bonusPoints}>
            <Input
              type="number"
              value={bonus}
              onChange={(event) => setBonus(Number(event.target.value))}
            />
          </Field>
        </div>
      </Modal>

      {/* ------------------------------------------------- avtomatik to'ldirish */}
      <Modal
        open={autoFillOpen}
        onClose={() => setAutoFillOpen(false)}
        title={t.daily.autoFill}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setAutoFillOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              size="sm"
              loading={autoFillMutation.isPending}
              onClick={() => autoFillMutation.mutate(autoFill)}
            >
              {t.common.apply}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="pane-sunken rounded-[var(--r-field)] p-3 text-[13px] leading-relaxed text-[var(--ink-2)]">
            Bo&apos;sh kunlar oxirgi 60 kunda ishlatilmagan chop etilgan masalalar bilan
            to&apos;ldiriladi.
          </p>
          <Field label={t.daily.startDate} hint="Bo'sh qoldirilsa ertadan boshlanadi">
            <Input
              type="date"
              value={autoFill.start_date}
              onChange={(event) => setAutoFill({ ...autoFill, start_date: event.target.value })}
            />
          </Field>
          <Field label={t.daily.days}>
            <Input
              type="number"
              min={1}
              max={90}
              value={autoFill.days}
              onChange={(event) => setAutoFill({ ...autoFill, days: Number(event.target.value) })}
            />
          </Field>
          <Field label={t.problems.difficulty}>
            <Select
              value={autoFill.difficulty}
              onChange={(event) => setAutoFill({ ...autoFill, difficulty: event.target.value })}
              placeholder={t.common.all}
              options={[
                { value: "easy", label: t.problems.easy },
                { value: "medium", label: t.problems.medium },
                { value: "hard", label: t.problems.hard },
              ]}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}

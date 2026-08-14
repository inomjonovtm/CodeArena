"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useConfirm, useToast } from "@/components/providers";
import {
  StButton,
  StField,
  StInput,
  StNotice,
  StSelect,
} from "@/components/studio/problem/shared";
import { WorkBody, WorkHeader, WorkPanel } from "@/components/studio/workbench";
import { api } from "@/lib/api";
import type { Paginated, ProblemDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ==========================================================================
   KUNLIK MASALA — kalendar
   --------------------------------------------------------------------------
   Kunlik masala platformaning «har kuni qaytib kelish» sababi: foydalanuvchi
   seriyasini uzmaslik uchun har kuni bitta masala yechadi. Demak kalendarda
   BO'SH KUN qolishi — mahsulot nosozligi, chunki o'sha kuni seriya uziladi.

   Shu sababli ekran bitta savolga javob beradi: «qaysi kunlar bo'sh?»

     · To'ldirilgan kun — myata katak, ichida masala nomi.
     · BO'SH kun — punktir katak. Bosilsa, o'sha sanaga masala biriktiriladi.
     · O'tgan kun — sokin: uni endi to'ldirish ma'nosiz.

   Yuqorida bitta ogohlantirish: kelgusi kunlar orasida nechtasi bo'sh.
   «Avtomatik to'ldirish» esa bo'sh kunlarni tasodifiy chop etilgan
   masalalar bilan yopadi — 60 kun ichida takrorlanmaydigan qilib.
   ========================================================================== */

interface DailyRow {
  id: string;
  problem: string;
  problem_title: string;
  problem_slug: string;
  problem_difficulty: string;
  date: string;
  bonus_points: number;
}

const DIFF: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

/** `YYYY-MM-DD` — mahalliy vaqt bo'yicha (ISO `toISOString` UTC ga suradi). */
function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function StudioDailyPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [picking, setPicking] = useState<string | null>(null);
  const [problemId, setProblemId] = useState("");
  const [pickSearch, setPickSearch] = useState("");
  const [bonus, setBonus] = useState(5);

  const key = ["studio", "daily", year, month] as const;

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () =>
      api.get<{ year: number; month: number; days: DailyRow[] }>(
        "/admin/daily-challenges/calendar/",
        { year, month: month + 1 },
      ),
  });

  /* Biriktirish uchun faqat CHOP ETILGAN va musobaqaga bog'lanmagan
     masalalar yaraydi — backend ham aynan shuni talab qiladi.
     Ro'yxat server qidiruvi bilan cheklanadi: bir sahifaga sig'maydigan
     bazada ham istalgan masala qidiruv orqali topiladi.
     E'tibor: kalit «daily» bilan boshlanmaydi — aks holda biriktirish/
     bo'shatishdagi invalidateQueries bu keshni ham behuda yangilab yurardi. */
  const { data: problems } = useQuery({
    queryKey: ["studio", "daily-pool", pickSearch],
    queryFn: () =>
      api.get<Paginated<ProblemDetail>>("/admin/problems/", {
        status: "published",
        is_contest_only: false,
        search: pickSearch.trim() || undefined,
        page_size: 50,
        ordering: "title_uz",
      }),
    enabled: Boolean(picking),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const byDate = useMemo(() => {
    const map = new Map<string, DailyRow>();
    for (const row of data?.days ?? []) map.set(row.date, row);
    return map;
  }, [data]);

  const assign = useMutation({
    mutationFn: (body: { date: string; problem: string; bonus_points: number }) =>
      api.post<DailyRow>("/admin/daily-challenges/", body),
    onSuccess: async () => {
      toast.success("Kun to'ldirildi");
      setPicking(null);
      setProblemId("");
      await queryClient.invalidateQueries({ queryKey: ["studio", "daily"] });
    },
    onError: (error: unknown) =>
      toast.error("Biriktirib bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/daily-challenges/${id}/`),
    onSuccess: async () => {
      toast.success("Kun bo'shatildi");
      await queryClient.invalidateQueries({ queryKey: ["studio", "daily"] });
    },
    onError: (error: unknown) =>
      toast.error("O'chirib bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const autoFill = useMutation({
    mutationFn: () =>
      api.post<{ detail: string }>("/admin/daily-challenges/auto-fill/", { days: 14 }),
    onSuccess: async (result) => {
      toast.success(result.detail);
      await queryClient.invalidateQueries({ queryKey: ["studio", "daily"] });
    },
    onError: (error: unknown) =>
      toast.error("To'ldirib bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  /* --- kalendar to'ri: dushanbadan boshlanadi */
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // `getDay()` yakshanbani 0 deb qaytaradi — dushanba boshlanishi uchun suramiz
  const leading = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  /* Kelgusi bo'sh kunlar — ogohlantirish shu raqamga qurilgan. */
  const emptyAhead = cells.filter((day) => {
    if (!day) return false;
    const iso = isoDate(year, month, day);
    return iso >= todayIso && !byDate.has(iso);
  }).length;

  const step = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setPicking(null);
  };

  const askRemove = async (row: DailyRow) => {
    const ok = await confirm({
      title: `${row.date} kunini bo'shatamizmi?`,
      message: `«${row.problem_title}» shu kundan olib tashlanadi. O'sha kuni foydalanuvchilarda kunlik masala umuman bo'lmaydi va seriya uziladi.`,
      confirmLabel: "Bo'shatish",
      danger: true,
    });
    if (ok) remove.mutate(row.id);
  };

  return (
    <>
      <WorkHeader
        title="Kunlik masala"
        meta={
          <span className="text-[15px] text-[var(--text-4)]">
            Har kuni bitta masala — foydalanuvchi seriyasi shu kalendarga bog&apos;liq
          </span>
        }
        actions={
          <StButton
            variant="brand"
            onClick={() => autoFill.mutate()}
            disabled={autoFill.isPending}
          >
            <Wand2 className="size-3.5" />
            {autoFill.isPending ? "To'ldirilmoqda…" : "14 kunni to'ldirish"}
          </StButton>
        }
      />

      <WorkBody className="space-y-4">
        {emptyAhead > 0 ? (
          <StNotice tone="warn" title={`${emptyAhead} ta kun bo'sh`}>
            Bo&apos;sh kunda foydalanuvchida kunlik masala ko&apos;rinmaydi va
            seriyasi uziladi. Kataklardan birini bosib masala biriktiring yoki
            «14 kunni to&apos;ldirish» tugmasidan foydalaning.
          </StNotice>
        ) : (
          <StNotice title="Kalendar to'liq">
            Bu oyning kelgusi kunlari uchun masala biriktirilgan.
          </StNotice>
        )}

        <WorkPanel
          title={`${MONTHS[month]} ${year}`}
          hint="Bo'sh katakni bosing — o'sha kunga masala biriktiriladi"
          actions={
            <div className="flex items-center gap-1">
              <StButton variant="ghost" onClick={() => step(-1)} aria-label="Oldingi oy">
                <ChevronLeft className="size-4" />
              </StButton>
              <StButton variant="ghost" onClick={() => step(1)} aria-label="Keyingi oy">
                <ChevronRight className="size-4" />
              </StButton>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS.map((label) => (
              <div key={label} className="st-label pb-1 text-center">
                {label}
              </div>
            ))}

            {cells.map((day, index) => {
              if (!day) return <div key={`pad-${index}`} />;

              const iso = isoDate(year, month, day);
              const row = byDate.get(iso);
              const isToday = iso === todayIso;
              const isPast = iso < todayIso;

              return (
                <div
                  key={iso}
                  className={cn(
                    "min-h-[92px] rounded-[12px] border p-2.5 transition-colors",
                    row
                      ? "border-[var(--green-line)] bg-[var(--green-wash)]"
                      : "border-dashed border-[var(--st-edge)] bg-transparent",
                    isPast && "opacity-45",
                    isToday && "ring-2 ring-[var(--green)] ring-inset",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "st-num text-[14px] font-semibold",
                        isToday ? "text-[var(--green-text)]" : "text-[var(--text-4)]",
                      )}
                    >
                      {day}
                    </span>
                    {row ? (
                      <button
                        type="button"
                        aria-label="Bo'shatish"
                        title="Bo'shatish"
                        onClick={() => void askRemove(row)}
                        className="grid size-6 place-items-center rounded-full text-[var(--text-4)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {row ? (
                    <>
                      <p className="mt-1.5 line-clamp-2 text-[14px] leading-snug font-medium text-[var(--text)]">
                        {row.problem_title}
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--text-4)]">
                        {DIFF[row.problem_difficulty] ?? row.problem_difficulty}
                        {row.bonus_points ? ` · +${row.bonus_points}` : ""}
                      </p>
                    </>
                  ) : isPast ? (
                    <p className="mt-2 text-[13px] text-[var(--text-4)]">o&apos;tgan</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPicking(iso);
                        setProblemId("");
                        setPickSearch("");
                        setBonus(5);
                      }}
                      className="mt-2 w-full rounded-full border border-[var(--st-edge)] py-1.5 text-[13.5px] font-medium text-[var(--text-4)] transition-colors hover:border-[var(--green-line)] hover:text-[var(--green-text)]"
                    >
                      + biriktirish
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isLoading ? (
            <p className="mt-4 text-[15px] text-[var(--text-4)]">Yuklanmoqda…</p>
          ) : null}
        </WorkPanel>

        {/* --------------------------------------------- biriktirish formasi
            Modal EMAS: forma kalendar ostida ochiladi va katak ko'rinib
            turadi — muallif qaysi kunga masala qo'yayotganini yo'qotmaydi. */}
        {picking ? (
          <WorkPanel
            title={`${picking} — masala biriktirish`}
            actions={
              <StButton variant="ghost" onClick={() => setPicking(null)}>
                Bekor qilish
              </StButton>
            }
          >
            <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)_160px_auto] sm:items-end">
              <StField label="Qidirish" hint="Sarlavha yoki slug">
                <StInput
                  type="search"
                  value={pickSearch}
                  onChange={(event) => {
                    setPickSearch(event.target.value);
                    setProblemId("");
                  }}
                  placeholder="Masala nomi"
                />
              </StField>

              <StField label="Masala" required>
                <StSelect value={problemId} onChange={(event) => setProblemId(event.target.value)}>
                  <option value="">— tanlang —</option>
                  {(problems?.results ?? []).map((problem) => (
                    <option key={problem.id} value={problem.id}>
                      {problem.title_uz} · {DIFF[problem.difficulty] ?? problem.difficulty}
                    </option>
                  ))}
                </StSelect>
              </StField>

              <StField label="Bonus ball">
                <StInput
                  type="number"
                  min={0}
                  value={bonus}
                  onChange={(event) => setBonus(Number(event.target.value))}
                />
              </StField>

              <StButton
                variant="brand"
                disabled={!problemId || assign.isPending}
                onClick={() =>
                  assign.mutate({ date: picking, problem: problemId, bonus_points: bonus })
                }
              >
                <CalendarDays className="size-3.5" />
                Biriktirish
              </StButton>
            </div>

            {problems && problems.count > problems.results.length ? (
              <p className="mt-3 text-[13.5px] text-[var(--text-4)]">
                {problems.count} tadan {problems.results.length} tasi ko&apos;rsatildi —
                keraklisi ro&apos;yxatda bo&apos;lmasa, qidiruvni aniqlashtiring.
              </p>
            ) : null}

            {!problems?.results.length ? (
              pickSearch.trim() ? (
                <StNotice tone="warn" className="mt-4" title="Mos masala topilmadi">
                  Qidiruvga mos chop etilgan masala yo&apos;q. Boshqa so&apos;z bilan
                  urinib ko&apos;ring.
                </StNotice>
              ) : (
                <StNotice tone="warn" className="mt-4" title="Chop etilgan masala yo'q">
                  Kunlik masala qilib faqat CHOP ETILGAN masalani qo&apos;yish mumkin.
                  Avval masalani tayyorlab, «Chop etish» tugmasini bosing.
                </StNotice>
              )
            ) : null}
          </WorkPanel>
        ) : null}
      </WorkBody>
    </>
  );
}

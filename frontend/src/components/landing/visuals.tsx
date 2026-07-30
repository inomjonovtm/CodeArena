"use client";

import { Check, Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DifficultyMark } from "@/components/kit";
import { cn, formatNumber } from "@/lib/utils";

/* ==========================================================================
   Muqova vizuallari
   --------------------------------------------------------------------------
   Bu bloklar bezak emas — ular MAHSULOTNI ko'rsatadi. Shuning uchun har biri
   haqiqiy ekranning bir bo'lagi: kod muharriri va hukm, faollik kalendari,
   natijalar taxtasi, daraja taqsimoti.

   Iliq qog'oz sahifada faqat BITTA to'q blok bor — kod paneli. U ko'zning
   birinchi to'xtash joyi bo'ladi va "bu yerda kod yoziladi" degan gapni
   hech qanday sarlavhasiz aytadi.
   ========================================================================== */

/** Ko'rinish maydoniga kirganini bir marta aniqlaydi (animatsiyani boshlash uchun). */
function useSeen<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, seen] as const;
}

/* -------------------------------------------------------------- kod paneli */

/** Kod satrlaridagi bo'yoq — to'q panel uchun qat'iy ranglar. */
const SYNTAX = {
  kw: "#c792ea",
  fn: "#82aaff",
  str: "#ecc48d",
  num: "#f78c6c",
  cm: "#5f6b7a",
  base: "#d6deeb",
};

const CODE: { indent: number; parts: [string, keyof typeof SYNTAX][] }[] = [
  { indent: 0, parts: [["# ikki sonning yig'indisi", "cm"]] },
  {
    indent: 0,
    parts: [
      ["def ", "kw"],
      ["two_sum", "fn"],
      ["(nums, target):", "base"],
    ],
  },
  {
    indent: 1,
    parts: [
      ["seen = ", "base"],
      ["{}", "base"],
    ],
  },
  {
    indent: 1,
    parts: [
      ["for ", "kw"],
      ["i, x ", "base"],
      ["in ", "kw"],
      ["enumerate", "fn"],
      ["(nums):", "base"],
    ],
  },
  {
    indent: 2,
    parts: [
      ["if ", "kw"],
      ["target - x ", "base"],
      ["in ", "kw"],
      ["seen:", "base"],
    ],
  },
  {
    indent: 3,
    parts: [
      ["return ", "kw"],
      ["[seen[target - x], i]", "base"],
    ],
  },
  {
    indent: 2,
    parts: [
      ["seen[x] = i", "base"],
    ],
  },
];

/**
 * Kod muharriri va hukm.
 *
 * Muqovadagi eng muhim blok: foydalanuvchi mahsulotni bir qarashda tushunadi —
 * kod yoziladi, yuboriladi, natija testlar bo'yicha qaytadi. Testlar ketma-ket
 * "o'tadi", shuning uchun blok tirik ko'rinadi, lekin hech narsa aylanmaydi.
 */
export function CodePanel({ className }: { className?: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.35);
  const [passed, setPassed] = useState(0);
  const total = 12;

  useEffect(() => {
    if (!seen) return;
    if (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPassed(total);
      return;
    }
    const timer = window.setInterval(() => {
      setPassed((previous) => {
        if (previous >= total) {
          window.clearInterval(timer);
          return previous;
        }
        return previous + 1;
      });
    }, 110);
    return () => window.clearInterval(timer);
  }, [seen]);

  const done = passed >= total;

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-[var(--r-pane-lg)] bg-[var(--stage)] shadow-[var(--lift-3)]",
        "ring-1 ring-[var(--stage-edge)]",
        className,
      )}
    >
      {/* --- muharrir sarlavhasi: fayl nomi va til */}
      <div className="flex items-center gap-3 border-b border-[var(--stage-edge)] px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[var(--stage-ink-3)]" />
          <span className="size-2.5 rounded-full bg-[var(--stage-ink-3)]" />
          <span className="size-2.5 rounded-full bg-[var(--stage-ink-3)]" />
        </span>
        <span className="font-mono text-[11.5px] text-[var(--stage-ink-2)]">two_sum.py</span>
        <span className="ml-auto font-mono text-[10.5px] tracking-[0.1em] text-[var(--stage-ink-3)] uppercase">
          Python
        </span>
      </div>

      {/* --- kod: qator raqamlari monoshriftda, ustun tik turadi */}
      <div className="px-4 py-4">
        {CODE.map((line, index) => (
          <div key={index} className="flex gap-4 leading-[1.75]">
            <span className="w-4 shrink-0 text-right font-mono text-[11px] text-[var(--stage-ink-3)] select-none">
              {index + 1}
            </span>
            <code className="min-w-0 font-mono text-[12.5px] whitespace-pre">
              {"  ".repeat(line.indent)}
              {line.parts.map((part, partIndex) => (
                <span key={partIndex} style={{ color: SYNTAX[part[1]] }}>
                  {part[0]}
                </span>
              ))}
            </code>
          </div>
        ))}
      </div>

      {/* --- hukm: testlar ketma-ket o'tadi, keyin yashil xulosa */}
      <div className="border-t border-[var(--stage-edge)] bg-[var(--stage-2)] px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span
            className="flex items-center gap-2 font-mono text-[12px] font-semibold"
            style={{ color: done ? "var(--stage-ok)" : "var(--stage-ink-2)" }}
          >
            {done ? (
              <>
                <Check className="size-3.5" strokeWidth={3} />
                Accepted
              </>
            ) : (
              "Tekshirilmoqda…"
            )}
          </span>
          <span className="font-mono text-[11.5px] text-[var(--stage-ink-2)]">
            {passed}/{total} test · 48 ms
          </span>
        </div>

        {/* Test kataklari — har biri bitta test */}
        <div className="mt-3 flex gap-1">
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{ backgroundColor: index < passed ? "var(--stage-ok)" : "var(--stage-edge)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- faollik kalendari */

/** Faollik zichligi pog'onalari — bo'shdan to'yingan ko'kkacha. */
const HEAT = [
  "var(--canvas-deep)",
  "var(--brand-wash-strong)",
  "color-mix(in oklab, var(--brand) 55%, var(--pane))",
  "var(--brand)",
];

/** Deterministik "tasodifiy" — SSR va klientda bir xil natija beradi. */
function pseudo(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Faollik kalendari — har kuni yechilgan masalalar zichligi.
 * Kataklar ko'rinishga kirganda ustunlar bo'ylab to'lqin bo'lib yonadi.
 */
export function ActivityGrid({ className }: { className?: string }) {
  const [ref, lit] = useSeen<HTMLDivElement>(0.3);
  const columns = 20;
  const rows = 7;

  return (
    <div ref={ref} className={cn("pane rounded-[var(--r-pane)] p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="t-eyebrow">Faollik · 20 hafta</p>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[var(--flare)]">
          <Flame className="size-3.5" />
          64 kun
        </span>
      </div>

      <div
        className="mt-4 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns * rows }).map((_, index) => {
          const noise = pseudo(index);
          // 0 — bo'sh, 3 — eng to'yingan
          const level = noise > 0.78 ? 3 : noise > 0.55 ? 2 : noise > 0.3 ? 1 : 0;
          return (
            <span
              key={index}
              className="aspect-square rounded-[2px] transition-colors duration-500 ease-out"
              style={{
                backgroundColor: lit ? HEAT[level] : "var(--canvas-deep)",
                transitionDelay: `${(index % columns) * 20 + Math.floor(index / columns) * 6}ms`,
              }}
            />
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="t-meta text-[var(--ink-4)]">Kuniga bitta masala</p>
        {/* Zichlik shkalasi — kataklar nimani bildirishini tushuntiradi */}
        <span className="flex items-center gap-1" aria-hidden>
          {HEAT.map((color) => (
            <span key={color} className="size-2 rounded-[2px]" style={{ backgroundColor: color }} />
          ))}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- daraja taqsimoti */

const SPLIT = [
  { key: "easy", label: "Oson", solved: 148, total: 180 },
  { key: "medium", label: "O'rta", solved: 96, total: 178 },
  { key: "hard", label: "Qiyin", solved: 21, total: 92 },
];

/**
 * Qiyinlik bo'yicha yechilganlar.
 *
 * Halqa (donut) o'rniga gorizontal chiziqlar: uchta halqani solishtirish
 * uchun ko'z burchak o'lchashi kerak, chiziqlarni esa bir qarashda
 * taqqoslaydi — uzunlik eng oson o'qiladigan vizual o'lcham.
 */
export function DifficultySplit({ className }: { className?: string }) {
  const [ref, shown] = useSeen<HTMLDivElement>(0.4);

  return (
    <div ref={ref} className={cn("pane rounded-[var(--r-pane)] p-5", className)}>
      <p className="t-eyebrow">Darajangiz</p>

      <div className="mt-4 flex flex-col gap-4">
        {SPLIT.map((item, index) => {
          const percent = Math.round((item.solved / item.total) * 100);
          const color =
            item.key === "easy" ? "var(--easy)" : item.key === "medium" ? "var(--medium)" : "var(--hard)";

          return (
            <div key={item.key}>
              <div className="flex items-baseline justify-between gap-3">
                <DifficultyMark value={item.key} label={item.label} />
                <span className="t-num text-[12px] text-[var(--ink-3)]">
                  <span className="font-semibold text-[var(--ink)]">{item.solved}</span>
                  <span className="text-[var(--ink-4)]"> / {item.total}</span>
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--canvas-deep)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: shown ? `${percent}%` : 0,
                    backgroundColor: color,
                    transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: `${index * 130}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- natijalar taxtasi */

const BOARD = [
  { rank: 1, name: "Nilufar", rating: 2184, delta: 42 },
  { rank: 2, name: "Sardor", rating: 2077, delta: 18 },
  { rank: 3, name: "Kamola", rating: 1962, delta: -11 },
  { rank: 4, name: "Jasur", rating: 1908, delta: 7 },
];

/** Reyting jadvali — kichik namuna. Raqamlar monoshriftda, ustun tik. */
export function MiniLeaderboard({ className }: { className?: string }) {
  return (
    <div className={cn("pane overflow-hidden rounded-[var(--r-pane)]", className)}>
      <div className="flex items-center justify-between border-b border-[var(--edge)] px-4 py-3">
        <p className="t-eyebrow">Musobaqadan keyin</p>
        <span className="t-eyebrow">Reyting</span>
      </div>

      <ul className="divide-y divide-[var(--edge-soft)]">
        {BOARD.map((row) => (
          <li
            key={row.rank}
            className={cn(
              "row-mark flex items-center gap-3 px-4 py-2.5",
              row.rank === 1 && "bg-[var(--brand-wash)]",
            )}
            data-active={row.rank === 1 ? "true" : undefined}
          >
            <span
              className={cn(
                "t-num w-4 shrink-0 text-[12px] font-semibold",
                row.rank === 1 ? "text-[var(--brand)]" : "text-[var(--ink-4)]",
              )}
            >
              {row.rank}
            </span>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--edge)] bg-[var(--pane)] font-mono text-[10px] font-bold text-[var(--ink-3)]">
              {row.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--ink)]">
              {row.name}
            </span>
            <span className="t-num shrink-0 text-[12.5px] font-semibold text-[var(--ink)]">
              {formatNumber(row.rating)}
            </span>
            <span
              className="t-num w-9 shrink-0 text-right text-[11.5px] font-medium"
              style={{ color: row.delta > 0 ? "var(--ok)" : "var(--bad)" }}
            >
              {row.delta > 0 ? "+" : ""}
              {row.delta}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ tillar */

/** Qo'llab-quvvatlanadigan tillar — monoshriftda, kod ovozida. */
export function LanguagePills({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <span className="t-eyebrow">Tillar</span>
      {["Python", "JavaScript", "C++"].map((language) => (
        <span
          key={language}
          className="font-mono text-[12.5px] font-medium text-[var(--ink-2)]"
        >
          {language}
        </span>
      ))}
    </div>
  );
}

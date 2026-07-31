"use client";

import { Check, Loader2, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Interaktiv demo: til tanlanadi, "Ishga tushirish" bosiladi va testlar
 * ketma-ket o'tadi.
 *
 * Bu YASAMA tekshiruv — hech qanday kod bajarilmaydi va backendga so'rov
 * ketmaydi. Maqsad: mehmonga real judge oqimi qanday ko'rinishini
 * ro'yxatdan o'tmasdan turib ko'rsatish. Shu sababli natijalar oldindan
 * belgilangan va har doim bir xil.
 */

type LangKey = "python" | "cpp" | "js";

const LANGS: { key: LangKey; label: string; runtime: string; code: string[] }[] = [
  {
    key: "python",
    label: "Python",
    runtime: "41 ms",
    code: [
      "def two_sum(nums, target):",
      "    seen = {}",
      "    for i, x in enumerate(nums):",
      "        if target - x in seen:",
      "            return [seen[target - x], i]",
      "        seen[x] = i",
      "    return []",
    ],
  },
  {
    key: "cpp",
    label: "C++",
    runtime: "6 ms",
    code: [
      "vector<int> twoSum(vector<int>& a, int t) {",
      "    unordered_map<int,int> seen;",
      "    for (int i = 0; i < a.size(); ++i) {",
      "        auto it = seen.find(t - a[i]);",
      "        if (it != seen.end())",
      "            return {it->second, i};",
      "        seen[a[i]] = i;",
      "    }",
      "    return {};",
      "}",
    ],
  },
  {
    key: "js",
    label: "JavaScript",
    runtime: "58 ms",
    code: [
      "function twoSum(nums, target) {",
      "  const seen = new Map();",
      "  for (let i = 0; i < nums.length; i++) {",
      "    if (seen.has(target - nums[i]))",
      "      return [seen.get(target - nums[i]), i];",
      "    seen.set(nums[i], i);",
      "  }",
      "  return [];",
      "}",
    ],
  },
];

const TESTS = [
  { name: "Namuna 1", detail: "[2,7,11,15], 9 → [0,1]" },
  { name: "Namuna 2", detail: "[3,2,4], 6 → [1,2]" },
  { name: "Yashirin 1", detail: "n = 10⁴" },
  { name: "Yashirin 2", detail: "manfiy sonlar" },
  { name: "Yashirin 3", detail: "n = 10⁵, chegaraviy" },
];

type Phase = "idle" | "running" | "done";

export function CodeDemo() {
  const [lang, setLang] = useState<LangKey>("python");
  const [phase, setPhase] = useState<Phase>("idle");
  const [passed, setPassed] = useState(0);
  const timers = useRef<number[]>([]);

  const active = LANGS.find((item) => item.key === lang) ?? LANGS[0];

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  // Komponent yo'q qilinganda yoki til almashganda navbatdagi taymerlar
  // ishlab, holatni buzib qo'ymasin
  useEffect(() => clearTimers, []);

  const reset = () => {
    clearTimers();
    setPhase("idle");
    setPassed(0);
  };

  const run = () => {
    clearTimers();
    setPassed(0);
    setPhase("running");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPassed(TESTS.length);
      setPhase("done");
      return;
    }

    TESTS.forEach((_, index) => {
      const id = window.setTimeout(() => {
        setPassed(index + 1);
        if (index === TESTS.length - 1) setPhase("done");
      }, 420 * (index + 1));
      timers.current.push(id);
    });
  };

  return (
    <div className="stage-card overflow-hidden">
      {/* ----------------------------------------------------- til tanlash */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--stage-edge)] px-3 py-2">
        {LANGS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setLang(item.key);
              reset();
            }}
            aria-pressed={lang === item.key}
            className={cn(
              "focus-ring rounded-[var(--r-ctl)] px-3 py-1.5 font-mono text-[12.5px] font-medium",
              "transition-colors duration-[var(--t-fast)]",
              lang === item.key
                ? "bg-[color-mix(in_oklab,var(--stage-brand)_18%,transparent)] text-[var(--stage-brand)]"
                : "text-[var(--stage-ink-3)] hover:text-[var(--stage-ink-2)]",
            )}
          >
            {item.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {phase === "done" ? (
            <button type="button" onClick={reset} className="focus-ring rounded-[var(--r-ctl)] p-2 text-[var(--stage-ink-3)] transition-colors hover:text-[var(--stage-ink)]" aria-label="Qaytadan">
              <RotateCcw className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={run}
            disabled={phase === "running"}
            className={cn(
              "focus-ring inline-flex h-8 items-center gap-1.5 rounded-[var(--r-ctl)] px-3",
              "bg-[var(--brand)] text-[13px] font-medium text-[var(--ink-on-brand)]",
              "transition-colors duration-[var(--t-fast)] hover:bg-[var(--brand-hover)]",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {phase === "running" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Ishga tushirish
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- kod */}
        <pre className="overflow-x-auto border-b border-[var(--stage-edge)] px-4 py-4 font-mono text-[12.5px] leading-[1.75] text-[var(--stage-ink-2)] lg:border-r lg:border-b-0">
          <code>
            {active.code.map((line, index) => (
              <div key={index} className="flex gap-4">
                <span className="t-num w-4 shrink-0 text-right text-[var(--stage-ink-3)] opacity-60">
                  {index + 1}
                </span>
                <span className="whitespace-pre">{line}</span>
              </div>
            ))}
          </code>
        </pre>

        {/* ---------------------------------------------------- testlar */}
        <div className="flex min-w-0 flex-col">
          <ul className="flex-1 divide-y divide-[var(--stage-edge)]">
            {TESTS.map((test, index) => {
              const isPassed = index < passed;
              const isRunning = phase === "running" && index === passed;
              return (
                <li
                  key={test.name}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    isRunning && "test-running",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border",
                      isPassed
                        ? "border-[var(--stage-ok)] text-[var(--stage-ok)]"
                        : "border-[var(--stage-edge)] text-[var(--stage-ink-3)]",
                    )}
                  >
                    {isPassed ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[var(--stage-ink)]">
                      {test.name}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-[var(--stage-ink-3)]">
                      {test.detail}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          {/* ------------------------------------------------------ hukm */}
          <div className="border-t border-[var(--stage-edge)] px-4 py-3">
            {phase === "done" ? (
              <div className="enter flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--stage-ok)]">
                  <Check className="size-4" />
                  Accepted
                </span>
                <span className="t-num text-[12px] text-[var(--stage-ink-3)]">
                  {TESTS.length} / {TESTS.length} test
                </span>
                <span className="t-num text-[12px] text-[var(--stage-ink-3)]">
                  {active.runtime}
                </span>
              </div>
            ) : (
              <p className="text-[12.5px] text-[var(--stage-ink-3)]">
                {phase === "running"
                  ? "Testlar bajarilmoqda..."
                  : "Tilni tanlang va tekshiruvni ishga tushiring."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

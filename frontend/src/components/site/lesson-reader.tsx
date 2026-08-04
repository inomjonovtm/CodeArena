"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, Play, RotateCcw, Terminal } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, Button } from "@/components/kit";
import { CodeEditor } from "@/components/ui/code-editor";
import { Markdown } from "@/components/ui/markdown";
import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";
import type { CourseLanguage, SnippetRunResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Darslik o'qish oqimi
   --------------------------------------------------------------------------
   Ilgari nazariyadagi kod bloklari O'LIK matn edi: o'quvchi ularni ko'radi,
   lekin o'zgartirib ko'ra olmasdi. Ishlaydigan misollar esa alohida bo'limda
   turardi va ko'pincha o'sha kodning nusxasi bo'lardi. Ya'ni bitta narsa ikki
   joyda, ikkalasi ham yarim.

   Endi nazariyaning HAR BIR kod bloki tirik: nusxalash mumkin, kurs tilida
   bo'lsa — o'sha yerning o'zida o'zgartirib ishga tushiriladi. O'qish va
   sinash bir oqimda ketadi.

   Buning uchun matn kod bloklari bo'yicha bo'laklarga ajratiladi va har biri
   o'z komponenti bilan chiziladi. DOM'ni keyin «yamash» (querySelector bilan
   tugma qo'yish) ham mumkin edi, lekin u React bilan yarashmaydi: qayta
   chizilganda yamoqlar yo'qoladi yoki ikkilanadi.
   ========================================================================== */

type Part =
  | { kind: "md"; text: string }
  | { kind: "code"; lang: string; code: string };

/** Markdown matnini matn va kod bo'laklariga ajratadi. */
export function splitByCode(source: string): Part[] {
  const parts: Part[] = [];
  const fence = /```(\w+)?\n([\s\S]*?)```/g;
  let cursor = 0;

  for (let match = fence.exec(source); match; match = fence.exec(source)) {
    const before = source.slice(cursor, match.index);
    if (before.trim()) parts.push({ kind: "md", text: before });
    parts.push({ kind: "code", lang: match[1] ?? "", code: match[2].replace(/\n$/, "") });
    cursor = match.index + match[0].length;
  }

  const tail = source.slice(cursor);
  if (tail.trim()) parts.push({ kind: "md", text: tail });
  return parts;
}

/** Kodni almashtirish tugmasi — muvaffaqiyatda belgi ko'rsatadi. */
function CopyButton({ code }: { code: string }) {
  const [done, setDone] = useState(false);

  return (
    <Button
      size="sm"
      variant="ghost"
      icon={done ? <Check className="size-3.5 text-[var(--ok)]" /> : <Copy className="size-3.5" />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          // Clipboard API `https` yoki ruxsat talab qiladi — bunda jim qolamiz,
          // matnni qo'lda belgilash baribir mumkin.
        }
      }}
    >
      {done ? "Nusxalandi" : "Nusxalash"}
    </Button>
  );
}

/**
 * Nazariya ichidagi kod bloki.
 *
 * Til kurs tiliga mos kelsa — «Sinab ko'rish» tugmasi chiqadi. Mos kelmasa
 * (masalan `bash` yoki `text` bloki) faqat nusxalash qoladi: judge uni
 * baribir bajara olmaydi va tugma faqat xato berardi.
 */
function CodeCard({
  code,
  lang,
  runnable,
}: {
  code: string;
  lang: string;
  runnable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(code);
  const [result, setResult] = useState<SnippetRunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: () => publicApi.courses.run({ language: lang, code: draft }),
    onSuccess: (data) => {
      setResult(data);
      setFailure(null);
    },
    onError: (error: unknown) => {
      setResult(null);
      setFailure(error instanceof ApiError ? error.message : "Kodni bajarib bo'lmadi.");
    },
  });

  return (
    <div className="my-5 overflow-hidden rounded-[var(--r-field)] border border-[var(--edge)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--edge)] bg-[var(--pane-sunken)] px-3 py-1.5">
        <span className="t-eyebrow normal-case tracking-normal">{lang || "kod"}</span>
        <div className="flex items-center gap-0.5">
          <CopyButton code={code} />
          {runnable ? (
            <Button
              size="sm"
              variant="ghost"
              icon={open ? <ChevronDown className="size-3.5" /> : <Play className="size-3.5" />}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Yopish" : "Sinab ko'rish"}
            </Button>
          ) : null}
        </div>
      </div>

      <pre className="overflow-x-auto bg-[var(--pane-solid)] px-4 py-3.5 font-[var(--font-mono)] text-[13px] leading-relaxed text-[var(--ink)]">
        <code>{code}</code>
      </pre>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-[var(--edge)] bg-[var(--pane-sunken)] p-4">
          <CodeEditor
            value={draft}
            onChange={setDraft}
            language={lang}
            height={`${Math.min(Math.max(draft.split("\n").length, 4) * 20 + 32, 400)}px`}
            expandable
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="brand"
              icon={<Play className="size-3.5" />}
              loading={run.isPending}
              onClick={() => run.mutate()}
            >
              Ishga tushirish
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCcw className="size-3.5" />}
              onClick={() => {
                setDraft(code);
                setResult(null);
                setFailure(null);
              }}
            >
              Asl kodga qaytarish
            </Button>
          </div>

          {failure ? <Alert tone="bad">{failure}</Alert> : null}

          {result ? (
            <div className="overflow-hidden rounded-[var(--r-field)] border border-[var(--edge)]">
              <div
                className={cn(
                  "t-eyebrow flex items-center gap-2 border-b border-[var(--edge)] px-3.5 py-2",
                  "bg-[var(--pane-solid)]",
                  result.status === "EXECUTED" ? "text-[var(--ok)]" : "text-[var(--bad)]",
                )}
              >
                <Terminal className="size-3.5" />
                Natija
                {result.runtime_ms ? (
                  <span className="t-num ml-auto font-normal text-[var(--ink-4)]">
                    {result.runtime_ms} ms
                  </span>
                ) : null}
              </div>
              <pre className="max-h-56 overflow-auto bg-[var(--pane-solid)] px-3.5 py-3 font-[var(--font-mono)] text-[12.5px] leading-relaxed whitespace-pre-wrap text-[var(--ink-2)]">
                {result.compile_output || result.stderr || result.stdout || "(chiqish bo'sh)"}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Nazariya matni — kod bloklari tirik holda.
 *
 * `language` — kurs tili. Faqat shu tildagi bloklarda «Sinab ko'rish»
 * ko'rsatiladi.
 */
export function LessonReader({
  source,
  language,
  className,
}: {
  source: string;
  language: CourseLanguage;
  className?: string;
}) {
  const parts = useMemo(() => splitByCode(source), [source]);

  return (
    <div className={className}>
      {parts.map((part, index) =>
        part.kind === "md" ? (
          <Markdown key={index} source={part.text} />
        ) : (
          <CodeCard
            key={index}
            code={part.code}
            lang={part.lang || language}
            runnable={(part.lang || language) === language}
          />
        ),
      )}
    </div>
  );
}

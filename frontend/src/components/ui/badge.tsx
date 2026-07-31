"use client";

import { rankChipStyle } from "@/lib/rank";
import { cn } from "@/lib/utils";
import type { Difficulty, PublishState, RankInfo, Role, SubmissionStatus } from "@/lib/types";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "outline";

/* To'yingan fon o'rniga rang "yuvindisi" (wash) — jadvalda tinch turadi. */
const TONES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--pane-sunken)] text-[var(--ink-2)]",
  success: "bg-[var(--ok-wash)] text-[var(--ok)]",
  warning: "bg-[var(--warn-wash)] text-[var(--warn)]",
  danger: "bg-[var(--bad-wash)] text-[var(--bad)]",
  info: "bg-[var(--note-wash)] text-[var(--note)]",
  accent: "bg-[var(--brand-wash)] text-[var(--brand-ink)]",
  outline: "border border-[var(--edge-strong)] text-[var(--ink-3)]",
};

export function Badge({
  tone = "neutral",
  className,
  dot,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--r-chip)] px-2 py-0.5 text-[11px] font-medium leading-5",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

// ------------------------------------------------- domenga xos badge'lar
const DIFFICULTY: Record<Difficulty, { tone: BadgeTone; label: string }> = {
  easy: { tone: "success", label: "Oson" },
  medium: { tone: "warning", label: "O'rta" },
  hard: { tone: "danger", label: "Qiyin" },
};

export function DifficultyBadge({ value }: { value: Difficulty }) {
  const config = DIFFICULTY[value] ?? DIFFICULTY.easy;
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

/** 8-bo'limdagi status jadvaliga mos ranglar. */
/* Judge statuslari atayin inglizcha atama bilan qoladi: «Accepted»,
   «Wrong Answer» — bular butun dunyoda shu ko'rinishda ishlatiladi va
   tarjimasi foydalanuvchini chalg'itardi. Bu ikkinchi til emas, atama. */
const STATUS: Record<SubmissionStatus, { tone: BadgeTone; label: string }> = {
  PENDING: { tone: "neutral", label: "Navbatda" },
  JUDGING: { tone: "neutral", label: "Tekshirilmoqda" },
  ACCEPTED: { tone: "success", label: "Accepted" },
  WRONG_ANSWER: { tone: "danger", label: "Wrong Answer" },
  TIME_LIMIT_EXCEEDED: { tone: "warning", label: "Time Limit" },
  MEMORY_LIMIT_EXCEEDED: { tone: "warning", label: "Memory Limit" },
  RUNTIME_ERROR: { tone: "danger", label: "Runtime Error" },
  COMPILE_ERROR: { tone: "danger", label: "Compile Error" },
  SYSTEM_ERROR: { tone: "neutral", label: "Tizim xatosi" },
};

export function StatusBadge({ value }: { value: SubmissionStatus }) {
  const config = STATUS[value] ?? STATUS.SYSTEM_ERROR;
  const spinning = value === "PENDING" || value === "JUDGING";
  return (
    <Badge tone={config.tone} dot={!spinning}>
      {spinning ? (
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {config.label}
    </Badge>
  );
}

const PUBLISH: Record<PublishState, { tone: BadgeTone; label: string }> = {
  draft: { tone: "neutral", label: "Qoralama" },
  published: { tone: "success", label: "Chop etilgan" },
  archived: { tone: "outline", label: "Arxivlangan" },
};

export function PublishBadge({ value }: { value: PublishState }) {
  const config = PUBLISH[value] ?? PUBLISH.draft;
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const ROLES: Record<Role, { tone: BadgeTone; label: string }> = {
  user: { tone: "outline", label: "Foydalanuvchi" },
  moderator: { tone: "info", label: "Moderator" },
  admin: { tone: "accent", label: "Administrator" },
};

export function RoleBadge({ value }: { value: Role }) {
  const config = ROLES[value] ?? ROLES.user;
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

export function LanguageBadge({ value }: { value: string }) {
  return (
    <Badge tone="outline">{LANGUAGE_LABEL[value] ?? value}</Badge>
  );
}

export function TagChip({ tag }: { tag: { name_uz: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center rounded-[var(--r-chip)] px-2 py-0.5 text-[11px] font-medium leading-5"
      style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}
    >
      {tag.name_uz}
    </span>
  );
}

// ------------------------------------------------------------------- rank
/**
 * Admin paneldagi rank nishoni.
 *
 * Ranglar backenddan keladi (`apps/core/ranks.py`), shuning uchun bu yerda
 * hech qanday ro'yxat takrorlanmaydi — sayt qismidagi nishon bilan bir xil
 * chiqadi. Kvadrat to'ldirmasi `rankChipStyle` orqali QAT'IY rangga
 * aylantiriladi (gradient ham, shaffoflik ham yo'q).
 */
export function AdminRankBadge({
  rank,
  showName,
  className,
}: {
  rank: RankInfo | null | undefined;
  showName?: boolean;
  className?: string;
}) {
  if (!rank) return <span className="text-[var(--ink-4)]">—</span>;

  return (
    <span
      title={`${rank.name_uz} · ${rank.min_rating}+`}
      className={cn("inline-flex items-center gap-1.5", className)}
      style={{ color: rank.color }}
    >
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold"
        style={rankChipStyle(rank)}
      >
        {rank.division || rank.name_uz.slice(0, 1)}
      </span>
      {showName ? (
        <span className="whitespace-nowrap text-[12.5px] font-medium">{rank.name_uz}</span>
      ) : null}
    </span>
  );
}

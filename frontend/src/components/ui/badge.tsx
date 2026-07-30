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
const DIFFICULTY: Record<Difficulty, { tone: BadgeTone; uz: string; en: string }> = {
  easy: { tone: "success", uz: "Oson", en: "Easy" },
  medium: { tone: "warning", uz: "O'rta", en: "Medium" },
  hard: { tone: "danger", uz: "Qiyin", en: "Hard" },
};

export function DifficultyBadge({ value, locale = "uz" }: { value: Difficulty; locale?: "uz" | "en" }) {
  const config = DIFFICULTY[value] ?? DIFFICULTY.easy;
  return <Badge tone={config.tone}>{locale === "en" ? config.en : config.uz}</Badge>;
}

/** 8-bo'limdagi status jadvaliga mos ranglar. */
const STATUS: Record<SubmissionStatus, { tone: BadgeTone; uz: string; en: string }> = {
  PENDING: { tone: "neutral", uz: "Navbatda", en: "Pending" },
  JUDGING: { tone: "neutral", uz: "Tekshirilmoqda", en: "Judging" },
  ACCEPTED: { tone: "success", uz: "Accepted", en: "Accepted" },
  WRONG_ANSWER: { tone: "danger", uz: "Wrong Answer", en: "Wrong Answer" },
  TIME_LIMIT_EXCEEDED: { tone: "warning", uz: "Time Limit", en: "Time Limit" },
  MEMORY_LIMIT_EXCEEDED: { tone: "warning", uz: "Memory Limit", en: "Memory Limit" },
  RUNTIME_ERROR: { tone: "danger", uz: "Runtime Error", en: "Runtime Error" },
  COMPILE_ERROR: { tone: "danger", uz: "Compile Error", en: "Compile Error" },
  SYSTEM_ERROR: { tone: "neutral", uz: "Tizim xatosi", en: "System Error" },
};

export function StatusBadge({ value, locale = "uz" }: { value: SubmissionStatus; locale?: "uz" | "en" }) {
  const config = STATUS[value] ?? STATUS.SYSTEM_ERROR;
  const spinning = value === "PENDING" || value === "JUDGING";
  return (
    <Badge tone={config.tone} dot={!spinning}>
      {spinning ? (
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {locale === "en" ? config.en : config.uz}
    </Badge>
  );
}

const PUBLISH: Record<PublishState, { tone: BadgeTone; uz: string; en: string }> = {
  draft: { tone: "neutral", uz: "Qoralama", en: "Draft" },
  published: { tone: "success", uz: "Chop etilgan", en: "Published" },
  archived: { tone: "outline", uz: "Arxivlangan", en: "Archived" },
};

export function PublishBadge({ value, locale = "uz" }: { value: PublishState; locale?: "uz" | "en" }) {
  const config = PUBLISH[value] ?? PUBLISH.draft;
  return <Badge tone={config.tone}>{locale === "en" ? config.en : config.uz}</Badge>;
}

const ROLES: Record<Role, { tone: BadgeTone; uz: string; en: string }> = {
  user: { tone: "outline", uz: "Foydalanuvchi", en: "User" },
  moderator: { tone: "info", uz: "Moderator", en: "Moderator" },
  admin: { tone: "accent", uz: "Administrator", en: "Admin" },
};

export function RoleBadge({ value, locale = "uz" }: { value: Role; locale?: "uz" | "en" }) {
  const config = ROLES[value] ?? ROLES.user;
  return <Badge tone={config.tone}>{locale === "en" ? config.en : config.uz}</Badge>;
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

export function LanguageBadge({ value }: { value: string }) {
  return (
    <Badge tone="outline" className="font-mono">
      {LANGUAGE_LABEL[value] ?? value}
    </Badge>
  );
}

export function TagChip({ tag, locale = "uz" }: { tag: { name_uz: string; name_en: string; color: string }; locale?: "uz" | "en" }) {
  return (
    <span
      className="inline-flex items-center rounded-[var(--r-chip)] px-2 py-0.5 text-[11px] font-medium leading-5"
      style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}
    >
      {locale === "en" ? tag.name_en : tag.name_uz}
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

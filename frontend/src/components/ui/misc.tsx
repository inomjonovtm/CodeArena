"use client";

import { Check, ChevronDown, Copy, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ringStyle, ringWidth } from "@/lib/rank";
import type { RankInfo } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

import { Button } from "./button";

// ----------------------------------------------------------------- Avatar
const AVATAR_PX = { xs: 24, sm: 32, md: 36, lg: 56 } as const;

/**
 * Profil rasmi — rank ramkasi bilan (admin panel varianti).
 *
 * Sayt qismidagi `Avatar` bilan bir xil ramkani chizadi: ikkalasi ham
 * `lib/rank.ts` dagi hisoblagichlarni ishlatadi, shuning uchun bir foydalanuvchi
 * ikki joyda bir xil ko'rinadi.
 */
export function Avatar({
  src,
  name,
  size = "md",
  rank,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  rank?: RankInfo | null;
  className?: string;
}) {
  const px = AVATAR_PX[size];
  const ring = ringWidth(px);
  const inner = rank ? px - ring * 2 : px;

  const face = (
    <div
      style={{ width: inner, height: inner, fontSize: Math.max(9, inner * 0.36) }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-wash)] font-semibold text-[var(--brand-ink)]",
        !rank && className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );

  if (!rank) return face;

  return (
    <div
      title={rank.name_uz}
      style={{ width: px, height: px, ...ringStyle(rank, px) }}
      className={cn("flex shrink-0 items-center justify-center rounded-full", className)}
    >
      {face}
    </div>
  );
}

// ------------------------------------------------------------------ Tabs
export interface TabItem {
  key: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

/* Botiq trek ichida oq "tugma" — ostki chiziqli tab emas. */
export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <div className="flex min-w-max gap-0.5 rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] p-1">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "relative flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3.5 py-1.5 text-[13px] font-medium focus-ring",
                "transition-colors duration-[var(--t-fast)]",
                isActive
                  ? "bg-[var(--pane-solid)] text-[var(--ink)] shadow-[var(--lift-1),0_0_0_1px_var(--edge-soft)]"
                  : "text-[var(--ink-3)] hover:text-[var(--ink)]",
              )}
            >
              {item.icon}
              {item.label}
              {item.badge !== undefined && item.badge !== null ? (
                <span
                  className={cn(
                    "t-num rounded-[var(--r-chip)] px-1.5 py-px text-[10px] font-semibold",
                    isActive
                      ? "bg-[var(--brand-wash)] text-[var(--brand-ink)]"
                      : "bg-[var(--pane-sunken)] text-[var(--ink-4)]",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- CopyButton
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      icon={copied ? <Check className="size-3.5 text-[var(--ok)]" /> : <Copy className="size-3.5" />}
    >
      {label}
    </Button>
  );
}

// -------------------------------------------------------------- MultiSelect
export function MultiSelect<T extends { id: string | number }>({
  options,
  value,
  onChange,
  labelOf,
  colorOf,
  placeholder = "Tanlang...",
  emptyText = "Variant yo'q",
}: {
  options: T[];
  value: (string | number)[];
  onChange: (next: (string | number)[]) => void;
  labelOf: (option: T) => string;
  colorOf?: (option: T) => string | undefined;
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = useMemo(
    () => options.filter((option) => labelOf(option).toLowerCase().includes(query.toLowerCase())),
    [options, query, labelOf],
  );
  const selectedOptions = options.filter((option) => value.includes(option.id));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-[var(--r-field)] border border-[var(--edge)]",
          "bg-[var(--pane-sunken)] px-3 py-1.5 text-left text-sm focus-ring",
          "transition-[background-color,border-color,box-shadow] duration-[var(--t-fast)]",
          "hover:border-[var(--edge)]",
          open && "border-[var(--brand-edge)] bg-[var(--pane-solid)] shadow-[0_0_0_var(--focus-w)_var(--focus)]",
        )}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-[var(--ink-4)]">{placeholder}</span>
        ) : (
          selectedOptions.map((option) => {
            const color = colorOf?.(option);
            return (
              <span
                key={option.id}
                className="inline-flex items-center gap-1 rounded-[var(--r-chip)] px-2 py-0.5 text-[11px] font-medium"
                style={
                  color
                    ? { backgroundColor: `${color}1f`, color }
                    : { backgroundColor: "var(--brand-wash)", color: "var(--brand-ink)" }
                }
              >
                {labelOf(option)}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(value.filter((id) => id !== option.id));
                  }}
                  className="cursor-pointer opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </span>
              </span>
            );
          })
        )}
        <ChevronDown className="ml-auto size-4 shrink-0 text-[var(--ink-4)]" />
      </button>

      {open ? (
        <div className="enter-pop absolute z-30 mt-1.5 w-full origin-top overflow-hidden rounded-[var(--r-pane)] pane-float">
          <div className="border-b border-[var(--edge)] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-4)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Qidirish..."
                className={cn(
                  "h-8 w-full rounded-[var(--r-ctl)] border border-[var(--edge)] bg-[var(--pane-sunken)] pl-8 pr-2",
                  "text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]",
                  "focus:border-[var(--brand-edge)] focus:bg-[var(--pane-solid)]",
                )}
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-[var(--ink-4)]">{emptyText}</p>
            ) : (
              filtered.map((option) => {
                const checked = value.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      onChange(
                        checked ? value.filter((id) => id !== option.id) : [...value, option.id],
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-[var(--r-ctl)] px-2 py-1.5 text-left text-[13px] text-[var(--ink-2)] transition-colors hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                        checked
                          ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--ink-on-brand)]"
                          : "border-[var(--edge-strong)]",
                      )}
                    >
                      {checked ? <Check className="size-3" /> : null}
                    </span>
                    <span className="truncate">{labelOf(option)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------- CodeBlock
export function CodeBlock({
  code,
  language,
  maxHeight = "24rem",
  highlightLines,
  className,
}: {
  code: string;
  language?: string;
  maxHeight?: string;
  highlightLines?: number[];
  className?: string;
}) {
  const lines = code.split("\n");
  const highlight = new Set(highlightLines ?? []);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-solid)]",
        className,
      )}
    >
      {language ? (
        <div className="flex items-center justify-between border-b border-[var(--edge)] bg-[var(--pane-sunken)] px-3 py-1.5">
          <span className="t-eyebrow font-mono normal-case">{language}</span>
          <CopyButton value={code} />
        </div>
      ) : null}
      <div className="scrollbar-thin overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse font-mono text-[12.5px] leading-[1.6]">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className={cn(highlight.has(index + 1) && "bg-[var(--warn-wash)]")}>
                <td className="w-10 select-none border-r border-[var(--edge)] px-2 text-right align-top text-[var(--ink-4)]">
                  {index + 1}
                </td>
                <td className="whitespace-pre px-3 text-[var(--ink)]">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Stat
export function StatRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-1.5 text-sm", className)}>
      <span className="text-[var(--ink-3)]">{label}</span>
      <span className="t-num font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  className,
}: {
  value: number;
  max?: number;
  tone?: "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const colors = {
    accent: "var(--brand)",
    success: "var(--ok)",
    warning: "var(--warn)",
    danger: "var(--bad)",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--pane-sunken)]", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-[var(--t-slow)] ease-[var(--ease-soft)]"
        style={{ width: `${percent}%`, backgroundColor: colors[tone] }}
      />
    </div>
  );
}

"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

export interface SegmentOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Tanlanganda ishlatiladigan rang. Berilmasa — brend. */
  tone?: "accent" | "success" | "warning" | "danger" | "neutral";
  title?: string;
}

/* Tanlangan segment rang yuvindisini oladi — to'yingan fon emas. */
const TONE_ACTIVE: Record<NonNullable<SegmentOption["tone"]>, string> = {
  accent: "bg-[var(--brand-wash)] text-[var(--brand-ink)]",
  success: "bg-[var(--ok-wash)] text-[var(--ok)]",
  warning: "bg-[var(--warn-wash)] text-[var(--warn)]",
  danger: "bg-[var(--bad-wash)] text-[var(--bad)]",
  neutral: "bg-[var(--pane-solid)] text-[var(--ink)] shadow-[var(--lift-1),0_0_0_1px_var(--edge-soft)]",
};

/**
 * Bir nechta variantdan bittasini tanlash — dropdown emas, ko'rinib turgan
 * tugmalar. 2–4 variantli filtrlar uchun select'dan tez va tushunarli:
 * variantlar yashirin emas, tanlash bir bosishda bo'ladi.
 *
 * `allLabel` berilsa — chapda "hammasi" (bo'sh qiymat) tugmasi qo'shiladi.
 */
export function SegmentedControl({
  value,
  onChange,
  options,
  allLabel,
  label,
  size = "md",
  stacked,
  className,
  ariaLabel,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  options: SegmentOption[];
  /** "Barchasi" tugmasi matni — filtr uchun. Berilmasa qo'shilmaydi. */
  allLabel?: string;
  /** Guruh oldidagi kichik izoh, masalan "Holat". */
  label?: string;
  size?: "sm" | "md";
  /** Sarlavha yonida emas, ustida. Filtr panelidagi katakchalar uchun. */
  stacked?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const items: SegmentOption[] = allLabel
    ? [{ value: "", label: allLabel, tone: "neutral" }, ...options]
    : options;

  const current = value ?? "";
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.value === current),
  );

  // ← → bilan yurish (radiogroup uchun standart xulq)
  const onKeyDown = (event: React.KeyboardEvent) => {
    const direction =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "Home" ? 0 : event.key === "End" ? 0 : null;
    if (direction === null) return;
    event.preventDefault();

    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (activeIndex + direction + items.length) % items.length;

    onChange(items[next].value);
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>("[role='radio']");
    buttons?.[next]?.focus();
  };

  return (
    <div
      className={cn(
        stacked ? "flex min-w-0 flex-col gap-1.5" : "inline-flex items-center gap-1.5",
        className,
      )}
    >
      {label ? (
        <span
          className={cn(
            "whitespace-nowrap",
            stacked ? "t-eyebrow" : "text-[12px] font-medium text-[var(--ink-4)]",
          )}
        >
          {label}
        </span>
      ) : null}
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={ariaLabel ?? label}
        onKeyDown={onKeyDown}
        className={cn(
          "items-center rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] p-1",
          stacked ? "flex w-full" : "inline-flex",
          size === "sm" ? "h-8" : "h-9",
        )}
      >
        {items.map((item) => {
          const isActive = item.value === current;
          return (
            <button
              key={item.value || "__all__"}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              title={item.title}
              onClick={() => onChange(item.value)}
              className={cn(
                "inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 font-medium focus-ring",
                "transition-colors duration-[var(--t-fast)]",
                size === "sm" ? "text-[12px]" : "text-[13px]",
                // Ustunli rejimda tugmalar kenglikni teng bo'lishadi
                stacked && "min-w-0 flex-1 truncate",
                isActive
                  ? TONE_ACTIVE[item.tone ?? "accent"]
                  : "text-[var(--ink-3)] hover:text-[var(--ink)]",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Bitta yoqib/o'chiriladigan filtr — "Faqat testsiz" kabi.
 * Uch holatli select o'rniga bosiladigan chip.
 */
export function ToggleChip({
  active,
  onChange,
  icon,
  children,
  tone = "accent",
  count,
  className,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: NonNullable<SegmentOption["tone"]>;
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onChange(!active)}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[var(--r-ctl)] border px-3.5 text-[13px] font-medium focus-ring",
        "transition-[background-color,border-color,color] duration-[var(--t-fast)]",
        active
          ? cn("border-[var(--brand-edge)]", TONE_ACTIVE[tone])
          : "border-[var(--edge)] bg-[var(--pane-sunken)] text-[var(--ink-3)] hover:border-[var(--edge-strong)] hover:text-[var(--ink)]",
        className,
      )}
    >
      {icon}
      {children}
      {count !== undefined && count > 0 ? (
        <span className="t-num text-[11px] font-semibold opacity-70">{count}</span>
      ) : null}
    </button>
  );
}

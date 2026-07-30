"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

/** Raqamli sahifalash — aktiv sahifa brend rangida. */
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const items = useMemo<(number | "…")[]>(() => {
    const total = Math.max(totalPages, 1);
    const wanted = new Set<number>([1, 2, total - 1, total, page - 1, page, page + 1]);
    const list = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    let prev = 0;
    for (const p of list) {
      if (p - prev > 1) out.push("…");
      out.push(p);
      prev = p;
    }
    return out;
  }, [page, totalPages]);

  const arrowClass = cn(
    "flex size-8 items-center justify-center rounded-[var(--r-ctl)] text-[var(--ink-3)] focus-ring",
    "transition-colors duration-[var(--t-fast)]",
    "hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
    "disabled:pointer-events-none disabled:opacity-35",
  );

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Sahifalash">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Oldingi sahifa"
        className={arrowClass}
      >
        <ChevronLeft className="size-4" />
      </button>

      {items.map((item, index) =>
        item === "…" ? (
          <span key={`gap-${index}`} className="px-1 text-[13px] text-[var(--ink-4)]">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "t-num flex size-8 items-center justify-center rounded-[var(--r-ctl)] text-[13px] focus-ring",
              "transition-colors duration-[var(--t-fast)]",
              item === page
                ? "bg-[var(--brand)] font-semibold text-[var(--ink-on-brand)]"
                : "text-[var(--ink-3)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Keyingi sahifa"
        className={arrowClass}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

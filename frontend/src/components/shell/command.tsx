"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CornerDownLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { KeyHint } from "@/components/kit";
import { publicApi } from "@/lib/public-api";
import { cn } from "@/lib/utils";

import { useNavModel } from "./nav-model";

/* ==========================================================================
   Buyruq paneli (⌘K)
   --------------------------------------------------------------------------
   Qidiruv oynasi emas, boshqaruv markazi: bo'sh holatda barcha bo'limlarga
   sakrash, matn kiritilganda esa jonli natijalar.

   Klaviatura to'liq qo'llab-quvvatlanadi: ↑↓ tanlash, ⏎ ochish, Esc yopish.
   Tanlangan qator doim ko'rinishda qoladi (`scrollIntoView`), aks holda uzun
   ro'yxatda klaviatura bilan yurish "ko'r" bo'lib qoladi.

   Panel ekran markazida emas, yuqoridan 14% da: ko'z tabiiy ravishda yuqori
   uchdan birga qaraydi va natijalar ro'yxati pastga o'sadi.
   ========================================================================== */

type Row = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href: string;
};

const TYPE_LABELS: Record<string, string> = {
  problem: "Masalalar",
  contest: "Musobaqalar",
  user: "Foydalanuvchilar",
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { groups } = useNavModel();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const trimmed = query.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["command-search", trimmed],
    queryFn: () => publicApi.search(trimmed, 5),
    enabled: open && trimmed.length >= 2,
    staleTime: 20_000,
  });

  const rows: Row[] = useMemo(() => {
    // Matn yo'q — barcha bo'limlar ro'yxati
    if (trimmed.length < 2) {
      return groups.flatMap((group) =>
        group.links.map((link) => ({
          id: link.href,
          label: link.label,
          group: group.label,
          href: link.href,
        })),
      );
    }

    // Server tekis ro'yxat qaytaradi — turi bo'yicha guruhlaymiz, tartib
    // saqlanadi (server relevantlik bo'yicha saralab bergan)
    const result: Row[] = (data?.results ?? []).map((item) => ({
      id: `${item.type}-${item.id}`,
      label: item.title || item.title_en,
      hint: item.subtitle || undefined,
      group: TYPE_LABELS[item.type],
      href: item.url,
    }));

    result.push({
      id: "all",
      label: `"${trimmed}" bo'yicha to'liq qidiruv`,
      group: "Qidiruv",
      href: `/search?q=${encodeURIComponent(trimmed)}`,
    });
    return result;
  }, [trimmed, data, groups]);

  useEffect(() => setCursor(0), [trimmed, rows.length]);

  // Tanlangan qator ko'rinish maydonida qolsin
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: "nearest",
    });
  }, [cursor]);

  const go = (row?: Row) => {
    if (!row) return;
    onClose();
    router.push(row.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((previous) => (previous + 1) % Math.max(1, rows.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((previous) => (previous - 1 + rows.length) % Math.max(1, rows.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(rows[cursor]);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  if (!mounted || !open) return null;

  let lastGroup = "";

  return createPortal(
    <div className="fixed inset-0 z-110 flex items-start justify-center px-4 pt-[14vh]">
      <div className="enter-veil absolute inset-0 bg-[rgb(26_25_23/0.44)] backdrop-blur-[2px]" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buyruq paneli"
        className={cn(
          "enter-pop relative flex w-full max-w-xl flex-col overflow-hidden",
          "rounded-[var(--r-pane)] border border-[var(--edge)] bg-[var(--pane-solid)]",
          "shadow-[var(--lift-pop)]",
        )}
      >
        <div className="flex items-center gap-3 border-b border-[var(--edge)] px-4">
          {isFetching ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-[var(--brand)]" />
          ) : (
            /* Kursor belgisi — logotip bilan bir xil, panel "buyruq qatori" */
            <span className="shrink-0 font-mono text-[15px] font-bold text-[var(--brand)]">&gt;</span>
          )}
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Masala, musobaqa, foydalanuvchi yoki bo'lim..."
            aria-label="Qidiruv"
            className={cn(
              "h-13 min-w-0 flex-1 bg-transparent text-[14.5px] text-[var(--ink)] outline-none",
              "placeholder:text-[var(--ink-4)]",
            )}
          />
          <KeyHint className="shrink-0">Esc</KeyHint>
        </div>

        <div ref={listRef} className="max-h-[52vh] min-h-0 overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13.5px] text-[var(--ink-4)]">
              Hech narsa topilmadi.
            </p>
          ) : (
            rows.map((row, index) => {
              const showGroup = row.group !== lastGroup;
              lastGroup = row.group;
              const active = index === cursor;

              return (
                <div key={row.id}>
                  {showGroup ? <p className="t-eyebrow px-3 pt-3 pb-1.5">{row.group}</p> : null}
                  <button
                    type="button"
                    data-active={active}
                    onMouseMove={() => setCursor(index)}
                    onClick={() => go(row)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-left",
                      "transition-colors duration-75",
                      active ? "bg-[var(--brand-wash)]" : "hover:bg-[var(--pane-hover)]",
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13.5px] font-medium",
                        active ? "text-[var(--brand-ink)]" : "text-[var(--ink)]",
                      )}
                    >
                      {row.label}
                    </span>
                    {row.hint ? (
                      <span className="shrink-0 text-[12px] text-[var(--ink-4)]">{row.hint}</span>
                    ) : null}
                    {active ? (
                      <CornerDownLeft className="size-3.5 shrink-0 text-[var(--brand)]" />
                    ) : (
                      <ArrowRight className="size-3.5 shrink-0 text-[var(--ink-4)] opacity-0" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-4 border-t border-[var(--edge)] bg-[var(--pane-sunken)]",
            "px-4 py-2 text-[11.5px] text-[var(--ink-4)]",
          )}
        >
          <span className="flex items-center gap-1.5">
            <KeyHint>↑↓</KeyHint>
            tanlash
          </span>
          <span className="flex items-center gap-1.5">
            <KeyHint>⏎</KeyHint>
            ochish
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useI18n, usePermissions } from "@/components/providers";
import { api } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

import { buildNav, commandIcons } from "./nav-config";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ReactNode;
  group: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const permissions = usePermissions();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  // Sahifalar (statik)
  const pages = useMemo<CommandItem[]>(() => {
    const rows: CommandItem[] = [];
    for (const group of buildNav(t)) {
      for (const item of group.items) {
        if (item.perm && !permissions.codes.includes(item.perm)) continue;
        rows.push({
          id: item.href,
          title: item.label,
          subtitle: item.href,
          url: item.href,
          icon: item.icon,
          group: group.label || t.nav.dashboard,
        });
      }
    }
    return rows;
  }, [t, permissions]);

  // Backend global qidiruv
  const { data, isFetching } = useQuery({
    queryKey: ["command-search", query],
    queryFn: () => api.get<{ results: SearchResult[] }>("/admin/search/", { q: query }),
    enabled: open && query.trim().length >= 2,
    staleTime: 10_000,
  });

  const items = useMemo<CommandItem[]>(() => {
    const normalized = query.trim().toLowerCase();
    const pageMatches = normalized
      ? pages.filter((page) => page.title.toLowerCase().includes(normalized))
      : pages;

    const remote =
      data?.results.map((row) => ({
        id: `${row.type}-${row.id}`,
        title: row.title,
        subtitle: row.subtitle,
        url: row.url,
        icon: commandIcons[row.type] ?? commandIcons.page,
        group:
          row.type === "problem"
            ? t.nav.problems
            : row.type === "user"
              ? t.nav.users
              : t.nav.contests,
      })) ?? [];

    return [...pageMatches.slice(0, 8), ...remote];
  }, [pages, data, query, t]);

  useEffect(() => setCursor(0), [items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((value) => Math.min(value + 1, items.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((value) => Math.max(value - 1, 0));
      } else if (event.key === "Enter" && items[cursor]) {
        event.preventDefault();
        router.push(items[cursor].url);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items, cursor, router, onClose]);

  if (!open || typeof document === "undefined") return null;

  let lastGroup = "";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      {/* Parda — to'q, ammo blursiz: oq bilan ko'k aralashmasin */}
      <div className="enter-veil absolute inset-0 bg-[rgb(10_10_10/0.5)]" onClick={onClose} />

      <div className="enter-pop pane-float relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--r-pane-lg)]">
        {/* -------------------------------------------------------- qidiruv */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--edge)] px-4">
          <Search className="size-4 shrink-0 text-[var(--ink-4)]" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${t.common.search}: masala, foydalanuvchi, contest, sahifa...`}
            aria-label={t.common.search}
            className="h-13 flex-1 bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]"
          />
          {isFetching ? <Loader2 className="size-4 shrink-0 animate-spin text-[var(--brand)]" /> : null}
          <kbd className="hidden shrink-0 rounded-[6px] bg-[var(--pane-sunken)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-4)] sm:block">
            ESC
          </kbd>
        </div>

        {/* -------------------------------------------------------- natijalar */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13.5px] text-[var(--ink-4)]">
              {t.common.noResults}
            </p>
          ) : (
            items.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const active = index === cursor;
              return (
                <div key={item.id}>
                  {showGroup ? <p className="t-eyebrow px-2.5 pb-1 pt-2.5">{item.group}</p> : null}
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => {
                      router.push(item.url);
                      onClose();
                    }}
                    className={cn(
                      "focus-ring flex w-full items-center gap-3 rounded-[var(--r-ctl)] px-2.5 py-2 text-left",
                      "transition-colors duration-[var(--t-fast)]",
                      active
                        ? "bg-[var(--brand-wash)] text-[var(--brand-ink)]"
                        : "text-[var(--ink-2)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
                    )}
                  >
                    <span className={cn("shrink-0", active ? "text-[var(--brand)]" : "text-[var(--ink-4)]")}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{item.title}</span>
                      {item.subtitle ? (
                        <span className="block truncate text-[11.5px] text-[var(--ink-4)]">
                          {item.subtitle}
                        </span>
                      ) : null}
                    </span>
                    {active ? (
                      <CornerDownLeft className="size-3.5 shrink-0 text-[var(--brand)]" />
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* --------------------------------------------------------- yordam */}
        <div className="flex shrink-0 items-center gap-3 border-t border-[var(--edge)] bg-[var(--pane-sunken)] px-4 py-2 text-[11px] text-[var(--ink-4)]">
          <span className="flex items-center gap-1.5">
            <kbd className={KBD}>↑↓</kbd> tanlash
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={KBD}>↵</kbd> ochish
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className={KBD}>Ctrl</kbd>
            <kbd className={KBD}>K</kbd>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const KBD =
  "rounded-[5px] border border-[var(--edge)] bg-[var(--pane-solid)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-3)]";

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Count } from "./primitives";

/* ==========================================================================
   Segment boshqaruvi
   --------------------------------------------------------------------------
   Kapsula trek ichida suzuvchi YASHIL "tugma". U tanlangan elementga siljiydi —
   pozitsiya o'lchov orqali aniqlanadi, shuning uchun elementlar turli
   kenglikda bo'lishi mumkin (masalan "Umumiy" va "Ishtirokchilar").

   Nima uchun ostki chiziqli tab emas: ostki chiziq kontent bilan bir tekislikda
   turadi va sahifada yana bitta gorizontal chiziq hosil qiladi. Segment esa
   yopiq boshqaruv — u o'zining kichik maydonida qoladi.
   ========================================================================== */

type Item<T extends string> = {
  value: T;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export function Segmented<T extends string>({
  value,
  items,
  onChange,
  size = "md",
  full,
  className,
}: {
  value: T;
  items: Item<T>[];
  onChange: (next: T) => void;
  size?: "sm" | "md";
  /** Butun kenglikni egallasin (mobil filtrlar uchun) */
  full?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<T, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const active = itemRefs.current.get(value);
    if (!track || !active) return;
    setThumb({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value]);

  // `useLayoutEffect` — tugma bo'yoqdan oldin joyiga qo'yiladi, aks holda
  // birinchi renderda chapdan siljib kelayotgani ko'rinib qolardi
  useLayoutEffect(measure, [measure, items.length]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const height = size === "sm" ? "h-7" : "h-8";
  const pad = size === "sm" ? "px-2.5 text-[13px]" : "px-3 text-[13px]";

  return (
    <div
      ref={trackRef}
      role="tablist"
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] p-1",
        "border border-[var(--line)] bg-[var(--surface-sunk)]",
        full && "flex w-full",
        className,
      )}
    >
      {thumb ? (
        <span
          aria-hidden
          className={cn(
            "absolute top-1 bottom-1 rounded-[var(--radius-xs)] bg-[var(--surface)]",
            "border border-[var(--line)] shadow-[var(--shadow-xs)]",
            "transition-[left,width] duration-[var(--dur-2)] ease-[var(--ease)]",
          )}
          style={{ left: thumb.left, width: thumb.width }}
        />
      ) : null}

      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              if (node) itemRefs.current.set(item.value, node);
              else itemRefs.current.delete(item.value);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative z-1 inline-flex items-center justify-center gap-2 rounded-[var(--radius-xs)]",
              "whitespace-nowrap ring-focus",
              "transition-colors duration-[var(--dur-1)]",
              "disabled:pointer-events-none disabled:opacity-40",
              height,
              pad,
              full && "flex-1",
              active
                ? "font-medium text-[var(--text)]"
                : "font-medium text-[var(--text-3)] hover:text-[var(--text)]",
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === "number" ? (
              <Count
                value={item.count}
                className={cn(
                  active && "bg-[var(--green-wash)] text-[var(--green-text)]",
                )}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Filtr chiplari — gorizontal siljiydigan qator
   --------------------------------------------------------------------------
   Ko'p variantli filtrlar uchun (teglar, qiyinlik). Tanlanganlar brend
   yuvindisini oladi.

   Qator sig'masa, chekkalarda siljitish tugmalari chiqadi. Ular shart:
   scrollbar yashirilgan (`scroll-hidden`) va sichqonchada gorizontal siljish
   uchun alohida qurilma kerak — tugmalarsiz sig'magan teglarga (masalan
   "Matematika", "Stek") umuman yetib bo'lmasdi.
   ========================================================================== */
export function ChipRail<T extends string>({
  value,
  items,
  onChange,
  className,
}: {
  value: T[];
  items: { value: T; label: React.ReactNode; count?: number }[];
  onChange: (next: T[]) => void;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setEdges({ left: node.scrollLeft > 2, right: node.scrollLeft < max - 2 });
  }, []);

  useLayoutEffect(measure, [measure, items.length]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);

  const scrollBy = (direction: 1 | -1) => {
    const node = scrollerRef.current;
    if (!node) return;
    // Harakatni kamaytirish rejimida silliq siljish o'chadi (7-bo'lim:
    // JS animatsiyasi `matchMedia` bilan tekshiriladi)
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({
      left: direction * Math.max(160, node.clientWidth * 0.75),
      behavior: calm ? "auto" : "smooth",
    });
  };

  const toggle = (item: T) =>
    onChange(value.includes(item) ? value.filter((entry) => entry !== item) : [...value, item]);

  const arrow = (side: "left" | "right") => (
    <button
      type="button"
      aria-label={side === "left" ? "Chapga siljitish" : "O'ngga siljitish"}
      onClick={() => scrollBy(side === "left" ? -1 : 1)}
      className={cn(
        "absolute top-1/2 z-1 flex size-9 -translate-y-1/2 items-center justify-center ring-focus",
        "rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] text-[var(--text-3)]",
        "shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-1)]",
        "hover:border-[var(--line-strong)] hover:text-[var(--text)]",
        side === "left" ? "left-0" : "right-0",
      )}
    >
      {side === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
    </button>
  );

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={scrollerRef}
        onScroll={measure}
        className={cn(
          "scroll-hidden -mx-1 overflow-x-auto px-1 py-0.5",
          // Chekka so'nishi faqat yashiringan tomonda — aks holda birinchi
          // chip doim yarim xira ko'rinadi
          edges.left && edges.right ? "fade-x" : null,
        )}
      >
        <div className="flex items-center gap-1.5">
          {items.map((item) => {
            const active = value.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(item.value)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border px-4",
                  "text-[14px] whitespace-nowrap ring-focus",
                  "transition-[background-color,border-color,color] duration-[var(--dur-1)]",
                  active
                    ? "border-[var(--green)] bg-[var(--green-wash)] font-semibold text-[var(--green-text)]"
                    : "border-[var(--line)] bg-[var(--surface)] font-medium text-[var(--text-3)] hover:border-[var(--line-strong)] hover:text-[var(--text)]",
                )}
              >
                {item.label}
                {typeof item.count === "number" ? (
                  <span className="ts-num text-[12px] opacity-55">{item.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {edges.left ? arrow("left") : null}
      {edges.right ? arrow("right") : null}
    </div>
  );
}

/* ==========================================================================
   Non ushoqlari
   ========================================================================== */
export function Breadcrumb({
  items,
  className,
}: {
  items: { label: React.ReactNode; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Yo'l" className={cn("flex items-center gap-1 text-[14.5px]", className)}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-0.5">
            {item.href && !last ? (
              <Link
                href={item.href}
                className="rounded-[5px] px-1 py-0.5 text-[var(--text-4)] transition-colors hover:text-[var(--text-2)] ring-focus"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn("px-1 py-0.5", last ? "font-medium text-[var(--text-2)]" : "text-[var(--text-4)]")}>
                {item.label}
              </span>
            )}
            {!last ? <span className="text-[var(--text-4)] opacity-45">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}

/* ==========================================================================
   Sahifalash
   --------------------------------------------------------------------------
   Raqamlar qatori o'rniga ixcham boshqaruv: "N / M" ko'rsatkichi va ikkita
   o'q. Raqamli sahifalash 20+ sahifada baribir "..." ga aylanadi va joyni
   egallaydi; bu variant har qanday hajmda bir xil ko'rinadi.

   Diapazon matni ("1–25, jami 340") chapda — u eng ko'p so'raladigan
   ma'lumot va o'q tugmalarni kutib turmasligi kerak.
   ========================================================================== */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  className,
}: {
  page: number;
  pageCount: number;
  total?: number;
  pageSize?: number;
  onPage: (next: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const from = pageSize ? (page - 1) * pageSize + 1 : null;
  const to = pageSize && total ? Math.min(page * pageSize, total) : null;

  const step = (delta: number) => onPage(Math.min(pageCount, Math.max(1, page + delta)));

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="ts-sm text-[var(--text-4)]">
        {from && to && total ? (
          <>
            <span className="ts-num text-[var(--text-2)]">
              {from}–{to}
            </span>{" "}
            / jami <span className="ts-num">{total}</span>
          </>
        ) : (
          <>
            <span className="ts-num text-[var(--text-2)]">{page}</span> / {pageCount} sahifa
          </>
        )}
      </p>

      {/* Uch element bitta guruh: o'qlar va hisoblagich yonma-yon, oradagi
          chegaralar birlashadi — bitta boshqaruv bo'lagi kabi ko'rinadi. */}
      <div className="flex items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)]">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={page <= 1}
          aria-label="Oldingi sahifa"
          className={cn(
            "flex size-9 items-center justify-center ring-focus",
            "text-[var(--text-2)] transition-colors",
            "hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
            "disabled:pointer-events-none disabled:opacity-30",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex h-11 items-center gap-2 border-x border-[var(--line)] px-4">
          <span className="ts-num text-[12.5px] font-semibold text-[var(--text)]">{page}</span>
          <span className="text-[12px] text-[var(--text-4)]">/</span>
          <span className="ts-num text-[12.5px] text-[var(--text-3)]">{pageCount}</span>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={page >= pageCount}
          aria-label="Keyingi sahifa"
          className={cn(
            "flex size-8 items-center justify-center ring-focus",
            "text-[var(--text-2)] transition-colors",
            "hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
            "disabled:pointer-events-none disabled:opacity-30",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

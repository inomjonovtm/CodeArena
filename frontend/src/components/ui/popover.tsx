"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Portal orqali `position: fixed` bilan joylashadigan panel.
 *
 * Nega portal: jadval `overflow-x-auto` konteyner ichida. CSS bo'yicha
 * `overflow-x: auto` `overflow-y` ni ham `auto` qiladi, shuning uchun qator
 * ichidagi oddiy `absolute` dropdown kesilib qoladi. Portal + fixed buni
 * butunlay yechadi va ekran chetiga yetganda panel avtomatik "ag'dariladi".
 */

export type PopoverAlign = "start" | "end";

interface Position {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  ready: boolean;
}

const GAP = 6;
const VIEWPORT_PADDING = 8;

function computePosition(
  anchor: HTMLElement,
  panel: HTMLElement,
  align: PopoverAlign,
  matchWidth: boolean,
  minWidth: number,
): Position {
  const rect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const viewportW = document.documentElement.clientWidth;
  const viewportH = document.documentElement.clientHeight;

  const width = matchWidth ? Math.max(rect.width, minWidth) : Math.max(panelRect.width, minWidth);

  const spaceBelow = viewportH - rect.bottom - GAP - VIEWPORT_PADDING;
  const spaceAbove = rect.top - GAP - VIEWPORT_PADDING;
  // Pastda joy yetmasa va tepada ko'proq bo'lsa — tepaga ochamiz
  const openUp = spaceBelow < Math.min(panelRect.height, 200) && spaceAbove > spaceBelow;

  const maxHeight = Math.max(120, openUp ? spaceAbove : spaceBelow);
  const height = Math.min(panelRect.height, maxHeight);
  const top = openUp ? rect.top - GAP - height : rect.bottom + GAP;

  let left = align === "end" ? rect.right - width : rect.left;
  left = Math.min(left, viewportW - width - VIEWPORT_PADDING);
  left = Math.max(VIEWPORT_PADDING, left);

  return { top, left, width, maxHeight, ready: true };
}

export function Popover({
  anchor,
  open,
  onClose,
  align = "start",
  matchWidth = false,
  minWidth = 0,
  className,
  role = "dialog",
  children,
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  align?: PopoverAlign;
  /** Panel kengligi trigger kengligiga tenglashsin (select uchun). */
  matchWidth?: boolean;
  minWidth?: number;
  className?: string;
  role?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 320,
    ready: false,
  });

  const reposition = useCallback(() => {
    if (!anchor || !panelRef.current) return;
    setPosition(computePosition(anchor, panelRef.current, align, matchWidth, minWidth));
  }, [anchor, align, matchWidth, minWidth]);

  // Birinchi kadrda o'lchab joylashtiramiz (paint'dan oldin — sakrash bo'lmaydi)
  useLayoutEffect(() => {
    if (!open) {
      setPosition((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    reposition();
  }, [open, reposition]);

  // Scroll / resize'da kuzatib boramiz
  useEffect(() => {
    if (!open) return;
    const handler = () => reposition();
    window.addEventListener("resize", handler);
    // capture: true — ichki scroll konteynerlarni ham eshitamiz
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, reposition]);

  // Tashqariga bosish va Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, anchor]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: matchWidth ? position.width : undefined,
        minWidth: matchWidth ? undefined : minWidth || undefined,
        maxHeight: position.maxHeight,
        // O'lchanmagunicha ko'rinmaydi — "sakrash" effekti bo'lmasin
        visibility: position.ready ? "visible" : "hidden",
      }}
      className={cn(
        // Suzuvchi qatlam fizikasi: pane-float + tez "pop" kirish
        "enter-pop z-[60] flex origin-top flex-col overflow-hidden rounded-[var(--r-pane)] pane-float",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

// ------------------------------------------------------------------- Menyu
export interface MenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect?: () => void;
  /** Havola bo'lsa — `onSelect` o'rniga shu ishlatiladi. */
  href?: string;
  /** Yangi oynada ochish. */
  external?: boolean;
  danger?: boolean;
  disabled?: boolean;
  /** Shu element ustida ajratuvchi chiziq. */
  separatorBefore?: boolean;
  /** O'ng tomondagi qisqa izoh yoki klaviatura qisqartmasi. */
  hint?: string;
}

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-[var(--r-ctl)] px-2.5 py-2 text-left text-[13px] font-medium transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-45";

/**
 * Qator amallari uchun menyu — klaviatura bilan to'liq boshqariladi
 * (↑ ↓ Home End Enter Esc), panel portal orqali chiziladi.
 */
export function DropdownMenu({
  items,
  trigger,
  triggerClassName,
  triggerLabel,
  align = "end",
  width = 200,
  disabled,
}: {
  items: MenuItem[];
  /** Tugma ichidagi kontent (odatda ikonka). */
  trigger: React.ReactNode;
  triggerClassName?: string;
  /** Ekran o'quvchilar uchun nom. */
  triggerLabel: string;
  align?: PopoverAlign;
  width?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const enabled = items.map((item, index) => ({ item, index })).filter(({ item }) => !item.disabled);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const focusAt = (index: number) => {
    setActiveIndex(index);
    // Panel chizilgandan keyin fokuslaymiz
    requestAnimationFrame(() => itemRefs.current[index]?.focus());
  };

  const step = (direction: 1 | -1) => {
    if (!enabled.length) return;
    const current = enabled.findIndex(({ index }) => index === activeIndex);
    const next =
      current === -1
        ? direction === 1
          ? 0
          : enabled.length - 1
        : (current + direction + enabled.length) % enabled.length;
    focusAt(enabled[next].index);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      if (enabled.length) focusAt(enabled[0].index);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (enabled.length) focusAt(enabled[enabled.length - 1].index);
    }
  };

  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (enabled.length) focusAt(enabled[0].index);
    } else if (event.key === "End") {
      event.preventDefault();
      if (enabled.length) focusAt(enabled[enabled.length - 1].index);
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--r-ctl)] text-[var(--ink-3)] focus-ring",
          "transition-colors duration-[var(--t-fast)]",
          "hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
          "disabled:pointer-events-none disabled:opacity-45",
          open && "bg-[var(--pane-sunken)] text-[var(--ink)]",
          triggerClassName,
        )}
      >
        {trigger}
      </button>

      <Popover
        anchor={triggerRef.current}
        open={open}
        onClose={() => close()}
        align={align}
        minWidth={width}
        role="menu"
      >
        <div className="scrollbar-thin overflow-y-auto p-1.5" onKeyDown={onPanelKeyDown}>
          {items.map((item, index) => {
            const className = cn(
              ITEM_CLASS,
              item.danger
                ? "text-[var(--bad)] hover:bg-[var(--bad-wash)] focus:bg-[var(--bad-wash)]"
                : "text-[var(--ink-2)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)] focus:bg-[var(--pane-sunken)] focus:text-[var(--ink)]",
            );
            const content = (
              <>
                {item.icon ? <span className="shrink-0 text-[var(--ink-4)]">{item.icon}</span> : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint ? (
                  <kbd className="shrink-0 rounded-[6px] bg-[var(--pane-sunken)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--ink-4)]">
                    {item.hint}
                  </kbd>
                ) : null}
              </>
            );

            return (
              <div key={item.key}>
                {item.separatorBefore ? (
                  <div className="my-1 border-t border-[var(--edge)]" />
                ) : null}
                {item.href ? (
                  <a
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    role="menuitem"
                    tabIndex={-1}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noreferrer" : undefined}
                    onClick={(event) => {
                      event.stopPropagation();
                      close(false);
                    }}
                    className={className}
                  >
                    {content}
                  </a>
                ) : (
                  <button
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    role="menuitem"
                    tabIndex={-1}
                    type="button"
                    disabled={item.disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      close(false);
                      item.onSelect?.();
                    }}
                    className={className}
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Popover>
    </>
  );
}

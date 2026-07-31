"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import { IconButton } from "./primitives";

/* ==========================================================================
   Modal — desktopda markazda, mobilda pastdan chiqadigan varaq
   --------------------------------------------------------------------------
   Bu ikki xil komponent emas, bitta komponentning ikki xil fizikasi:

   • Desktop — markazda suzadi, ozgina masshtabdan kiradi. Ko'z allaqachon
     ekran markazida, shuning uchun oyna "shu yerda paydo bo'ladi".
   • Mobil — pastdan ko'tariladi va pastki chekkaga yopishadi. Bosh barmoq
     pastda, ya'ni yopish tugmasi ham, tasdiqlash tugmasi ham qo'l yetadigan
     joyda bo'ladi. Tepada "tutqich" — varaqni surib yopish mumkinligiga ishora.

   Ochilganda fon scroll'i to'xtaydi va fokus oyna ichiga ko'chadi; yopilganda
   fokus chaqirgan elementga qaytadi.
   ========================================================================== */

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Fonga bosganda yopilmasin (ma'lumot yo'qolishi mumkin bo'lgan formalar) */
  persistent?: boolean;
  children?: React.ReactNode;
};

const WIDTHS: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  persistent,
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    const { overflow, paddingRight } = document.body.style;
    // Scrollbar yo'qolganda sahifa "sakramasligi" uchun kengligini qoplaymiz
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !persistent) onClose();
      if (event.key !== "Tab" || !panelRef.current) return;

      // Fokus tuzog'i — Tab oyna ichida aylanadi
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        'input,textarea,button:not([data-close]),[tabindex]:not([tabindex="-1"])',
      );
      (target ?? panelRef.current)?.focus();
    }, 40);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose, persistent]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center sm:p-6">
      {/* Parda iliq siyoh rangida — sovuq ko'kish qatlam iliq qog'oz ustida
          "boshqa mahsulotdan" ko'rinardi. */}
      <div
        className="enter-veil absolute inset-0 bg-[rgb(10_10_10/0.5)] backdrop-blur-[2px]"
        onClick={persistent ? undefined : onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col outline-none",
          "max-h-[92dvh] sm:max-h-[85dvh]",
          "rounded-t-[var(--r-pane-lg)] sm:rounded-[var(--r-pane)]",
          "border border-[var(--edge)] bg-[var(--pane-solid)] shadow-[var(--lift-pop)]",
          "enter-sheet sm:enter-pop",
          WIDTHS[size],
        )}
      >
        {/* Mobil tutqich */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-[var(--edge-strong)]" />
        </div>

        {title || description ? (
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 sm:pt-6">
            <div className="min-w-0">
              {title ? (
                <h2 id={titleId} className="t-section text-[var(--ink)]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="t-meta mt-1.5 text-[var(--ink-3)]">{description}</p>
              ) : null}
            </div>
            <IconButton label="Yopish" size="sm" onClick={onClose} data-close className="-mt-1 -mr-2">
              <X className="size-4" />
            </IconButton>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>

        {footer ? (
          <div
            className={cn(
              "flex items-center justify-end gap-2 border-t border-[var(--edge)]",
              "bg-[var(--pane-sunken)] px-6 py-3.5",
              "rounded-b-[var(--r-pane)] pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-3.5",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/* ==========================================================================
   Tooltip
   --------------------------------------------------------------------------
   Kechikish bilan ochiladi (450ms): darhol chiqadigan maslahatlar sichqoncha
   sahifa bo'ylab yurganda "yonib-o'chadi". Yopilishi esa darhol.
   ========================================================================== */
export function Tooltip({
  content,
  side = "top",
  children,
  className,
}: {
  content: React.ReactNode;
  side?: "top" | "bottom";
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 450);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className={cn(
            "enter-pop pointer-events-none absolute left-1/2 z-90 -translate-x-1/2",
            "rounded-[var(--r-ctl)] border border-[var(--edge)] bg-[var(--pane-solid)]",
            "px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap text-[var(--ink)]",
            "shadow-[var(--lift-2)]",
            side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Menyu paneli — tugma ostidan chiqadigan ro'yxat uchun qobiq.
 * Pozitsiyani chaqiruvchi belgilaydi; bu yerda faqat ko'rinish va
 * tashqariga bosishni tutish.
 */
export function Popover({
  open,
  onClose,
  align = "end",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  align?: "start" | "end";
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const node = ref.current;
      if (!node) return;
      const target = event.target as Node;
      /* Menyuni ochgan tugma shu `relative` o'ramning ichida turadi. Uni
         "tashqari" deb hisoblasak, `mousedown` menyuni yopadi, keyin kelgan
         `click` esa uni qayta ochib yuboradi — ya'ni tugma menyuni HECH
         QACHON yopa olmasdi. O'ramni chetlab o'tamiz: yopishni tugmaning
         o'z almashtirgichi bajaradi. */
      if (node.contains(target) || node.parentElement?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        // Ochilish: fade + pastga siljish (`enter-pop`, 200ms) — dizayn
        // tizimidagi ochiluvchi menyu qoidasi.
        "enter-pop absolute top-[calc(100%+10px)] z-80 min-w-56",
        "rounded-[var(--r-pane)] border border-[var(--edge)] bg-[var(--pane-solid)] p-1.5",
        "shadow-[var(--lift-pop)]",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

const MENU_ROW = [
  "flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left",
  "text-[14px] font-medium transition-colors duration-[var(--t-fast)] focus-ring",
].join(" ");

/** Menyudagi havola — `MenuItem` bilan bir xil ko'rinish, lekin `<a>`. */
export function MenuLink({
  href,
  icon,
  onClick,
  className,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        MENU_ROW,
        "text-[var(--ink)] hover:bg-[var(--pane-hover)] hover:text-[var(--brand)]",
        className,
      )}
    >
      {icon ? <span className="shrink-0 opacity-70">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Link>
  );
}

/** Menyu qatori — ikonka, matn va ixtiyoriy klaviatura ko'rsatkichi. */
export function MenuItem({
  icon,
  shortcut,
  tone,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
  shortcut?: string;
  tone?: "bad";
}) {
  return (
    <button
      type="button"
      className={cn(
        MENU_ROW,
        tone === "bad"
          ? "text-[var(--bad)] hover:bg-[var(--bad-wash)]"
          : "text-[var(--ink-2)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
        className,
      )}
      {...rest}
    >
      {icon ? <span className="shrink-0 opacity-70">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? (
        <kbd className="rounded-[5px] border border-[var(--edge)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-4)]">
          {shortcut}
        </kbd>
      ) : null}
    </button>
  );
}

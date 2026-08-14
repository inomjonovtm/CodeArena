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
      {/* Parda chuqur zumrad rangida — sovuq kulrang qatlam oq qog'oz ustida
          "boshqa mahsulotdan" ko'rinardi. */}
      <div
        className="enter-veil absolute inset-0 bg-[rgb(16_24_20/0.45)] backdrop-blur-[3px]"
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
          "rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-lg)]",
          "border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)]",
          "enter-sheet sm:enter-pop",
          WIDTHS[size],
        )}
      >
        {/* Mobil tutqich */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <span className="h-1.5 w-12 rounded-full bg-[var(--line-strong)]" />
        </div>

        {title || description ? (
          <div className="flex items-start justify-between gap-5 px-8 pt-7 pb-5 sm:pt-8">
            <div className="min-w-0">
              {title ? (
                <h2 id={titleId} className="ts-h2 text-[var(--text)]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="ts-sm mt-1.5 text-[var(--text-3)]">{description}</p>
              ) : null}
            </div>
            <IconButton label="Yopish" size="sm" onClick={onClose} data-close className="-mt-1 -mr-2">
              <X className="size-5" />
            </IconButton>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">{children}</div>

        {footer ? (
          <div
            className={cn(
              "flex items-center justify-end gap-2 border-t border-[var(--line)]",
              "bg-[var(--surface-sunk)] px-8 py-5",
              "rounded-b-[var(--radius-lg)] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5",
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
            "rounded-[10px] border border-[var(--line)] bg-[var(--surface)]",
            "px-3 py-2 text-[13px] font-medium whitespace-nowrap text-[var(--text)]",
            "shadow-[var(--shadow-sm)]",
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
        "rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-2",
        "shadow-[var(--shadow-lg)]",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

const MENU_ROW = [
  "flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left",
  "text-[15px] font-medium transition-colors duration-[var(--dur-1)] ring-focus",
].join(" ");

/** Menyudagi havola — `MenuItem` bilan bir xil ko'rinish, lekin `<a>`. */
export function MenuLink({
  href,
  icon,
  onClick,
  className,
  external,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  /**
   * Next router bilan emas, to'liq sahifa yuklash bilan ochiladi.
   * Sayt ichidagi, lekin Next'ga tegishli BO'LMAGAN manzillar uchun
   * (masalan Django admin `/admin/`) — router ularni topa olmaydi va
   * 404 ko'rsatib qo'yadi.
   */
  external?: boolean;
  children: React.ReactNode;
}) {
  const body = (
    <>
      {icon ? <span className="shrink-0 opacity-70">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </>
  );
  const classes = cn(
    MENU_ROW,
    "text-[var(--text)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
    className,
  );

  if (external) {
    return (
      <a href={href} onClick={onClick} className={classes}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={classes}>
      {body}
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
          ? "text-[var(--danger)] hover:bg-[var(--danger-wash)]"
          : "text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
        className,
      )}
      {...rest}
    >
      {icon ? <span className="shrink-0 opacity-70">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? (
        <kbd className="rounded-[5px] border border-[var(--line)] px-1.5 py-0.5 font-sans text-[12px] font-medium text-[var(--text-3)]">
          {shortcut}
        </kbd>
      ) : null}
    </button>
  );
}

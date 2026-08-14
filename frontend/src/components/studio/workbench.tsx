"use client";

import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Ishxona — Studio sahifalarining umumiy ramkasi
   --------------------------------------------------------------------------
   Uch qavat: non ushoqlari + sarlavha + asosiy amal (`WorkHeader`), tab
   lentasi (`WorkTabs`), va kontent. Yuqori qavat YOPISHQOQ: uzun formada
   ham «Saqlash» va tablar ko'z oldida qoladi.
   ========================================================================== */

export function WorkHeader({
  breadcrumbs,
  title,
  meta,
  actions,
}: {
  breadcrumbs?: { href?: string; label: string }[];
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="st-chrome sticky top-0 z-30 border-b">
      <div className="flex min-h-[var(--st-bar)] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          {breadcrumbs?.length ? (
            <nav className="mb-0.5 flex items-center gap-1 text-[13.5px] text-[var(--text-4)]">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="size-3" /> : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="truncate transition-colors hover:text-[var(--green-text)]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="truncate text-[19px] font-bold tracking-tight text-[var(--text)]">
              {title}
            </h1>
            {meta}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export interface WorkTab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** O'ngdagi kichik son — nechta element borligini bildiradi. */
  count?: number;
  /** Diqqat talab qiladigan tab — yonida nuqta chiqadi. */
  attention?: boolean;
}

/**
 * Tab lentasi.
 *
 * Tanlangan tab URL'da `?tab=` sifatida saqlanadi (chaqiruvchi sahifa
 * hal qiladi) — shu tufayli sahifa yangilansa ham odam o'zi turgan joyda
 * qoladi va tabga havola yuborish mumkin.
 */
export function WorkTabs({
  tabs,
  active,
  onSelect,
  className,
}: {
  tabs: WorkTab[];
  active: string;
  onSelect: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "st-chrome sticky top-[var(--st-bar)] z-20 overflow-x-auto border-b",
        className,
      )}
    >
      <div
        role="tablist"
        className="flex min-w-max items-center gap-6 px-4 sm:px-6"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            data-active={active === tab.key}
            onClick={() => onSelect(tab.key)}
            className="st-tab"
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="st-num rounded-full bg-[var(--surface-hover)] px-1.5 text-[13px] font-semibold text-[var(--text-3)]">
                {tab.count}
              </span>
            ) : null}
            {tab.attention ? (
              <span
                aria-label="e'tibor talab qiladi"
                className="size-1.5 rounded-full bg-[var(--green)]"
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Sahifa ichki bo'shlig'i — barcha Studio sahifalarida bir xil. */
export function WorkBody({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  /** Jadval va ikki ustunli ishxona uchun — chegarasiz kenglik. */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-4 py-5 sm:px-6",
        wide ? "w-full" : "mx-auto w-full max-w-[1400px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Panel — Studio ichidagi asosiy quti. */
export function WorkPanel({
  title,
  hint,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("st-panel overflow-hidden", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--st-edge-soft)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">{title}</h2>
            {hint ? <p className="mt-0.5 text-[14px] text-[var(--text-4)]">{hint}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Yopishqoq amal paneli — uzun formalarda «Saqlash» pastda qoladi.
 * `dirty` bo'lsa panel ko'rinadi, aks holda joy egallamaydi.
 */
export function WorkActionBar({
  dirty,
  saving,
  onSave,
  onReset,
  hint,
  extra,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onReset?: () => void;
  hint?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  // Ctrl/Cmd + S — saqlash. Muharrirda ishlayotgan odam sichqonchani
  // qidirmasligi kerak.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !saving) onSave();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dirty, saving, onSave]);

  if (!dirty) return null;

  return (
    <div className="st-actionbar">
      <p className="min-w-0 truncate text-[15px] text-[var(--text-3)]">
        {hint ?? "Saqlanmagan o'zgarishlar bor."}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="h-9 rounded-[var(--radius-sm)] px-3.5 text-[15px] font-semibold text-[var(--text-3)] transition-colors hover:text-[var(--text)] disabled:opacity-40"
          >
            Bekor qilish
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--green)] px-4 text-[15px] font-semibold text-[var(--text-on-green)] transition-colors hover:bg-[var(--green-hover)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Saqlash
          <kbd className="rounded border border-black/20 px-1 font-mono text-[11.5px] opacity-70">
            ⌘S
          </kbd>
        </button>
      </div>
    </div>
  );
}

/** Verdikt nishoni — rangsiz semantika (DESIGN.md). */
export function Verdict({
  tone,
  children,
  className,
}: {
  tone: "pass" | "fail" | "warn" | "idle";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span data-tone={tone} className={cn("st-verdict", className)}>
      {children}
    </span>
  );
}

/** Judge verdiktidan nishon ohangini aniqlaydi. */
export function verdictTone(status: string | null | undefined): "pass" | "fail" | "warn" | "idle" {
  if (!status) return "idle";
  if (status === "ACCEPTED") return "pass";
  if (status === "SYSTEM_ERROR" || status === "COMPILE_ERROR") return "warn";
  return "fail";
}

/** Bo'sh holat — nima qilish kerakligini aytadi, shunchaki «bo'sh» demaydi. */
export function WorkEmpty({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="st-grid-bg flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[var(--st-edge)] px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-[var(--text-4)]">{icon}</div> : null}
      <p className="text-[16px] font-semibold text-[var(--text)]">{title}</p>
      {hint ? <p className="mt-1.5 max-w-md text-[15px] text-[var(--text-4)]">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * Xatolik holati — so'rov muvaffaqiyatsiz tugaganda ko'rsatiladi.
 *
 * Bu holatni «bo'sh ro'yxat» bilan almashtirib bo'lmaydi: bo'sh ro'yxat
 * «hammasi joyida, ma'lumot yo'q» degani, xatolik esa «ma'lumot bor-yo'qligi
 * noma'lum» degani. Ikkalasini bir xil ko'rsatish muallifni chalg'itadi.
 */
export function WorkError({
  title = "Yuklab bo'lmadi",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[var(--st-edge)] px-6 py-12 text-center">
      <div className="mb-3 text-[var(--text-4)]">
        <AlertTriangle className="size-6" />
      </div>
      <p className="text-[16px] font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-1.5 max-w-md text-[15px] text-[var(--text-4)]">
        {message ?? "Server bilan bog'lanishda xatolik. Internet aloqasini tekshirib, qayta urinib ko'ring."}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--st-edge)] px-4 text-[15px] font-medium text-[var(--text-2)] transition-colors hover:border-[var(--green-line)] hover:text-[var(--text)]"
        >
          Qayta urinish
        </button>
      ) : null}
    </div>
  );
}

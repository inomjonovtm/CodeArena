"use client";

import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Holat ko'rsatkichlari
   ========================================================================== */

/**
 * Bo'sh holat.
 *
 * Ikonka rangli plitkada emas, soch chizig'i bilan chizilgan doirada turadi:
 * to'yingan kvadrat plitka bo'sh sahifada eng katta rangli dog'ga aylanadi va
 * e'tiborni MATNDAN tortib oladi — aslida javob matnda. Fonda juda xira
 * millimetrli qog'oz: maydon "tashlandiq" emas, "hozircha bo'sh" ko'rinadi.
 *
 * Har bir bo'sh holatda amal tugmasi bo'lishi kerak — foydalanuvchi shu
 * yerdan chiqib ketmasligi uchun.
 */
export function Empty({
  icon,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "enter relative flex flex-col items-center justify-center overflow-hidden text-center",
        compact ? "px-6 py-12" : "px-6 py-20",
        className,
      )}
    >
      <span aria-hidden className="grid-paper texture-fade absolute inset-0 opacity-70" />

      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-full",
            "border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]",
          )}
        >
          {icon ?? <Info className="size-[18px]" />}
        </span>

        <p className="t-section mt-5 text-[var(--ink)]">{title}</p>
        {description ? (
          <p className="t-body mt-2 max-w-sm text-[var(--ink-3)]">{description}</p>
        ) : null}
        {action ? <div className="mt-6 flex items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Yuklanish
   Skelet haqiqiy tartibni takrorlashi kerak — aks holda kontent kelganda
   sahifa sakraydi. Shuning uchun tayyor shakllar beriladi.
   -------------------------------------------------------------------------- */

export function Block({ className }: { className?: string }) {
  return <div className={cn("loading-block", className)} />;
}

/** Matn qatorlari — oxirgisi qisqaroq, tabiiy paragrafga o'xshaydi. */
export function TextLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Block
          key={index}
          className={cn("h-3 rounded-[4px]", index === lines - 1 ? "w-2/5" : index % 2 ? "w-11/12" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Ro'yxat skeleti — qatorlar orasidagi masofa haqiqiy ro'yxatnikiga teng. */
export function ListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-[var(--edge-soft)]", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Block className="size-8 shrink-0 rounded-[var(--r-ctl)]" />
          <div className="min-w-0 flex-1">
            <Block className="h-3.5 w-1/3 rounded-[4px]" />
            <Block className="mt-2 h-2.5 w-1/5 rounded-[4px]" />
          </div>
          <Block className="h-5 w-14 shrink-0 rounded-[var(--r-chip)]" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[var(--r-pane)] border border-[var(--edge)] p-4.5">
          <Block className="h-3.5 w-2/3 rounded-[4px]" />
          <TextLines lines={2} className="mt-4" />
          <Block className="mt-5 h-6 w-20 rounded-[var(--r-chip)]" />
        </div>
      ))}
    </div>
  );
}

/** Kutish ko'rsatkichi — kutish uzoq bo'lganda matn bilan birga. */
export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5 py-10", className)}>
      <Loader2 className="size-4 animate-spin text-[var(--brand)]" />
      {label ? <span className="t-meta text-[var(--ink-3)]">{label}</span> : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Xabar bloklari
   -------------------------------------------------------------------------- */

type AlertTone = "info" | "ok" | "warn" | "bad";

const ALERT: Record<AlertTone, { icon: React.ReactNode; color: string; wash: string }> = {
  info: { icon: <Info className="size-4" />, color: "var(--note)", wash: "var(--note-wash)" },
  ok: { icon: <CheckCircle2 className="size-4" />, color: "var(--ok)", wash: "var(--ok-wash)" },
  warn: { icon: <AlertTriangle className="size-4" />, color: "var(--warn)", wash: "var(--warn-wash)" },
  bad: { icon: <XCircle className="size-4" />, color: "var(--bad)", wash: "var(--bad-wash)" },
};

/**
 * Ogohlantirish bloki.
 *
 * Butun blok bo'yalmaydi — juda och fon, o'sha rangdan ishlangan soch halqa
 * va chap qirradagi 2px chiziq. To'liq bo'yalgan bloklar sahifadan "sakrab
 * chiqadi" va boshqa kontentni bosib ketadi; bu variant e'tiborni tortadi,
 * lekin kontent oqimida qoladi.
 */
export function Alert({
  tone = "info",
  title,
  action,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const meta = ALERT[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--r-field)] py-3 pr-4 pl-4",
        "flex items-start gap-3",
        className,
      )}
      style={{
        backgroundColor: meta.wash,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${meta.color} 20%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[2px]"
        style={{ backgroundColor: meta.color }}
      />
      <span className="mt-0.5 shrink-0" style={{ color: meta.color }}>
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-[13.5px] font-semibold" style={{ color: meta.color }}>
            {title}
          </p>
        ) : null}
        {children ? (
          <div className={cn("t-meta text-[var(--ink-2)]", title && "mt-1")}>{children}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Progress — ingichka chiziq. Foiz raqami yonida emas, ustida turadi,
 * shunda chiziq to'liq kenglikni egallaydi va uzunliklar solishtiriladi.
 */
export function Meter({
  value,
  max = 100,
  label,
  tone = "brand",
  className,
}: {
  value: number;
  max?: number;
  label?: React.ReactNode;
  tone?: "brand" | "ok" | "warn" | "bad" | "flare";
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "bad"
          ? "var(--bad)"
          : tone === "flare"
            ? "var(--flare)"
            : "var(--brand)";

  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="t-meta text-[var(--ink-3)]">{label}</span>
          <span className="t-num text-[12px] font-semibold text-[var(--ink-2)]">
            {Math.round(percent)}%
          </span>
        </div>
      ) : null}
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--canvas-deep)]">
        <div
          className="h-full rounded-full transition-[width] duration-[var(--t-slow)] ease-[var(--ease-soft)]"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

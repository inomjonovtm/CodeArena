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
        " relative flex flex-col items-center justify-center overflow-hidden text-center",
        compact ? "px-6 py-12" : "px-6 py-20",
        className,
      )}
    >

      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-[var(--radius-md)]",
            "border border-[var(--line)] bg-[var(--surface-sunk)] text-[var(--text-4)]",
          )}
        >
          {icon ?? <Info className="size-6" />}
        </span>

        <p className="ts-h3 mt-5 text-[var(--text)]">{title}</p>
        {description ? (
          <p className="ts-body mt-3.5 max-w-md text-[var(--text-3)]">{description}</p>
        ) : null}
        {action ? <div className="mt-9 flex items-center gap-3">{action}</div> : null}
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
    <div className={cn("divide-y divide-[var(--line-soft)]", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Block className="size-10 shrink-0 rounded-[var(--radius-sm)]" />
          <div className="min-w-0 flex-1">
            <Block className="h-3.5 w-1/3 rounded-[4px]" />
            <Block className="mt-2 h-2.5 w-1/5 rounded-[4px]" />
          </div>
          <Block className="h-5 w-14 shrink-0 rounded-[var(--radius-xs)]" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[var(--radius-lg)] border border-[var(--line)] p-4.5">
          <Block className="h-3.5 w-2/3 rounded-[4px]" />
          <TextLines lines={2} className="mt-4" />
          <Block className="mt-5 h-6 w-20 rounded-[var(--radius-xs)]" />
        </div>
      ))}
    </div>
  );
}

/** Kutish ko'rsatkichi — kutish uzoq bo'lganda matn bilan birga. */
export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5 py-10", className)}>
      <Loader2 className="size-5 animate-spin text-[var(--green)]" />
      {label ? <span className="ts-sm text-[var(--text-3)]">{label}</span> : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Xabar bloklari
   -------------------------------------------------------------------------- */

type AlertTone = "info" | "ok" | "warn" | "bad";

const ALERT: Record<AlertTone, { icon: React.ReactNode; color: string; wash: string }> = {
  info: { icon: <Info className="size-5" />, color: "var(--info)", wash: "var(--info-wash)" },
  ok: { icon: <CheckCircle2 className="size-5" />, color: "var(--ok)", wash: "var(--ok-wash)" },
  warn: { icon: <AlertTriangle className="size-5" />, color: "var(--warn)", wash: "var(--warn-wash)" },
  bad: { icon: <XCircle className="size-5" />, color: "var(--danger)", wash: "var(--danger-wash)" },
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
        "flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3.5",
        className,
      )}
      style={{
        backgroundColor: meta.wash,
        borderColor: `color-mix(in oklab, ${meta.color} 22%, transparent)`,
      }}
    >
      <span className="mt-px shrink-0" style={{ color: meta.color }}>
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-[14px] font-semibold text-[var(--text)]">{title}</p>
        ) : null}
        {children ? (
          <div className={cn("ts-sm text-[var(--text-2)]", title && "mt-1")}>{children}</div>
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
          ? "var(--danger)"
          : tone === "flare"
            ? "var(--text)"
            : "var(--green)";

  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="ts-sm text-[var(--text-3)]">{label}</span>
          <span className="ts-num text-[12.5px] font-semibold text-[var(--text-2)]">
            {Math.round(percent)}%
          </span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--green-wash)]">
        <div
          className="h-full rounded-full transition-[width] duration-[var(--dur-2)] ease-[var(--ease)]"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

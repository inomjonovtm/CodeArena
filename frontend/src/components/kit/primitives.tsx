"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Tugma
   --------------------------------------------------------------------------
   Burchak 8px — kapsula emas va yumshoq karta ham emas. Kapsula tugmalar
   o'lchamdan qat'i nazar bir xil "mayin" ko'rinadi va ierarxiyani yo'qotadi;
   o'tkir radius esa tugmani boshqaruv elementiga o'xshatadi.

   `quiet` variantida OQ sirt + soch chizig'i ishlatiladi, kul fon emas: iliq
   qog'oz ustida chegarali oq tugma "bosiladigan predmet" kabi ko'rinadi,
   kul to'ldirma esa o'chirilgan holat bilan chalkashadi.
   ========================================================================== */

type Variant = "primary" | "quiet" | "ghost" | "danger" | "brand-soft" | "ink";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-[12.5px]",
  md: "h-9 gap-2 px-3.5 text-[13.5px]",
  lg: "h-11 gap-2 px-5 text-[14.5px]",
};

const ICON_SIZES: Record<Size, string> = {
  sm: "size-8",
  md: "size-9",
  lg: "size-11",
};

const VARIANTS: Record<Variant, string> = {
  primary: [
    "bg-[var(--brand)] text-[var(--ink-on-brand)] font-semibold",
    // Ichki yuqori yorug'lik — tugmaga jismoniy, bosiladigan tus beradi
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]",
    "hover:bg-[var(--brand-hover)] hover:shadow-[var(--lift-brand),inset_0_1px_0_rgb(255_255_255/0.2)]",
    "active:bg-[var(--brand-press)] active:shadow-[inset_0_1px_2px_rgb(0_0_0/0.2)]",
  ].join(" "),
  quiet: [
    "bg-[var(--pane)] text-[var(--ink)] border border-[var(--edge)]",
    "hover:border-[var(--edge-strong)] hover:bg-[var(--pane-hover)]",
    "active:bg-[var(--canvas-deep)]",
  ].join(" "),
  ghost: [
    "text-[var(--ink-2)] border border-transparent",
    "hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
    "active:bg-[var(--canvas-deep)]",
  ].join(" "),
  danger: [
    "bg-[var(--bad)] text-white font-semibold",
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]",
    "hover:brightness-110 active:brightness-95",
  ].join(" "),
  "brand-soft": [
    "bg-[var(--brand-wash)] text-[var(--brand-ink)] border border-[var(--brand-edge)] font-medium",
    "hover:bg-[var(--brand-wash-strong)]",
  ].join(" "),
  ink: [
    "bg-[var(--ink)] text-[var(--canvas)] font-semibold border border-transparent",
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]",
    "hover:bg-[var(--ink-2)] active:bg-[var(--ink)]",
  ].join(" "),
};

const BASE = [
  "relative inline-flex items-center justify-center rounded-[var(--r-ctl)]",
  "font-medium whitespace-nowrap select-none focus-ring",
  "transition-[background-color,border-color,box-shadow,transform,color,opacity]",
  "duration-[var(--t-fast)] ease-[var(--ease-snap)]",
  // Bosilganda arzimas siqilish — bosishni tasdiqlaydi, tartibni buzmaydi
  "active:scale-[0.985]",
  "disabled:pointer-events-none disabled:opacity-45",
].join(" ");

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  /** Ikonka matndan keyin turadi (masalan "Davom etish →") */
  iconAfter?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "quiet", size = "md", loading, icon, iconAfter, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(BASE, SIZES[size], VARIANTS[variant], className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
      {iconAfter}
    </button>
  );
});

type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
};

export function LinkButton({
  variant = "quiet",
  size = "md",
  icon,
  iconAfter,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={cn(BASE, SIZES[size], VARIANTS[variant], className)} {...rest}>
      {icon}
      {children}
      {iconAfter}
    </Link>
  );
}

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Ekran o'qigichlar uchun majburiy */
  label: string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", label, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(BASE, ICON_SIZES[size], VARIANTS[variant], "px-0", className)}
      {...rest}
    >
      {children}
    </button>
  );
});

/* ==========================================================================
   Chip — ixcham yorliq
   --------------------------------------------------------------------------
   Fon o'rniga rang "yuvindisi" (wash) + o'sha rangdan ishlangan soch halqasi.
   To'yingan fon ro'yxatda o'nlab marta takrorlanganda sahifani shovqinga
   to'ldiradi; halqa esa chipni sirtdan ajratadi, lekin og'irlik qo'shmaydi.
   ========================================================================== */

type Tone = "neutral" | "brand" | "ok" | "warn" | "bad" | "note" | "flare";

const TONES: Record<Tone, { wash: string; ink: string; dot: string; base: string }> = {
  neutral: {
    wash: "bg-[var(--pane-sunken)]",
    ink: "text-[var(--ink-2)]",
    dot: "bg-[var(--ink-4)]",
    base: "var(--ink-4)",
  },
  brand: {
    wash: "bg-[var(--brand-wash)]",
    ink: "text-[var(--brand-ink)]",
    dot: "bg-[var(--brand)]",
    base: "var(--brand)",
  },
  ok: { wash: "bg-[var(--ok-wash)]", ink: "text-[var(--ok)]", dot: "bg-[var(--ok)]", base: "var(--ok)" },
  warn: { wash: "bg-[var(--warn-wash)]", ink: "text-[var(--warn)]", dot: "bg-[var(--warn)]", base: "var(--warn)" },
  bad: { wash: "bg-[var(--bad-wash)]", ink: "text-[var(--bad)]", dot: "bg-[var(--bad)]", base: "var(--bad)" },
  note: { wash: "bg-[var(--note-wash)]", ink: "text-[var(--note)]", dot: "bg-[var(--note)]", base: "var(--note)" },
  flare: {
    wash: "bg-[var(--flare-wash)]",
    ink: "text-[var(--flare)]",
    dot: "bg-[var(--flare)]",
    base: "var(--flare)",
  },
};

export function Chip({
  tone = "neutral",
  dot,
  icon,
  className,
  children,
}: {
  tone?: Tone;
  /** Chap tomonda rangli nuqta — status uchun */
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--r-chip)] px-2.5 py-[3px]",
        "text-[12px] font-medium whitespace-nowrap",
        t.wash,
        t.ink,
        className,
      )}
      style={{ boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${t.base} 20%, transparent)` }}
    >
      {dot ? <span className={cn("size-1.5 shrink-0 rounded-full", t.dot)} /> : null}
      {icon}
      {children}
    </span>
  );
}

/** Raqamli hisoblagich — navigatsiya va tab yonida. */
export function Count({ value, className }: { value: number | string; className?: string }) {
  return (
    <span
      className={cn(
        "t-num inline-flex min-w-5 items-center justify-center rounded-[var(--r-chip)]",
        "bg-[var(--canvas-deep)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--ink-3)]",
        className,
      )}
    >
      {value}
    </span>
  );
}

/** Jonli holat nuqtasi — pulsatsiya bilan. */
export function LiveDot({ tone = "ok", className }: { tone?: Tone; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cn("relative flex size-2 shrink-0", className)}>
      <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", t.dot)} />
      <span className={cn("relative inline-flex size-2 rounded-full", t.dot)} />
    </span>
  );
}

/**
 * Klaviatura klavishasi — buyruq paneli va yorliqlar uchun.
 * Monoshrift + soch chizig'i: haqiqiy klavishaga o'xshaydi, emoji emas.
 */
export function KeyHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1.5",
        "border border-[var(--edge)] bg-[var(--pane)] font-mono text-[10.5px] text-[var(--ink-4)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ==========================================================================
   Ajratgichlar
   ========================================================================== */

export function Divider({
  vertical,
  className,
}: {
  vertical?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block shrink-0 bg-[var(--edge)]",
        vertical ? "h-full w-px" : "h-px w-full",
        className,
      )}
    />
  );
}

/**
 * Matnli ajratgich — ro'yxatni bo'limlarga bo'ladi.
 * Chiziq matndan keyin davom etadi, oldin emas: ko'z chapdan o'qiy boshlaydi.
 */
export function DividerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="t-eyebrow shrink-0">{children}</span>
      <Divider />
    </div>
  );
}

/**
 * Bo'lim yorlig'i.
 *
 * `index` berilsa, oldiga tartib raqami qo'yiladi (`01 / KATALOG`). Bu bitta
 * detal sahifaga "hujjat" ohangini beradi: bo'limlar sanab o'tilgan, ya'ni
 * kimdir ularni ataylab tartibga solgan.
 */
export function Eyebrow({
  index,
  children,
  className,
}: {
  index?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("t-eyebrow flex items-center gap-2", className)}>
      {typeof index === "number" ? (
        <>
          <span className="text-[var(--brand)]">{String(index).padStart(2, "0")}</span>
          <span aria-hidden className="h-px w-4 bg-[var(--edge-strong)]" />
        </>
      ) : null}
      {children}
    </p>
  );
}

/* ==========================================================================
   Qiyinlik belgisi — uch pog'onali ustun
   Rangli so'z o'rniga uchta vertikal chiziq: bir qarashda o'qiladi va
   rang ko'rmaydigan foydalanuvchi uchun ham shakl orqali farqlanadi.
   ========================================================================== */
export function DifficultyMark({
  value,
  showLabel = true,
  label,
  className,
}: {
  value: string;
  showLabel?: boolean;
  label?: string;
  className?: string;
}) {
  const level = value === "easy" ? 1 : value === "medium" ? 2 : 3;
  const color = value === "easy" ? "var(--easy)" : value === "medium" ? "var(--medium)" : "var(--hard)";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="w-[3px] rounded-[1px] transition-colors"
            style={{
              height: `${5 + index * 3}px`,
              backgroundColor: index < level ? color : "var(--edge-strong)",
            }}
          />
        ))}
      </span>
      {showLabel ? (
        <span className="text-[12.5px] font-medium" style={{ color }}>
          {label ?? value}
        </span>
      ) : null}
    </span>
  );
}

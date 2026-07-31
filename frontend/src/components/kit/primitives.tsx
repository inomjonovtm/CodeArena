"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Tugma
   --------------------------------------------------------------------------
   Ikkita qoida butun tizimni ushlab turadi:

     1. ASOSIY (primary) — QORA fon, oq matn. Hoverda fon KO'KGA o'tadi.
     2. IKKINCHI DARAJALI (quiet) — shaffof fon, qora chegara va matn.
        Hoverda chegara ham, matn ham ko'kka o'tadi.

   Ya'ni ko'k tugmaning tinch holati EMAS, balki javobi: sichqoncha kelganda
   element "yonadi". Shu tufayli sahifada ko'k faqat foydalanuvchi qaragan
   joyda paydo bo'ladi va e'tibor tarqalmaydi.

   Burchak 10px, o'tish 250ms — rang hech qachon to'satdan almashmaydi.
   Bosilganda tugma 0.97 ga siqiladi: bu jismoniy "bosildi" tuyg'usi.

   Yirik o'lchamlar (`lg`, `xl`) hoverda 2px yuqoriga siljiydi — ular
   marketing CTA'lari. Zich interfeysdagi kichik tugmalar siljimaydi: jadval
   ichida sakraydigan tugmalar qatorni "titratadi".
   ========================================================================== */

type Variant = "primary" | "quiet" | "ghost" | "danger" | "brand" | "brand-soft" | "ink";
type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-[13px]",
  md: "h-10 gap-2 px-4 text-[14px]",
  // 14px/28px — dizayn tizimidagi CTA o'lchami
  lg: "h-12 gap-2.5 px-7 text-[15px] hover:-translate-y-0.5",
  xl: "h-14 gap-2.5 px-8 text-[16px] hover:-translate-y-0.5",
};

const ICON_SIZES: Record<Size, string> = {
  sm: "size-9",
  md: "size-10",
  lg: "size-12",
  xl: "size-14",
};

const VARIANTS: Record<Variant, string> = {
  // 1-qoida: qora → ko'k
  primary: [
    "bg-[var(--ink)] text-[var(--canvas)] font-semibold border border-transparent",
    "hover:bg-[var(--brand)] hover:text-[var(--ink-on-brand)]",
    "active:bg-[var(--brand-press)]",
  ].join(" "),
  // 2-qoida: shaffof + qora chegara → ko'k chegara va ko'k matn
  quiet: [
    "bg-transparent text-[var(--ink)] border border-[var(--ink)] font-semibold",
    "hover:border-[var(--brand)] hover:text-[var(--brand)]",
    "active:bg-[var(--brand-wash)]",
  ].join(" "),
  ghost: [
    "text-[var(--ink-2)] border border-transparent",
    "hover:bg-[var(--pane-hover)] hover:text-[var(--brand)]",
    "active:bg-[var(--canvas-deep)]",
  ].join(" "),
  /* To'q fondagi CTA — to'yingan ko'k, hoverda bir pog'ona ochroq.
     Kalkulyator/interaktiv bo'lim va hero ustidagi asosiy chaqiriq. */
  brand: [
    "bg-[var(--brand)] text-[var(--ink-on-brand)] font-semibold border border-transparent",
    "hover:bg-[var(--brand-hover)]",
    "active:bg-[var(--brand-press)]",
  ].join(" "),
  "brand-soft": [
    "bg-[var(--brand-wash)] text-[var(--brand-ink)] border border-[var(--brand-edge)] font-semibold",
    "hover:bg-[var(--brand)] hover:text-[var(--ink-on-brand)] hover:border-transparent",
  ].join(" "),
  /* Xavfli amal. Palitrada qizil YO'Q, shuning uchun farq RANG bilan emas
     xulq bilan beriladi: bu yagona qora tugma bo'lib, hoverda ko'kka
     O'TMAYDI — quyuqroq bo'ladi. Ma'noni esa har doim yorliq va tasdiq
     oynasining matni tashiydi. */
  danger: [
    "bg-[var(--bad)] text-[var(--canvas)] font-semibold border border-transparent",
    "hover:bg-[var(--ink-2)] active:bg-[var(--bad)]",
  ].join(" "),
  // `ink` — `primary` bilan bir xil qoida (eski chaqiruvlar uchun nom)
  ink: [
    "bg-[var(--ink)] text-[var(--canvas)] font-semibold border border-transparent",
    "hover:bg-[var(--brand)] hover:text-[var(--ink-on-brand)]",
    "active:bg-[var(--brand-press)]",
  ].join(" "),
};

const BASE = [
  "relative inline-flex items-center justify-center rounded-[var(--r-ctl)]",
  "font-medium whitespace-nowrap select-none focus-ring",
  // Barcha xususiyatlar bitta ohangda — rang to'satdan sakramaydi
  "transition-[background-color,border-color,box-shadow,transform,color,opacity]",
  "duration-[var(--t-base)] ease-[var(--ease-snap)]",
  // Bosilganda siqilish — "bosildi" tuyg'usini beradi
  "active:scale-[0.97]",
  "disabled:pointer-events-none disabled:opacity-40",
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
        "border border-[var(--edge)] bg-[var(--pane)] font-sans text-[11px] font-medium text-[var(--ink-3)]",
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
   --------------------------------------------------------------------------
   Palitrada yashil/sariq/qizil yo'q, shuning uchun daraja RANG bilan emas
   ikki signal bilan beriladi: nechta ustun to'lgani (shakl) va ustunlar
   qanchalik quyuq ekani (ton). Bu yondashuv rang ko'rmaydigan foydalanuvchi
   uchun ham baravar ishlaydi.

   Yorliq matni doim `--ink-2`: eng och ton (`--easy`) 12px matnda oq fonda
   AA kontrast bermaydi, ustun belgisi uchun esa yetarli.
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
        <span className="text-[13px] font-medium text-[var(--ink-2)]">{label ?? value}</span>
      ) : null}
    </span>
  );
}

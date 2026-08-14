"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   TUGMA
   --------------------------------------------------------------------------
   Shakl: 10px burchakli to'rtburchak. Kapsula tizimda YO'Q — u interfeysga
   "o'yinchoq" ohang beradi va yonidagi kirish maydoni (8px) bilan bir
   oilada turmaydi.

   Uchta og'irlik, undan ortig'i kerak emas:

     primary  — to'yingan yashil, oq matn. Ekranda BITTA bo'ladi.
     quiet    — oq yuza, bir piksel chiziq. Ikkinchi darajali amal.
     ghost    — fonsiz, faqat matn. Uchinchi daraja va ikonka tugmalari.

   Javob QANDAY beriladi: hoverda fon bir pog'ona o'zgaradi (120ms),
   bosilganda tugma 1px pastga cho'kadi. Masshtab, siljish, porlash va
   soya "sakrashi" YO'Q — bular jadval ichida qatorni titratadi.
   ========================================================================== */

type Variant = "primary" | "quiet" | "ghost" | "danger" | "brand" | "brand-soft" | "ink";
type Size = "sm" | "md" | "lg" | "xl";

/* Balandliklar 36-48px. Eski shkala 40-64px edi: interfeys tugmasi
   sahifadagi eng katta element bo'lib qolgandi. */
const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-[14px]",
  lg: "h-11 gap-2 px-5 text-[15px]",
  xl: "h-12 gap-2.5 px-6 text-[15px]",
};

const ICON_SIZES: Record<Size, string> = {
  sm: "size-9",
  md: "size-10",
  lg: "size-11",
  xl: "size-12",
};

const VARIANTS: Record<Variant, string> = {
  primary: [
    "bg-[var(--green)] text-[var(--text-on-green)] font-medium border border-transparent",
    "shadow-[var(--shadow-xs)]",
    "hover:bg-[var(--green-hover)] active:bg-[var(--green-active)]",
  ].join(" "),
  quiet: [
    "bg-[var(--surface)] text-[var(--text)] border border-[var(--line-strong)] font-medium",
    "hover:bg-[var(--surface-hover)] hover:border-[var(--line-strong)]",
    "active:bg-[var(--surface-sunk)]",
  ].join(" "),
  ghost: [
    "bg-transparent text-[var(--text-2)] border border-transparent",
    "hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
    "active:bg-[var(--surface-sunk)]",
  ].join(" "),
  /* `brand` — `primary` bilan bir xil. Yashil blok ichida (`on-green`)
     tokenlar ag'darilgani uchun u avtomatik OQ tugmaga aylanadi. */
  brand: [
    "bg-[var(--green)] text-[var(--text-on-green)] font-medium border border-transparent",
    "shadow-[var(--shadow-xs)]",
    "hover:bg-[var(--green-hover)] active:bg-[var(--green-active)]",
  ].join(" "),
  "brand-soft": [
    "bg-[var(--green-wash)] text-[var(--green-text)] border border-[var(--green-line)] font-medium",
    "hover:bg-[var(--green-wash-2)]",
  ].join(" "),
  /* Xavfli amal. Palitrada qizil YO'Q — farq rang bilan emas, OG'IRLIK
     bilan beriladi: bu yagona to'q siyoh tugma. Ma'noni yorliq va tasdiq
     oynasining matni tashiydi. */
  danger: [
    "bg-[var(--danger)] text-[var(--bg)] font-medium border border-transparent",
    "hover:bg-[var(--text-2)] active:bg-[var(--danger)]",
  ].join(" "),
  ink: [
    "bg-[var(--text)] text-[var(--bg)] font-medium border border-transparent",
    "hover:bg-[var(--text-2)] active:bg-[var(--text)]",
  ].join(" "),
};

const BASE = [
  "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)]",
  "whitespace-nowrap select-none ring-focus",
  "transition-[background-color,border-color,color,opacity] duration-[var(--dur-1)] ease-[var(--ease)]",
  // Yagona mikro-interaksiya: bosilganda bir piksel cho'kish
  "active:translate-y-px",
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
   CHIP — ixcham yorliq
   --------------------------------------------------------------------------
   6px burchak, haqiqiy chegara, 12px matn. Ilgari chip kapsula edi va
   halqasi `box-shadow` bilan chizilardi — ro'yxatda o'nlab kapsula yonma-yon
   turganda sahifa "tabletkalarga" to'lardi. Endi u sokin yorliq: ma'noni
   MATNI tashiydi, shakli emas.
   ========================================================================== */

type Tone = "neutral" | "brand" | "ok" | "warn" | "bad" | "note" | "flare";

const TONES: Record<Tone, { wash: string; ink: string; line: string; dot: string }> = {
  neutral: {
    wash: "bg-[var(--surface-sunk)]",
    ink: "text-[var(--text-3)]",
    line: "border-[var(--line)]",
    dot: "bg-[var(--text-4)]",
  },
  brand: {
    wash: "bg-[var(--green-wash)]",
    ink: "text-[var(--green-text)]",
    line: "border-[var(--green-line)]",
    dot: "bg-[var(--green)]",
  },
  ok: {
    wash: "bg-[var(--ok-wash)]",
    ink: "text-[var(--ok)]",
    line: "border-[var(--ok-line)]",
    dot: "bg-[var(--ok)]",
  },
  warn: {
    wash: "bg-[var(--warn-wash)]",
    ink: "text-[var(--warn)]",
    line: "border-[var(--warn-line)]",
    dot: "bg-[var(--warn)]",
  },
  bad: {
    wash: "bg-[var(--danger-wash)]",
    ink: "text-[var(--danger)]",
    line: "border-[var(--danger-line)]",
    dot: "bg-[var(--danger)]",
  },
  note: {
    wash: "bg-[var(--info-wash)]",
    ink: "text-[var(--info)]",
    line: "border-[var(--info-line)]",
    dot: "bg-[var(--info)]",
  },
  flare: {
    wash: "bg-[var(--surface-sunk)]",
    ink: "text-[var(--text-2)]",
    line: "border-[var(--line)]",
    dot: "bg-[var(--text)]",
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
  /** Chap tomonda holat nuqtasi */
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border px-2 py-[3px]",
        "text-[12px] leading-[1.35] font-medium whitespace-nowrap",
        t.wash,
        t.ink,
        t.line,
        className,
      )}
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
        "ts-num inline-flex min-w-5 items-center justify-center rounded-[var(--radius-xs)]",
        "bg-[var(--surface-sunk)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-3)]",
        className,
      )}
    >
      {value}
    </span>
  );
}

/** Jonli holat nuqtasi. Halqa "otilishi" (ping) o'rniga sokin so'nish:
    u ko'z chetida turadi, lekin e'tiborni tortib olmaydi. */
export function LiveDot({ tone = "ok", className }: { tone?: Tone; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cn("pulse-soft flex size-2 shrink-0 rounded-full", t.dot, className)} />
  );
}

/** Klaviatura klavishasi — buyruq paneli va yorliqlar uchun. */
export function KeyHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-xs)] px-1.5",
        "border border-[var(--line)] bg-[var(--surface-sunk)] font-sans text-[11px] font-medium text-[var(--text-4)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ==========================================================================
   AJRATGICHLAR
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
        "block shrink-0 bg-[var(--line)]",
        vertical ? "h-full w-px" : "h-px w-full",
        className,
      )}
    />
  );
}

/** Matnli ajratgich — ro'yxatni bo'limlarga bo'ladi. */
export function DividerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="ts-label shrink-0">{children}</span>
      <Divider />
    </div>
  );
}

/**
 * Bo'lim yorlig'i — kichik, katta harflarda, tinch kulrang.
 *
 * `index` parametri saqlangan (chaqiruvlar ko'p), lekin endi hech qanday
 * bezak chizmaydi: oldin raqam yashil rangda va yonida yashil chiziqcha
 * bilan chizilardi — bu "hujjat" ohangi yangi tizimning tinchligiga
 * to'g'ri kelmaydi.
 */
export function Eyebrow({
  children,
  className,
}: {
  index?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("ts-label", className)}>{children}</p>;
}

/* ==========================================================================
   QIYINLIK BELGISI
   --------------------------------------------------------------------------
   Daraja ikki signal bilan beriladi: nechta ustun to'lgani (SHAKL) va
   ustunlar qanchalik quyuq yashil ekani (TON). Rang ko'rmaydigan
   foydalanuvchi uchun ham baravar ishlaydi.
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
            className="w-[3px] rounded-[1px]"
            style={{
              height: `${5 + index * 3}px`,
              backgroundColor: index < level ? color : "var(--line-strong)",
            }}
          />
        ))}
      </span>
      {showLabel ? (
        <span className="text-[13px] text-[var(--text-2)]">{label ?? value}</span>
      ) : null}
    </span>
  );
}

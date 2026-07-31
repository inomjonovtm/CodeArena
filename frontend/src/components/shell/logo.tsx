import Link from "next/link";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Logotip
   --------------------------------------------------------------------------
   Belgi — buyruq qatori kursori: QORA kvadrat ichida monoshriftdagi `>`.
   So'z ham to'liq qora. Logotipda ko'k YO'Q: dizayn tizimida ko'k faqat
   bosiladigan yoki muhim narsani bildiradi, brend nomi esa ikkalasi ham
   emas — u shunchaki turadi.

   Ko'k faqat bitta joyda ko'rinadi: sichqoncha logotipga kelganda belgi
   ko'kga o'tadi. Ya'ni bu yerda ham qoida bir xil — hover = ko'k.

   Ranglar `--ink`/`--canvas` orqali olinadi, shuning uchun qora futer yoki
   to'q bo'lim ichida (`on-dark`) logotip o'zi teskari tomonga ag'dariladi:
   oq kvadrat, qora belgi. Alohida "oq versiya" saqlash shart emas.
   ========================================================================== */

const MARK_SIZES = {
  sm: "size-[28px] rounded-[8px] text-[14px]",
  md: "size-[32px] rounded-[9px] text-[16px]",
  lg: "size-10 rounded-[10px] text-[19px]",
} as const;

const WORD_SIZES = {
  sm: "text-[16px]",
  md: "text-[18px]",
  lg: "text-[21px]",
} as const;

export function LogoMark({
  size = "md",
  className,
}: {
  size?: keyof typeof MARK_SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-[var(--ink)] font-mono font-bold",
        "text-[var(--canvas)] transition-colors duration-[var(--t-base)]",
        "group-hover/logo:bg-[var(--brand)] group-hover/logo:text-[var(--ink-on-brand)]",
        MARK_SIZES[size],
        className,
      )}
    >
      {/* Kursor belgisi optik markazdan bir piksel chapda turadi */}
      <span className="-translate-x-[0.5px] leading-none">&gt;</span>
    </span>
  );
}

export function Logo({
  size = "md",
  showWord = true,
  className,
}: {
  size?: keyof typeof MARK_SIZES;
  showWord?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("group/logo flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWord ? (
        <span
          className={cn(
            "font-[family-name:var(--font-display)] font-bold tracking-[-0.035em] text-[var(--ink)]",
            WORD_SIZES[size],
          )}
        >
          CodeArena
        </span>
      ) : null}
    </span>
  );
}

/** Bosh sahifaga qaytaruvchi logotip — fokus halqasi bilan. */
export function LogoLink({
  size = "md",
  href = "/",
  showWord = true,
  className,
}: {
  size?: keyof typeof MARK_SIZES;
  href?: string;
  showWord?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="CodeArena — bosh sahifa"
      className={cn("focus-ring shrink-0 rounded-[var(--r-ctl)]", className)}
    >
      <Logo size={size} showWord={showWord} />
    </Link>
  );
}

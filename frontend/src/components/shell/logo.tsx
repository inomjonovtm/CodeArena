import Link from "next/link";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Logotip
   --------------------------------------------------------------------------
   Belgi — buyruq qatori kursori: ko'k kvadrat ichida monoshriftdagi `>`.
   Umumiy "terminal" ikonkasidan farqli, u tizimning monoshrift qatlamiga
   bog'lanadi — raqamlar, kod va yorliqlar bilan bir xil ovozda gapiradi.

   Bitta manba: sayt paneli, mobil menyu, muqova va admin — hammasi shu
   yerdan oladi, shuning uchun belgi hech qayerda "ozgina boshqacha" bo'lmaydi.
   ========================================================================== */

const MARK_SIZES = {
  sm: "size-[26px] rounded-[6px] text-[13px]",
  md: "size-[30px] rounded-[7px] text-[15px]",
  lg: "size-9 rounded-[9px] text-[18px]",
} as const;

const WORD_SIZES = {
  sm: "text-[15px]",
  md: "text-[16.5px]",
  lg: "text-[19px]",
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
        "flex shrink-0 items-center justify-center bg-[var(--brand)] font-mono font-bold",
        "text-[var(--ink-on-brand)] shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]",
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
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWord ? (
        <span
          className={cn(
            "font-[family-name:var(--font-display)] font-bold tracking-[-0.035em] text-[var(--ink)]",
            WORD_SIZES[size],
          )}
        >
          Code<span className="text-[var(--brand)]">Arena</span>
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

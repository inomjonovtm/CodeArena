import Link from "next/link";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Logotip
   --------------------------------------------------------------------------
   Belgi — buyruq qatori kursori: YASHIL kvadrat ichida monoshriftdagi `>`.
   Yashil bu yerda o'rinli: logotip brendning o'zi, ya'ni tizimdagi eng
   muhim "detal". So'z esa siyoh rangida qoladi — ikkalasi ham yashil bo'lsa
   belgi ajralib turmaydi.

   Sichqoncha kelganda belgi SIYOHGA o'tadi (yashilga emas). Ya'ni hover
   javobi rang almashuvi bilan beriladi, lekin teskari yo'nalishda: yashil
   allaqachon tinch holat.

   Ranglar `--green`/`--text` orqali olinadi, shuning uchun yashil blok ichida
   (`on-green`) logotip o'zi teskari tomonga ag'dariladi: oq kvadrat, yashil
   belgi, oq so'z. Alohida "oq versiya" saqlash shart emas.
   ========================================================================== */

const MARK_SIZES = {
  sm: "size-[28px] rounded-[var(--radius-sm)] text-[14px]",
  md: "size-[34px] rounded-[var(--radius-sm)] text-[16px]",
  lg: "size-[42px] rounded-[var(--radius-md)] text-[20px]",
} as const;

const WORD_SIZES = {
  sm: "text-[15px]",
  md: "text-[17px]",
  lg: "text-[20px]",
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
        "flex shrink-0 items-center justify-center bg-[var(--green)] font-mono font-bold",
        "text-[var(--text-on-green)] transition-colors duration-[var(--dur-2)]",
        "group-hover/logo:bg-[var(--text)] group-hover/logo:text-[var(--bg)]",
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
            "font-semibold tracking-[-0.03em] text-[var(--text)]",
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
      className={cn("ring-focus shrink-0 rounded-[var(--radius-sm)]", className)}
    >
      <Logo size={size} showWord={showWord} />
    </Link>
  );
}

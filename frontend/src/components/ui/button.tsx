"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "dangerSoft"
  | "link";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl" | "icon" | "iconSm";

/* Qoidalar `kit/primitives.tsx` bilan bir xil:
   asosiy tugma QORA → hoverda KO'K, chegarali tugma qora chiziq → ko'k. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--ink)] font-semibold text-[var(--canvas)] border border-transparent",
    "hover:bg-[var(--brand)] hover:text-[var(--ink-on-brand)]",
    "active:bg-[var(--brand-press)]",
  ].join(" "),
  // To'yingan ko'k — to'q fondagi va ikkinchi kuchli chaqiriq uchun
  secondary: [
    "bg-[var(--brand)] font-semibold text-[var(--ink-on-brand)] border border-transparent",
    "hover:bg-[var(--brand-hover)] active:bg-[var(--brand-press)]",
  ].join(" "),
  outline: [
    "border border-[var(--ink)] bg-transparent font-semibold text-[var(--ink)]",
    "hover:border-[var(--brand)] hover:text-[var(--brand)]",
    "active:bg-[var(--brand-wash)]",
  ].join(" "),
  ghost: "text-[var(--ink-2)] hover:bg-[var(--pane-hover)] hover:text-[var(--brand)]",
  /* Qizil yo'q — xavfli amal qora tugma, lekin hoverda ko'kka o'tmaydi. */
  danger: [
    "bg-[var(--bad)] text-[var(--canvas)] font-semibold border border-transparent",
    "hover:bg-[var(--ink-2)] active:bg-[var(--bad)]",
  ].join(" "),
  dangerSoft:
    "bg-[var(--bad-wash)] text-[var(--ink)] font-semibold hover:bg-[var(--ink)] hover:text-[var(--canvas)]",
  link: "text-[var(--brand)] underline-offset-4 hover:underline p-0 h-auto",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-8 gap-1 rounded-[8px] px-2.5 text-[12px]",
  sm: "h-9 gap-1.5 rounded-[var(--r-ctl)] px-3.5 text-[13px]",
  md: "h-10 gap-2 rounded-[var(--r-ctl)] px-4 text-[14px]",
  lg: "h-12 gap-2.5 rounded-[var(--r-ctl)] px-7 text-[15px] hover:-translate-y-0.5",
  xl: "h-14 gap-2.5 rounded-[var(--r-ctl)] px-8 text-[16px] hover:-translate-y-0.5",
  icon: "size-10 rounded-[var(--r-ctl)]",
  iconSm: "size-9 rounded-[var(--r-ctl)]",
};

/** Tugma va havola bir xil ko'rinsin — sinflar bitta joydan chiqadi. */
const BASE = [
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium focus-ring",
  "transition-[background-color,border-color,box-shadow,transform,opacity,color]",
  "duration-[var(--t-base)] ease-[var(--ease-snap)]",
  // Bosilganda siqilish — bosishni tasdiqlaydi
  "active:scale-[0.97]",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, icon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
};

/**
 * Tugma ko'rinishidagi havola.
 *
 * Ilgari admin jadvallarida `<Link><Button/></Link>` yozilgan edi: HTML'da
 * interaktiv elementni interaktiv element ichiga solib bo'lmaydi va ichkaridagi
 * tugma `tabIndex={-1}` bilan "o'chirib" qo'yilgandi. Bitta `<a>` toza va
 * klaviatura bilan ham to'g'ri ishlaydi.
 */
export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  icon,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

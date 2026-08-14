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

/* Qoidalar `kit/primitives.tsx` bilan bir xil: 10px burchak, uchta
   og'irlik, bosilganda bir piksel cho'kish. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--green)] font-medium text-[var(--text-on-green)] border border-transparent",
    "shadow-[var(--shadow-xs)]",
    "hover:bg-[var(--green-hover)] active:bg-[var(--green-active)]",
  ].join(" "),
  secondary: [
    "bg-[var(--green-wash)] font-medium text-[var(--green-text)] border border-[var(--green-line)]",
    "hover:bg-[var(--green-wash-2)]",
  ].join(" "),
  outline: [
    "border border-[var(--line-strong)] bg-[var(--surface)] font-medium text-[var(--text)]",
    "hover:bg-[var(--surface-hover)] active:bg-[var(--surface-sunk)]",
  ].join(" "),
  ghost: "text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
  /* Qizil yo'q — xavfli amal to'q siyoh tugma. */
  danger: [
    "bg-[var(--danger)] text-[var(--bg)] font-medium border border-transparent",
    "hover:bg-[var(--text-2)] active:bg-[var(--danger)]",
  ].join(" "),
  dangerSoft:
    "bg-[var(--danger-wash)] text-[var(--text)] font-medium border border-[var(--danger-line)] hover:bg-[var(--surface-sunk)]",
  link: "text-[var(--green-text)] underline-offset-4 hover:underline p-0 h-auto",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-8 gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-[13px]",
  sm: "h-9 gap-1.5 rounded-[var(--radius-md)] px-3 text-[13px]",
  md: "h-10 gap-2 rounded-[var(--radius-md)] px-4 text-[14px]",
  lg: "h-11 gap-2 rounded-[var(--radius-md)] px-5 text-[15px]",
  xl: "h-12 gap-2.5 rounded-[var(--radius-md)] px-6 text-[15px]",
  icon: "size-10 rounded-[var(--radius-md)]",
  iconSm: "size-9 rounded-[var(--radius-md)]",
};

/** Tugma va havola bir xil ko'rinsin — sinflar bitta joydan chiqadi. */
const BASE = [
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap ring-focus",
  "transition-[background-color,border-color,color,opacity] duration-[var(--dur-1)] ease-[var(--ease)]",
  "active:translate-y-px",
  "disabled:pointer-events-none disabled:opacity-45",
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

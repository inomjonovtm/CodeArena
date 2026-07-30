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
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "iconSm";

/* Tugma boshqaruv elementi — kapsula emas, o'tkir `--r-ctl` burchak. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--brand)] font-semibold text-[var(--ink-on-brand)]",
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]",
    "hover:bg-[var(--brand-hover)] hover:shadow-[var(--lift-brand),inset_0_1px_0_rgb(255_255_255/0.2)]",
    "active:bg-[var(--brand-press)] active:shadow-[inset_0_1px_2px_rgb(0_0_0/0.2)]",
  ].join(" "),
  secondary: [
    "bg-[var(--ink)] font-semibold text-[var(--canvas)]",
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]",
    "hover:bg-[var(--ink-2)] active:bg-[var(--ink)]",
  ].join(" "),
  outline: [
    // Oq sirt + soch chizig'i: iliq qog'ozda "bosiladigan predmet" ko'rinadi
    "border border-[var(--edge)] bg-[var(--pane)] text-[var(--ink)]",
    "hover:border-[var(--edge-strong)] hover:bg-[var(--pane-hover)]",
    "active:bg-[var(--canvas-deep)]",
  ].join(" "),
  ghost: "text-[var(--ink-2)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
  danger: [
    "bg-[var(--bad)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]",
    "hover:brightness-110 active:brightness-95",
  ].join(" "),
  dangerSoft:
    "bg-[var(--bad-wash)] text-[var(--bad)] hover:bg-[var(--bad)] hover:text-white",
  link: "text-[var(--brand)] underline-offset-4 hover:underline p-0 h-auto",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-7 gap-1 rounded-[6px] px-2 text-[12px]",
  sm: "h-8 gap-1.5 rounded-[var(--r-ctl)] px-2.5 text-[12.5px]",
  md: "h-9 gap-2 rounded-[var(--r-ctl)] px-3.5 text-[13.5px]",
  lg: "h-11 gap-2 rounded-[var(--r-ctl)] px-5 text-[14.5px]",
  icon: "size-9 rounded-[var(--r-ctl)]",
  iconSm: "size-8 rounded-[var(--r-ctl)]",
};

/** Tugma va havola bir xil ko'rinsin — sinflar bitta joydan chiqadi. */
const BASE = [
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium focus-ring",
  "transition-[background-color,border-color,box-shadow,transform,opacity,color]",
  "duration-[var(--t-fast)] ease-[var(--ease-snap)]",
  // Bosilganda arzimas siqilish — bosishni tasdiqlaydi
  "active:scale-[0.985]",
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

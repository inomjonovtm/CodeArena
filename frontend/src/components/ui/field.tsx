"use client";

import { Check, Minus } from "lucide-react";
import { forwardRef, useId } from "react";

import { useAutoGrow } from "@/hooks/use-auto-grow";
import { cn } from "@/lib/utils";

export { FilterSelect, Listbox, PageSizeSelect, Select } from "./select";
export type { SelectOption, SelectProps } from "./select";
export { SegmentedControl, ToggleChip } from "./segmented";
export type { SegmentOption } from "./segmented";

/* Kirish maydoni "botiq" — yozish mumkinligi shakldan ko'rinadi.
   Fokusda maydon oqarib ko'tariladi va brend halqasi paydo bo'ladi. */
const baseControl =
  "w-full rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] px-3.5 text-sm text-[var(--ink)] " +
  "placeholder:text-[var(--ink-4)] outline-none " +
  "transition-[background-color,border-color,box-shadow] duration-[var(--t-fast)] " +
  "hover:border-[var(--edge)] " +
  "focus:border-[var(--brand-edge)] focus:bg-[var(--pane-solid)] focus:shadow-[0_0_0_var(--focus-w)_var(--focus)] " +
  "disabled:cursor-not-allowed disabled:opacity-55";

// ------------------------------------------------------------------ Field
interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, error, required, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-[var(--ink-2)]">
          {label}
          {required ? <span className="ml-0.5 text-[var(--bad)]">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-[var(--bad)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--ink-4)]">{hint}</p>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ Input
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  prefixIcon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, prefixIcon, suffix, ...props },
  ref,
) {
  if (prefixIcon || suffix) {
    return (
      <div className="relative flex items-center">
        {prefixIcon ? (
          <span className="pointer-events-none absolute left-3.5 text-[var(--ink-4)]">{prefixIcon}</span>
        ) : null}
        <input
          ref={ref}
          className={cn(
            baseControl,
            "h-9",
            prefixIcon && "pl-10",
            suffix && "pr-10",
            invalid && "border-[var(--bad)] focus:border-[var(--bad)]",
            className,
          )}
          {...props}
        />
        {suffix ? <span className="absolute right-3.5 text-[var(--ink-4)]">{suffix}</span> : null}
      </div>
    );
  }
  return (
    <input
      ref={ref}
      className={cn(
        baseControl,
        "h-9",
        invalid && "border-[var(--bad)] focus:border-[var(--bad)]",
        className,
      )}
      {...props}
    />
  );
});

// --------------------------------------------------------------- Textarea
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** Kontentga qarab o'zi cho'zilsin (sukut bo'yicha — ha) */
  autoGrow?: boolean;
  maxRows?: number;
}

/** Sayt qismidagi `kit` maydoni bilan bir xil xulq — mantiq umumiy hookda. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, autoGrow = true, maxRows = 18, onChange, ...props },
  ref,
) {
  const { setRef, resize } = useAutoGrow({
    enabled: autoGrow,
    maxRows,
    value: props.value,
    forwardedRef: ref,
  });

  return (
    <textarea
      ref={setRef}
      rows={rows}
      onChange={(event) => {
        resize();
        onChange?.(event);
      }}
      className={cn(
        baseControl,
        autoGrow ? "resize-none" : "resize-y",
        "py-2.5 leading-relaxed",
        invalid && "border-[var(--bad)] focus:border-[var(--bad)]",
        className,
      )}
      {...props}
    />
  );
});

// --------------------------------------------------------------- Checkbox
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

/* Tug'ma `accent-color` kvadrati platformaga qarab turlicha chiziladi va
   brend ko'ki xira chiqadi. Shuning uchun kvadrat o'zimizniki: `appearance-none`
   input + ustidagi belgi. Klaviatura va `indeterminate` xulqi saqlanadi. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, description, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex items-start gap-2.5">
      <span className="relative mt-0.5 inline-flex size-4 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            "peer size-4 cursor-pointer appearance-none rounded-[5px] focus-ring",
            "border border-[var(--edge-strong)] bg-[var(--pane-solid)]",
            "transition-[background-color,border-color] duration-[var(--t-fast)]",
            "hover:border-[var(--brand)]",
            "checked:border-[var(--brand)] checked:bg-[var(--brand)]",
            "indeterminate:border-[var(--brand)] indeterminate:bg-[var(--brand)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <Check
          aria-hidden
          strokeWidth={3.2}
          className="pointer-events-none absolute size-3 text-[var(--ink-on-brand)] opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
        />
        <Minus
          aria-hidden
          strokeWidth={3.2}
          className="pointer-events-none absolute size-3 text-[var(--ink-on-brand)] opacity-0 peer-indeterminate:opacity-100"
        />
      </span>
      {label || description ? (
        <label htmlFor={inputId} className="cursor-pointer select-none">
          {label ? (
            <span className="text-[13px] font-medium text-[var(--ink)]">{label}</span>
          ) : null}
          {description ? <p className="text-xs text-[var(--ink-4)]">{description}</p> : null}
        </label>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------- Switch
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {label || description ? (
        <div className="min-w-0">
          {label ? <p className="text-[13px] font-medium text-[var(--ink)]">{label}</p> : null}
          {description ? <p className="text-xs text-[var(--ink-4)]">{description}</p> : null}
        </div>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-[var(--r-chip)] focus-ring",
          "transition-colors duration-[var(--t-base)] ease-[var(--ease-snap)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "bg-[var(--brand)] shadow-[inset_0_1px_2px_rgb(0_0_0/0.14)]"
            : "border border-[var(--edge)] bg-[var(--pane-sunken)]",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-4.5 -translate-y-1/2 rounded-[7px] bg-white",
            "shadow-[0_1px_3px_rgb(15_26_51/0.28)]",
            "transition-[left] duration-[var(--t-base)] ease-[var(--ease-snap)]",
            checked ? "left-[calc(100%-1.25rem)]" : "left-[3px]",
          )}
        />
      </button>
    </div>
  );
}

"use client";

import { Search, X } from "lucide-react";
import { forwardRef, useId } from "react";

import { useAutoGrow } from "@/hooks/use-auto-grow";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Maydonlar
   --------------------------------------------------------------------------
   Kirish maydoni "botiq": u sirtdan chuqurroq, ya'ni yozish mumkinligi
   shakldan ko'rinadi. Fokusda maydon oqarib ko'tariladi va brend halqasi
   paydo bo'ladi — bu "endi shu yerdasan" degan aniq signal.

   Chegara doim mavjud, lekin juda nozik: fokusda chegara paydo bo'ladigan
   maydonlar sakraydi va forma "titraydi".
   ========================================================================== */

export const fieldBase = [
  "w-full rounded-[var(--r-field)] border border-[var(--edge)]",
  "bg-[var(--pane-sunken)] text-[var(--ink)]",
  "placeholder:text-[var(--ink-4)]",
  "transition-[background-color,border-color,box-shadow] duration-[var(--t-fast)]",
  "outline-none",
  "hover:border-[var(--edge-strong)]",
  "focus:border-[var(--brand)] focus:bg-[var(--pane-solid)]",
  "focus:shadow-[0_0_0_var(--focus-w)_var(--focus)]",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

export const inputClass = cn(fieldBase, "h-9 px-3 text-[13.5px]");
export const textareaClass = cn(fieldBase, "px-3 py-2.5 text-[13.5px] leading-relaxed resize-y");

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...rest} />;
  },
);

/**
 * Ko'p qatorli maydon — kontentga qarab o'zi cho'ziladi.
 * Mantiq `useAutoGrow` da; admin panelidagi maydon ham xuddi shu hookdan
 * foydalanadi, shuning uchun ikkalasi bir xil ishlaydi.
 */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    autoGrow?: boolean;
    /** Shu qatordan keyin maydon o'smaydi, ichida aylanadi. */
    maxRows?: number;
  }
>(function Textarea(
  { className, rows = 4, autoGrow = true, maxRows = 18, onChange, ...rest },
  ref,
) {
  const { setRef, resize } = useAutoGrow({
    enabled: autoGrow,
    maxRows,
    value: rest.value,
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
      className={cn(textareaClass, autoGrow && "resize-none", className)}
      {...rest}
    />
  );
});

/**
 * Maydon o'ramasi.
 *
 * Yorliq maydon USTIDA, ichida emas: suzuvchi yorliq chiroyli ko'rinadi,
 * lekin skanerlashda sekin — ko'z har bir maydonga alohida to'xtashi kerak.
 * Xato matni maydon ostida, qizil chegara bilan birga.
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--ink-2)]"
        >
          {label}
          {required ? <span className="text-[var(--bad)]">*</span> : null}
        </label>
      ) : null}

      <div className={cn(error && "[&_input,&_textarea,&_select]:border-[var(--bad)]")}>
        {children}
      </div>

      {error ? (
        <p className="mt-1.5 text-[12.5px] text-[var(--bad)]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-[var(--ink-4)]">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Qidiruv maydoni — ikonka ichkarida, tozalash tugmasi faqat matn borida.
 * Tozalash tugmasi doim ko'rinib tursa, u bo'sh maydonni ham "to'la"
 * ko'rsatadi va ko'zni chalg'itadi.
 */
export function SearchField({
  value,
  onValueChange,
  placeholder = "Qidirish...",
  className,
  autoFocus,
  onKeyDown,
}: {
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--ink-4)]" />
      <input
        id={id}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, "pl-9", value ? "pr-9" : "pr-3", "[&::-webkit-search-cancel-button]:hidden")}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Tozalash"
          className={cn(
            "absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center",
            "rounded-[6px] text-[var(--ink-4)] transition-colors",
            "hover:bg-[var(--pane-hover)] hover:text-[var(--ink-2)] focus-ring",
          )}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Almashtirgich.
 *
 * Klassik "kapsula + doira" o'rniga kengroq trek va kvadratsimon tugma:
 * bu boshqaruv elementiga o'xshaydi, o'yinchoqqa emas. Yoqilganda tugma
 * brend rangida yorug'lik oladi.
 */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-10 shrink-0 rounded-[var(--r-chip)] focus-ring",
        "transition-colors duration-[var(--t-base)] ease-[var(--ease-snap)]",
        "disabled:opacity-50",
        checked
          ? "bg-[var(--brand)] shadow-[inset_0_1px_2px_rgb(0_0_0/0.16)]"
          : "border border-[var(--edge-strong)] bg-[var(--pane-sunken)]",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-white",
          "shadow-[0_1px_3px_rgb(26_25_23/0.3)]",
          "transition-[left] duration-[var(--t-base)] ease-[var(--ease-snap)]",
          checked ? "left-[calc(100%-1.125rem)]" : "left-[2px]",
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-[var(--ink)]">{label}</p>
        {hint ? <p className="t-meta mt-0.5 text-[var(--ink-4)]">{hint}</p> : null}
      </div>
      {control}
    </div>
  );
}

/**
 * Tanlov qatori — radio guruhning ko'rinadigan varianti.
 * Har bir variant bosiladigan karta; tanlangani brend chegarasi va
 * yuvindisi bilan ajraladi.
 */
export function ChoiceRow<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode }[];
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)} role="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-start gap-3 rounded-[var(--r-field)] border p-3.5 text-left focus-ring",
              "transition-[background-color,border-color,box-shadow] duration-[var(--t-fast)]",
              active
                ? "border-[var(--brand)] bg-[var(--brand-wash)] shadow-[inset_0_0_0_1px_var(--brand)]"
                : "border-[var(--edge)] bg-[var(--pane-sunken)] hover:border-[var(--edge-strong)]",
            )}
          >
            {option.icon ? (
              <span className={cn("mt-0.5", active ? "text-[var(--brand)]" : "text-[var(--ink-4)]")}>
                {option.icon}
              </span>
            ) : null}
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[13.5px] font-medium",
                  active ? "text-[var(--brand-ink)]" : "text-[var(--ink)]",
                )}
              >
                {option.label}
              </span>
              {option.hint ? (
                <span className="mt-0.5 block text-[12.5px] text-[var(--ink-4)]">{option.hint}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

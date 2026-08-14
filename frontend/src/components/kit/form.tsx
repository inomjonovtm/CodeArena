"use client";

import { Search, X } from "lucide-react";
import { forwardRef, useId } from "react";

import { useAutoGrow } from "@/hooks/use-auto-grow";
import { cn } from "@/lib/utils";

/* ==========================================================================
   MAYDONLAR
   --------------------------------------------------------------------------
   Maydon oq sirtda, ingichka chegara bilan — karta bilan bir xil tilda.
   Fokusda chegara yashilga o'tadi va tizimning umumiy konturi chiziladi
   (`skog.css`, 7-bo'lim). Maydonning o'z halqasi YO'Q: ikkalasi ustma-ust
   tushsa, atrofida ikki qavatli yashil ramka hosil bo'lardi.

   Balandlik 40px va matn 14px — tugma (40px) bilan bir xil. Ilgari maydon
   52px edi va tugma yonida turganda forma "qiyshaygan" ko'rinardi.
   ========================================================================== */

export const fieldBase = [
  "w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)]",
  "bg-[var(--surface)] text-[var(--text)]",
  "placeholder:text-[var(--text-4)]",
  "transition-[border-color] duration-[var(--dur-1)] ease-[var(--ease)]",
  "hover:border-[var(--text-4)]",
  "focus:border-[var(--green)]",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

export const inputClass = cn(fieldBase, "h-10 px-3 text-[14px]");
export const textareaClass = cn(fieldBase, "px-3 py-2.5 text-[14px] leading-relaxed resize-y");

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
          className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[var(--text-2)]"
        >
          {label}
          {required ? <span className="text-[var(--green-text)]">*</span> : null}
        </label>
      ) : null}

      {/* Xato holati palitrada qizil YO'Qligi uchun uch signal bilan
          beriladi: qalinlashgan siyoh chegara, ichki halqa va ostidagi
          ikonkali matn. Rang bitta o'zi ma'no tashimaydi. */}
      <div
        className={cn(
          error &&
            "[&_input,&_textarea,&_select]:border-[var(--text)] [&_input,&_textarea,&_select]:shadow-[inset_0_0_0_1px_var(--text)]",
        )}
      >
        {children}
      </div>

      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[var(--text)]">
          <span
            aria-hidden
            className="mt-[3px] grid size-4 shrink-0 place-items-center rounded-full bg-[var(--danger)] text-[10px] leading-none font-bold text-[var(--bg)]"
          >
            !
          </span>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-[var(--text-4)]">{hint}</p>
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
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-4)]" />
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
            "rounded-[6px] text-[var(--text-4)] transition-colors",
            "hover:bg-[var(--surface-hover)] hover:text-[var(--text-2)] ring-focus",
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
        "relative h-[22px] w-10 shrink-0 rounded-[var(--radius-xs)] ring-focus",
        "transition-colors duration-[var(--dur-2)] ease-[var(--ease)]",
        "disabled:opacity-50",
        checked
          ? "bg-[var(--green)]"
          : "border border-[var(--line-strong)] bg-[var(--surface-sunk)]",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-white",
          "shadow-[var(--shadow-xs)]",
          "transition-[left] duration-[var(--dur-2)] ease-[var(--ease)]",
          checked ? "left-[calc(100%-1.125rem)]" : "left-[2px]",
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <p className="text-[14.5px] font-medium text-[var(--text)]">{label}</p>
        {hint ? <p className="ts-sm mt-0.5 text-[var(--text-4)]">{hint}</p> : null}
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
              "flex items-start gap-3 rounded-[var(--radius-sm)] border p-3.5 text-left ring-focus",
              "transition-[background-color,border-color,box-shadow] duration-[var(--dur-1)]",
              active
                ? "border-[var(--green)] bg-[var(--green-wash)] shadow-[inset_0_0_0_1px_var(--green)]"
                : "border-[var(--line)] bg-[var(--surface-sunk)] hover:border-[var(--line-strong)]",
            )}
          >
            {option.icon ? (
              <span className={cn("mt-0.5", active ? "text-[var(--green)]" : "text-[var(--text-4)]")}>
                {option.icon}
              </span>
            ) : null}
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[14.5px] font-medium",
                  active ? "text-[var(--green-text)]" : "text-[var(--text)]",
                )}
              >
                {option.label}
              </span>
              {option.hint ? (
                <span className="mt-0.5 block text-[13px] text-[var(--text-4)]">{option.hint}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

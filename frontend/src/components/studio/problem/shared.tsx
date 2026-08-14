"use client";

import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Children, isValidElement, type ReactNode } from "react";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Studio formalarining umumiy elementlari
   --------------------------------------------------------------------------
   `components/ui/field.tsx` sayt va admin uchun qurilgan: balandligi 52px,
   yorlig'i katta. Studio zichroq va yorliqlari kichik katta harfli — bir
   ekranda ko'proq maydon sig'sin.
   ========================================================================== */

/* ==========================================================================
   OGOHLANTIRISH
   --------------------------------------------------------------------------
   Studio'da odam qaytarib bo'lmaydigan ishlar qiladi: masalani chop etadi,
   testni o'chiradi, chop etilgan masalaning manzilini o'zgartiradi. Ilgari
   bu ishlar hech qanday izohsiz bajarilardi — natija faqat toast xabarida
   ko'rinardi, ya'ni ish BAJARILGANDAN keyin.

   `StNotice` — ishdan OLDIN turadigan qator. Uch ohang bor va ular rang
   bilan emas, IKONKA va OG'IRLIK bilan farqlanadi (palitrada qizil yo'q):

     info   — shunchaki tushuntirish;
     warn   — "bu ishning oqibati bor" (chegara chizig'i qalinroq);
     danger — "qaytarib bo'lmaydi" (to'la siyoh chegara + qalin matn).
   ========================================================================== */
export function StNotice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "warn" | "danger";
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "danger" ? ShieldAlert : tone === "warn" ? AlertTriangle : Info;

  return (
    <div
      data-tone={tone}
      className={cn(
        "flex items-start gap-3 rounded-[12px] border px-4 py-3",
        tone === "info" && "border-[var(--st-edge)] bg-[var(--st-sunken)]",
        tone === "warn" && "border-[var(--green-line)] bg-[var(--green-wash)]",
        tone === "danger" && "border-[var(--text-4)] bg-[var(--st-sunken)]",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-[18px] shrink-0",
          tone === "info" ? "text-[var(--text-4)]" : "text-[var(--green-text)]",
          tone === "danger" && "text-[var(--text)]",
        )}
      />
      <div className="min-w-0 flex-1">
        {title ? (
          <p
            className={cn(
              "text-[15.5px] leading-snug",
              tone === "danger" ? "font-bold text-[var(--text)]" : "font-semibold text-[var(--text)]",
            )}
          >
            {title}
          </p>
        ) : null}
        {children ? (
          <div className={cn("text-[15px] leading-relaxed text-[var(--text-3)]", title && "mt-1")}>
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StField({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="st-label mb-1.5 block">
          {label}
          {required ? <span className="ml-1 text-[var(--green-text)]">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="mt-1.5 block text-[13.5px] font-medium text-[var(--text)]">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[13.5px] text-[var(--text-4)]">{hint}</span>
      ) : null}
    </label>
  );
}

const CONTROL = [
  "st-sunken w-full px-3 text-[15.5px] text-[var(--text)] outline-none",
  "placeholder:text-[var(--text-4)]",
  "transition-colors focus-visible:border-[var(--green-line)]",
  "disabled:opacity-50",
].join(" ");

export function StInput({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-11", className)} {...rest} />;
}

export function StTextarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "py-2.5 leading-relaxed", className)} {...rest} />;
}

/**
 * Birlik yopishtirilgan maydon — `1000 [ms]`, `256000 [kb]`.
 *
 * Birlikni yorliqqa yozish («Vaqt limiti (millisekund)») uzun va uni
 * har safar o'qish kerak; maydonning O'ZIGA yopishtirilgan belgi esa
 * qiymat bilan birga ko'rinadi va yorliqni qisqartiradi.
 */
export function StInputUnit({
  unit,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <span className="flex w-full min-w-0">
      <input
        className={cn(CONTROL, "h-11 rounded-r-none border-r-0", className)}
        {...rest}
      />
      <span
        aria-hidden
        className={cn(
          "st-sunken grid h-11 shrink-0 place-items-center rounded-l-none border-l-0 px-3.5",
          "text-[14px] font-medium text-[var(--text-4)]",
        )}
      >
        {unit}
      </span>
    </span>
  );
}

/**
 * Ro'yxatdan tanlash — TIZIM `<select>` i EMAS.
 *
 * Native `<select>` ochilganda operatsion tizim o'z ro'yxatini chizadi:
 * boshqa shrift, ko'k tanlov chizig'i, oq fon. Studio esa to'q sirtda
 * ishlaydi, ya'ni ochilgan ro'yxat panelga umuman yopishmasdi va uni CSS
 * bilan tuzatib ham bo'lmaydi.
 *
 * Chaqiruv joylari o'zgarmadi: komponent hamon `<option>` bolalarini
 * qabul qiladi. Ular shu yerda o'qilib, `Listbox` uchun ro'yxatga
 * aylantiriladi — o'nlab joyni qayta yozish shart emas.
 */
export function StSelect({
  className,
  children,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) {
      return [];
    }
    if (child.type !== "option") return [];

    const raw = child.props.children;
    // `<option>` ichida matn bo'laklari bo'lishi mumkin («Oson», {" "}, ...)
    const label = Children.toArray(raw)
      .map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : ""))
      .join("")
      .trim();

    return [{
      value: String(child.props.value ?? ""),
      label: label || String(child.props.value ?? ""),
      disabled: child.props.disabled,
    }];
  });

  return (
    <Select
      studio
      value={String(value ?? "")}
      onChange={(event) =>
        onChange?.({ target: { value: event.target.value } } as never)
      }
      options={options}
      disabled={disabled}
      searchable={options.length > 8}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}

/** Kalit-qiymat almashtirgich — sozlama ro'yxatlari uchun. */
export function StToggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-[9px] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
    >
      <span
        data-on={checked}
        className="mt-0.5 flex h-[18px] w-[32px] shrink-0 items-center rounded-full border border-[var(--st-edge)] bg-[var(--st-sunken)] p-0.5 transition-colors data-[on=true]:border-[var(--green)] data-[on=true]:bg-[var(--green)]"
      >
        <span
          data-on={checked}
          className="size-[12px] rounded-full bg-[var(--text-4)] transition-transform data-[on=true]:translate-x-[14px] data-[on=true]:bg-[var(--text-on-green)]"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[15.5px] font-medium text-[var(--text)]">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[13.5px] text-[var(--text-4)]">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}

/** Kichik tugma — panel sarlavhasidagi amallar uchun. */
export function StButton({
  variant = "quiet",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "brand" | "quiet" | "ghost";
}) {
  const styles = {
    brand:
      "bg-[var(--green)] text-[var(--text-on-green)] hover:bg-[var(--green-hover)] border-transparent",
    quiet:
      "bg-transparent text-[var(--text-2)] border-[var(--st-edge)] hover:border-[var(--green-line)] hover:text-[var(--text)]",
    ghost:
      "bg-transparent text-[var(--text-3)] border-transparent hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
  }[variant];

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4",
        "text-[15px] font-semibold whitespace-nowrap transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        styles,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Dastur chiqishi / test matni uchun monoshriftli quti. */
export function StCode({
  children,
  className,
  wrap,
  max = "16rem",
}: {
  children: React.ReactNode;
  className?: string;
  wrap?: boolean;
  max?: string;
}) {
  return (
    <pre
      style={{ maxHeight: max }}
      className={cn("st-sunken st-code p-3", wrap && "st-code-wrap", className)}
    >
      {children}
    </pre>
  );
}

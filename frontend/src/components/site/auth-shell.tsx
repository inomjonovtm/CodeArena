"use client";

import Link from "next/link";

import { Alert } from "@/components/kit";
import { inputClass } from "@/components/kit/form";
import { LogoLink } from "@/components/shell/logo";
import { cn } from "@/lib/utils";

/** Auth maydonlari kit'dagi `inputClass` bilan bir xil ko'rinadi. */
export const authInputClass = inputClass;

/**
 * KIRISH VA RO'YXATDAN O'TISH QOBIG'I — markazdagi bitta karta.
 *
 * Ilgari sahifa ikki ustun edi: chapda to'yingan yashil brend paneli
 * (matnsiz kod-kompozitsiya bilan), o'ngda forma. Yangi tartibda ortiqcha
 * hech narsa yo'q: och yashil-oq fon (`--bg-tint`), tepada logotip,
 * markazda OQ KARTA ichida forma. Ko'z boradigan yagona joy — karta.
 *
 * Reklama matni bu sahifalarda YO'Q: kirishga kelgan odam nima
 * qilmoqchi ekanini biladi, unga forma kerak.
 */
export function AuthShell({
  title,
  error,
  footer,
  wide,
  children,
}: {
  title: string;
  error?: string | null;
  footer: React.ReactNode;
  /** Ro'yxatdan o'tish kabi IKKI USTUNLI formalar uchun kengroq karta. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-tint)]">
      {/* Tepada faqat logotip — chiqish yo'li har doim ko'rinib turadi */}
      <header className="flex justify-center pt-10 pb-8">
        <LogoLink />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16">
        <div className={cn("w-full", wide ? "max-w-[40rem]" : "max-w-[26rem]")}>
          <div className="card rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
            <h1 className="ts-h2 text-[var(--text)]">{title}</h1>

            {error ? (
              <Alert tone="bad" className="enter-pop mt-5">
                {error}
              </Alert>
            ) : null}

            <div className="mt-6">{children}</div>
          </div>

          {/* Muqobil yo'l kartadan TASHQARIDA: u formaning bir qismi emas */}
          <p className="mt-5 text-center text-[14px] text-[var(--text-3)]">{footer}</p>

          <p className="ts-num mt-10 text-center text-[12px] text-[var(--text-4)]">
            © {new Date().getFullYear()} CodeArena ·{" "}
            <Link href="/terms" className="ring-focus rounded-[3px] hover:text-[var(--text-2)]">
              Shartlar
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="ring-focus rounded-[3px] hover:text-[var(--text-2)]">
              Maxfiylik
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Auth forma maydoni — yorliq tepada, xato/izoh pastda. */
export function AuthField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-[var(--text-2)]">
        {label}
        {required ? <span className="ml-0.5 text-[var(--green-text)]">*</span> : null}
      </label>
      {/* Xato — qalinlashgan siyoh chegara + ichki halqa (palitrada qizil yo'q) */}
      <div
        className={cn(
          error &&
            "[&_input,&_textarea,&_select]:border-[var(--text)] [&_input,&_textarea,&_select]:shadow-[inset_0_0_0_1px_var(--text)]",
        )}
      >
        {children}
      </div>
      {error ? (
        <p className="flex items-start gap-1.5 text-[13px] font-medium text-[var(--text)]">
          <span
            aria-hidden
            className="mt-[3px] grid size-4 shrink-0 place-items-center rounded-full bg-[var(--danger)] text-[10px] leading-none font-bold text-[var(--bg)]"
          >
            !
          </span>
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-[var(--text-4)]">{hint}</p>
      ) : null}
    </div>
  );
}

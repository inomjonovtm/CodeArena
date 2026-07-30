"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Alert } from "@/components/kit";
import { inputClass } from "@/components/kit/form";
import { LogoLink, LogoMark } from "@/components/shell/logo";
import { cn } from "@/lib/utils";

/** Auth maydonlari kit'dagi `inputClass` bilan bir xil ko'rinadi. */
export const authInputClass = inputClass;

/** Yon ustundagi dalillar — raqam bilan, shuning uchun tekshirilishi mumkin. */
const HIGHLIGHTS = [
  "Yuzlab algoritmik masala — oson darajadan olimpiada darajasigacha",
  "Reytingli musobaqalar va 1–10 daraja tizimi",
  "Yechimlarni Python, C++ va JavaScript'da yuborish",
];

/**
 * Kirish va ro'yxatdan o'tish sahifalari uchun umumiy qobiq.
 *
 * Ikki zona: chapda TO'Q brend ustuni, o'ngda iliq qog'ozda oq forma kartasi.
 * To'q va yorug' qarama-qarshiligi eng kuchli ajratgich — u foydalanuvchining
 * ko'zini darhol formaga olib boradi, chunki forma yorug' tomonda.
 *
 * To'q ustun ranglari (`--stage-*`) temaga qarab o'zgarmaydi: bu sahna, u
 * ikki rejimda ham bir xil ko'rinishi kerak.
 *
 * Mobilda bitta ustun: tepada logotip, ostida karta.
 */
export function AuthShell({
  title,
  subtitle,
  error,
  footer,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  error?: string | null;
  footer: React.ReactNode;
  /** Ro'yxatdan o'tish kabi ikki ustunli formalar uchun kengroq panel. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="aurora-canvas min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
        {/* --------------------------- chap: to'q brend ustuni */}
        <aside className="relative hidden overflow-hidden bg-[var(--stage)] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          {/* Millimetrli qog'oz — to'q sirtga "material" beradi */}
          <span
            aria-hidden
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "linear-gradient(rgb(255 255 255 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.045) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
            }}
          />

          <Link
            href="/"
            aria-label="CodeArena — bosh sahifa"
            className="focus-ring relative self-start rounded-[var(--r-ctl)]"
          >
            <span className="flex items-center gap-3">
              <LogoMark size="lg" />
              <span className="font-[family-name:var(--font-display)] text-[20px] font-bold tracking-[-0.035em] text-[var(--stage-ink)]">
                Code<span className="text-[var(--stage-brand)]">Arena</span>
              </span>
            </span>
          </Link>

          <div className="enter relative max-w-md">
            <p className="t-eyebrow text-[var(--stage-ink-3)]">Mashq maydoni</p>
            <h2 className="t-title mt-4 text-[var(--stage-ink)]">
              Algoritmlarni{" "}
              <span className="text-[var(--stage-brand)]">amalda</span> o&apos;rganing
            </h2>
            <p className="t-body mt-5 text-[15px] text-[var(--stage-ink-2)]">
              O&apos;zbek tilidagi masalalar, jonli musobaqalar va shaffof reyting —
              hammasi bitta platformada.
            </p>

            <ul className="enter-stagger mt-9 flex flex-col gap-3.5">
              {HIGHLIGHTS.map((row) => (
                <li
                  key={row}
                  className="flex items-start gap-3 text-[14px] text-[var(--stage-ink-2)]"
                >
                  <Check
                    className="mt-[3px] size-4 shrink-0 text-[var(--stage-brand)]"
                    strokeWidth={2.75}
                  />
                  {row}
                </li>
              ))}
            </ul>
          </div>

          <p className="t-num relative text-[11.5px] text-[var(--stage-ink-3)]">
            © {new Date().getFullYear()} CodeArena
          </p>
        </aside>

        {/* --------------------------- o'ng: iliq qog'ozda oq forma kartasi */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8 sm:py-14">
          <div className={cn("enter w-full", wide ? "max-w-[32rem]" : "max-w-[25rem]")}>
            <div className="mb-8 flex justify-center lg:hidden">
              <LogoLink />
            </div>

            <div className="pane-solid rounded-[var(--r-pane)] p-6 sm:p-8">
              <h1 className="t-title text-[var(--ink)]">{title}</h1>
              <p className="t-body mt-2 text-[var(--ink-3)]">{subtitle}</p>

              {error ? (
                <Alert tone="bad" className="enter-pop mt-5">
                  {error}
                </Alert>
              ) : null}

              <div className="mt-1">{children}</div>
            </div>

            <p className="mt-5 text-center text-[13px] text-[var(--ink-3)]">{footer}</p>
          </div>
        </main>
      </div>
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
      <label htmlFor={htmlFor} className="text-[12.5px] font-medium text-[var(--ink-2)]">
        {label}
        {required ? <span className="ml-0.5 text-[var(--bad)]">*</span> : null}
      </label>
      <div className={cn(error && "[&_input,&_textarea,&_select]:border-[var(--bad)]")}>
        {children}
      </div>
      {error ? (
        <p className="text-[11.5px] text-[var(--bad)]">{error}</p>
      ) : hint ? (
        <p className="text-[11.5px] text-[var(--ink-4)]">{hint}</p>
      ) : null}
    </div>
  );
}

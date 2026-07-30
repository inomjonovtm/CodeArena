"use client";

import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives";

/* ==========================================================================
   Sirtlar
   --------------------------------------------------------------------------
   Karta MA'LUMOT uchun: ro'yxat, jadval, forma, panel. Sarlavha, statistika
   va bo'lim nomi kartada EMAS — ular kanvasda, chiziq va bo'shliq bilan
   ajraladi. Hamma narsani qutilash sahifani bir xil og'irlikdagi to'rtburchak
   panjaraga aylantiradi va ko'zga "qayerdan boshlash"ni ko'rsatmaydi.

   Karta ichida karta BO'LMASIN — ichki maydon kerak bo'lsa `sunken`.
   ========================================================================== */

type PaneTone = "card" | "solid" | "sunken" | "bare";

const TONES: Record<PaneTone, string> = {
  card: "pane",
  solid: "pane-solid",
  sunken: "pane-sunken",
  bare: "",
};

export function Pane({
  tone = "card",
  interactive,
  inset = "md",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: PaneTone;
  interactive?: boolean;
  /** Ichki bo'shliq. `none` — jadval yoki rasm chekkagacha borganda. */
  inset?: "none" | "sm" | "md" | "lg";
}) {
  const pad =
    inset === "none" ? "" : inset === "sm" ? "p-3.5" : inset === "lg" ? "p-6" : "p-4.5";

  return (
    <div
      className={cn(
        "rounded-[var(--r-pane)]",
        TONES[tone],
        pad,
        interactive && "pane-interactive cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Panel sarlavhasi — chap tomonda nom, o'ngda amallar.
 * Sarlavha ostida chegara YO'Q: ajratgich panelni ikkiga bo'lib, uni
 * og'irlashtiradi. O'rniga bo'shliq ishlatiladi.
 */
export function PaneHead({
  eyebrow,
  title,
  hint,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="t-eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="t-section text-[var(--ink)]">{title}</h2>
        {hint ? <p className="t-meta mt-1 text-[var(--ink-3)]">{hint}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * Sahifa sarlavhasi — KANVASDA, o'ramsiz.
 *
 * Sarlavhani kartaga solish eng keng tarqalgan xato: u sarlavhani sahifadagi
 * boshqa bloklar bilan bir xil og'irlikka tushiradi va "bu sahifa nima
 * haqida" degan savolga javob bermay qoladi. Bu yerda sarlavha bevosita
 * qog'ozda turadi, ostidagi soch chizig'i esa kontent boshlanishini bildiradi.
 */
export function PageHead({
  eyebrow,
  index,
  title,
  lead,
  meta,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  /** Bo'lim tartib raqami — yorliq oldida `01 /` ko'rinishida */
  index?: number;
  title: React.ReactNode;
  lead?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("enter", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-2xl">
          {eyebrow ? <Eyebrow index={index} className="mb-3">{eyebrow}</Eyebrow> : null}
          <h1 className="t-title text-[var(--ink)]">{title}</h1>
          {lead ? <p className="t-body mt-3 text-[var(--ink-3)]">{lead}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {/* Meta qatori — sahifa raqamlari. Ustidagi chiziq sarlavhani
          kontentdan ajratadi, lekin uni o'ramaydi. */}
      {meta ? (
        <div className="rule mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-4">{meta}</div>
      ) : (
        <div aria-hidden className="rule enter-draw mt-6" />
      )}
    </header>
  );
}

/**
 * Statistika — raqam ustunlik qiladi, yorliq ustida jimgina turadi.
 * Raqam monoshriftda: ustunlar tik turadi va ro'yxat "o'lchangan" ko'rinadi.
 * Karta ichida emas — to'rtta karta to'rtta chegara demak, bu esa sahifani
 * panjaraga aylantiradi.
 */
export function Stat({
  label,
  value,
  sub,
  tone,
  icon,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "brand" | "ok" | "warn" | "bad" | "flare";
  icon?: React.ReactNode;
  className?: string;
}) {
  const color =
    tone === "brand"
      ? "var(--brand)"
      : tone === "ok"
        ? "var(--ok)"
        : tone === "warn"
          ? "var(--warn)"
          : tone === "bad"
            ? "var(--bad)"
            : tone === "flare"
              ? "var(--flare)"
              : "var(--ink)";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1.5">
        {icon ? <span className="text-[var(--ink-4)]">{icon}</span> : null}
        <p className="t-eyebrow truncate">{label}</p>
      </div>
      <p className="t-metric mt-2.5" style={{ color }}>
        {value}
      </p>
      {sub ? <p className="t-meta mt-2 text-[var(--ink-4)]">{sub}</p> : null}
    </div>
  );
}

/**
 * Statistika qatori — kanvasda turgan lenta, kartalar panjarasi emas.
 * Ustunlar orasidagi ingichka chiziq `gap-px` orqali chiziladi: katak foni
 * kanvas rangida, oradagi bo'shliq esa chegara rangida ko'rinadi.
 */
export function StatRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden bg-[var(--edge)]",
        "border-y border-[var(--edge)]",
        "sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** `StatRow` ichidagi katak — fon ajratgich chiziqlarini ochib beradi. */
export function StatCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-[var(--canvas)] px-5 py-5", className)}>{children}</div>
  );
}

/**
 * Bo'lim — sahifadagi mantiqiy blok.
 *
 * Sarlavha ostidagi soch chizig'i kontent kengligi bo'ylab yuguradi: bu
 * gazeta va texnik hujjatlardagi eng qadimgi ajratgich va u qutidan ancha
 * arzon — bitta piksel, ammo ierarxiya aniq.
 */
export function Section({
  title,
  eyebrow,
  index,
  hint,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  index?: number;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const hasHead = title || hint || action || eyebrow;

  return (
    <section className={cn("min-w-0", className)}>
      {/* Sarlavhasiz ham `hint`/`action` ko'rinishi kerak — aks holda
          faqat izoh beruvchi bo'limlar jimgina yo'qolib qolardi. */}
      {hasHead ? (
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--edge)] pb-3">
          <div className="min-w-0">
            {eyebrow ? <Eyebrow index={index} className="mb-2">{eyebrow}</Eyebrow> : null}
            {title ? <h2 className="t-section text-[var(--ink)]">{title}</h2> : null}
            {hint ? (
              <p className={cn("t-meta text-[var(--ink-3)]", title && "mt-1")}>{hint}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Ikki ustunli sahifa tartibi — asosiy kontent va yordamchi ustun.
 * Yordamchi ustun kengligi qat'iy (316px): u ma'lumot ko'rsatadi, kontent
 * bilan joy talashmaydi. Tor ekranda pastga tushadi.
 */
export function SplitLayout({
  aside,
  asideFirst,
  children,
  className,
}: {
  aside: React.ReactNode;
  /** Mobilda yordamchi ustun tepada tursin (masalan profil kartasi) */
  asideFirst?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_316px] lg:gap-8", className)}>
      <div className={cn("min-w-0", asideFirst && "order-2 lg:order-1")}>{children}</div>
      <aside className={cn("min-w-0", asideFirst && "order-1 lg:order-2")}>
        <div className="lg:sticky lg:top-[calc(var(--bar)+24px)]">{aside}</div>
      </aside>
    </div>
  );
}

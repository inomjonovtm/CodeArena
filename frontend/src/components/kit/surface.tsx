"use client";

import { cn } from "@/lib/utils";

/* ==========================================================================
   SIRTLAR VA SAHIFA TUZILISHI
   --------------------------------------------------------------------------
   Karta MA'LUMOT uchun: ro'yxat, jadval, forma, panel. Sarlavha, statistika
   va bo'lim nomi kartada EMAS — ular qog'ozda, bo'shliq bilan ajraladi.
   Hamma narsani qutilash sahifani bir xil og'irlikdagi to'rtburchak
   panjaraga aylantiradi.

   Karta ichida karta BO'LMASIN — ichki maydon kerak bo'lsa `well`.
   ========================================================================== */

type PaneTone = "card" | "solid" | "sunken" | "bare";

const TONES: Record<PaneTone, string> = {
  card: "card",
  solid: "card",
  sunken: "well",
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
    inset === "none" ? "" : inset === "sm" ? "p-4" : inset === "lg" ? "p-7" : "p-5 sm:p-6";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)]",
        interactive ? "card-link cursor-pointer" : TONES[tone],
        pad,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Panel sarlavhasi — chapda nom, o'ngda amallar.
 * Ostida chegara yo'q: ajratgich panelni ikkiga bo'lib og'irlashtiradi.
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
        {eyebrow ? <p className="ts-label mb-2">{eyebrow}</p> : null}
        <h2 className="ts-h3 text-[var(--text)]">{title}</h2>
        {hint ? <p className="ts-sm mt-1.5 text-[var(--text-3)]">{hint}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * SAHIFA SARLAVHASI — sarlavha va amallar BITTA qatorda, meta esa
 * chegarali STAT-CHIPLAR qatorida.
 *
 *     KATALOG                                      ← yorliq (ixtiyoriy)
 *     Masalalar                    [Saralash] [+]  ← sarlavha + amallar
 *     Qiyinlik bo'yicha tanlang va yeching.        ← izoh
 *     ┌──────────────┐ ┌──────────────┐            ← meta-chiplar
 *     │ 248 ta masala │ │ 12 yechilgan │
 *     └──────────────┘ └──────────────┘
 *
 * Ilgari meta oddiy matn qatori edi va sarlavha ostida "erib" ketardi.
 * Chip esa har bir ko'rsatkichga o'z ramkasini beradi — ko'z ularni
 * sanab chiqa oladi.
 */
export function PageHead({
  eyebrow,
  title,
  lead,
  meta,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  /** Saqlangan, lekin ishlatilmaydi — bo'lim raqami tizimdan chiqarildi */
  index?: number;
  title: React.ReactNode;
  lead?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    /* Sahifa boshi — OCH YASHIL PANEL. Sayt bo'ylab yagona imzo: har bir
       sahifa shu tint maydondan boshlanadi, kontent esa ostida oq qog'ozda
       davom etadi. Panel ichidagi meta-chiplar OQ — tint ustida aniq
       o'qiladi. */
    <header
      className={cn(
        "min-w-0 rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-tint)]",
        "px-5 py-5 sm:px-6 sm:py-6",
        className,
      )}
    >
      {eyebrow ? <p className="ts-label mb-1.5 text-[var(--green-text)]">{eyebrow}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="ts-h1 min-w-0 max-w-[26ch] text-[var(--text)]">{title}</h1>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {lead ? <p className="ts-sm mt-2 max-w-[68ch] text-[var(--text-3)]">{lead}</p> : null}

      {/* Meta — har bir ko'rsatkich o'z chegarali OQ chipida */}
      {meta ? (
        <div
          className={cn(
            "mt-4 flex flex-wrap items-center gap-2",
            "[&>*]:flex [&>*]:items-center [&>*]:gap-1.5",
            "[&>*]:rounded-[var(--radius-sm)] [&>*]:border [&>*]:border-[var(--line)]",
            "[&>*]:bg-[var(--surface)] [&>*]:px-2.5 [&>*]:py-1.5 [&>*]:text-[13px]",
          )}
        >
          {meta}
        </div>
      ) : null}
    </header>
  );
}

/**
 * STATISTIKA PLITKASI.
 *
 * Ilgari raqamlar ochiq qog'ozda, chegarasiz lentada turardi. Yangi
 * tartibda har bir ko'rsatkich O'Z KARTASIDA: yorliq tepada (kichik,
 * tinch), raqam ostida. Kartalar teng bo'yli, panjara ularni o'zi
 * tekislaydi.
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
    tone === "brand" || tone === "ok"
      ? "var(--green-text)"
      : tone === "warn"
        ? "var(--warn)"
        : "var(--text)";

  return (
    <div
      className={cn(
        "min-w-0 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-4",
        "shadow-[var(--shadow-xs)]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon ? <span className="text-[var(--text-4)]">{icon}</span> : null}
        <p className="ts-label truncate">{label}</p>
      </div>
      <p className="ts-metric mt-2.5" style={{ color }}>
        {value}
      </p>
      {sub ? <p className="ts-xs mt-1.5 text-[var(--text-4)]">{sub}</p> : null}
    </div>
  );
}

/** Statistika panjarasi — teng bo'yli plitkalar. */
export function StatRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}

/** `StatRow` ichidagi katak — o'rami yo'q, faqat kenglik cheklovi. */
export function StatCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0", className)}>{children}</div>;
}

/**
 * Bo'lim — sahifadagi mantiqiy blok.
 *
 * Sarlavha ostida ingichka chiziq turadi: u bo'limni "ochadi" va kontent
 * bilan sarlavha orasidagi masofani belgilaydi. Ilgari chiziq sarlavha
 * USTIDA va YASHIL edi — sahifada beshta bo'lim bo'lsa, beshta yashil
 * chiziq paydo bo'lib, "yashil = harakat" qoidasi buzilardi.
 */
export function Section({
  title,
  eyebrow,
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
      {hasHead ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            {eyebrow ? <p className="ts-label mb-1">{eyebrow}</p> : null}
            {title ? (
              <h2 className="ts-h3 flex items-center gap-2.5 text-[var(--text)]">
                {/* Bo'lim belgisi — kichik yashil to'rtburchak. Pastki chiziq
                    o'rniga: chiziq bo'limni kontentdan uzardi, belgi esa
                    sarlavhaning o'ziga "yoqilgan" holat beradi. */}
                <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-[var(--green)]" />
                {title}
              </h2>
            ) : null}
            {hint ? (
              <p className={cn("ts-sm text-[var(--text-3)]", title && "mt-1 pl-3.5")}>{hint}</p>
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
 * Yordamchi ustun kengligi qat'iy (320px): u ma'lumot ko'rsatadi, kontent
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
    <div
      className={cn("grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12", className)}
    >
      <div className={cn("min-w-0", asideFirst && "order-2 lg:order-1")}>{children}</div>
      <aside className={cn("min-w-0", asideFirst && "order-1 lg:order-2")}>
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+24px)]">{aside}</div>
      </aside>
    </div>
  );
}

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Admin sahifa sarlavhasi.
 *
 * Kartada EMAS — bevosita kanvasda. Sarlavhani kartaga solish uni sahifadagi
 * jadval va panellar bilan bir xil og'irlikka tushiradi; admin panelda esa
 * ierarxiya muhim, chunki ekranda o'nlab boshqaruv elementi bor. Ostidagi
 * soch chizig'i kontent boshlanishini bildiradi va tablar shu chiziqqa
 * "o'tirib" oladi.
 */
export function PageHeader({
  title,
  description,
  backHref,
  actions,
  tabs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("enter mb-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className={cn(
                "focus-ring mb-2 inline-flex items-center gap-1.5 rounded-[5px] text-[12px] font-medium",
                "text-[var(--ink-4)] transition-colors duration-[var(--t-fast)] hover:text-[var(--ink-2)]",
              )}
            >
              <ArrowLeft className="size-3.5" />
              Orqaga
            </Link>
          ) : null}
          <h1 className="t-title truncate text-[var(--ink)]">{title}</h1>
          {description ? (
            <p className="t-body mt-2 text-[var(--ink-3)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {/* Tablar chiziq ustida turadi — sarlavha va kontent orasidagi ko'prik */}
      {tabs ? (
        <div className="mt-5 border-b border-[var(--edge)] pb-3">{tabs}</div>
      ) : (
        <div aria-hidden className="rule mt-5" />
      )}
    </div>
  );
}

/**
 * Statistika kartasi — yorliq tepada jimgina, raqam monoshriftda ustunlik
 * qiladi, trend rang bilan.
 *
 * Ikonka rangli plitkada emas: KPI qatorida to'rt-besh plitka yonma-yon
 * turganda ular raqamlardan ko'proq e'tibor tortadi. Bu yerda ikonka
 * yorliq yonida jimgina, e'tibor esa sonda.
 *
 * Havola berilsa butun katak bosiladi va hoverda chegara brend rangiga o'tadi.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  tone = "accent",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: number;
  tone?: "accent" | "info" | "warning" | "danger" | "neutral";
  href?: string;
}) {
  // Eski nomlar saqlanadi (sahifalar shu prop bilan chaqiradi), rang tizimdan
  const TONES: Record<NonNullable<typeof tone>, string> = {
    accent: "var(--brand)",
    info: "var(--note)",
    warning: "var(--warn)",
    danger: "var(--bad)",
    neutral: "var(--ink-3)",
  };
  const accent = TONES[tone];

  const body = (
    <div
      className={cn(
        "pane group relative h-full rounded-[var(--r-pane)] p-4.5",
        href && "pane-interactive",
      )}
    >
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="shrink-0 [&_svg]:size-3.5" style={{ color: accent }}>
            {icon}
          </span>
        ) : null}
        <span className="t-eyebrow truncate">{label}</span>
      </div>

      <p className="t-metric mt-3 text-[var(--ink)]">{value}</p>

      {hint || trend !== undefined ? (
        <p className="t-meta mt-2.5 flex items-center gap-1.5 text-[var(--ink-4)]">
          {trend !== undefined ? (
            <span
              className="t-num font-semibold"
              style={{
                color: trend > 0 ? "var(--ok)" : trend < 0 ? "var(--bad)" : "var(--ink-4)",
              }}
            >
              {trend > 0 ? "↑" : trend < 0 ? "↓" : "·"} {Math.abs(trend)}%
            </span>
          ) : null}
          {hint}
        </p>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="focus-ring block rounded-[var(--r-pane)]">
      {body}
    </Link>
  ) : (
    body
  );
}

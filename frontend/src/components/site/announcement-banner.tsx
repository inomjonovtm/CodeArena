"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, Info, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/providers";
import { publicApi } from "@/lib/public-api";
import type { SiteAnnouncement } from "@/lib/types";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "codearena-dismissed-announcements";

/* Fon — rang yuvindisi, chegara o'sha rangdan. Neytral chegara yuvindi
   ustida "boshqa komponentdan" ko'rinardi (global `*` qoidasi tufayli). */
const LEVELS = {
  info: { icon: Info, wash: "var(--note-wash)", ink: "var(--note)" },
  success: { icon: CheckCircle2, wash: "var(--ok-wash)", ink: "var(--ok)" },
  warning: { icon: TriangleAlert, wash: "var(--warn-wash)", ink: "var(--warn)" },
  danger: { icon: AlertCircle, wash: "var(--bad-wash)", ink: "var(--bad)" },
} as const;

/**
 * Bannerdagi amal tugmasi.
 *
 * Rang bannerning ohangidan olinadi — alohida brend ko'ki qo'shilsa, ogohlantirish
 * bannerida ikki xil signal urishib ketardi.
 */
function AnnouncementAction({
  href,
  label,
  ink,
}: {
  href: string;
  label: string;
  ink: string;
}) {
  const external = /^https?:\/\//.test(href);
  const className = cn(
    "focus-ring mt-2.5 inline-flex h-7 items-center gap-1.5 rounded-[var(--r-ctl)]",
    "border px-2.5 text-[12.5px] font-semibold",
    "transition-[background-color,border-color] duration-[var(--t-fast)]",
  );
  const style = {
    borderColor: `color-mix(in oklab, ${ink} 38%, transparent)`,
    backgroundColor: `color-mix(in oklab, ${ink} 10%, transparent)`,
    color: ink,
  };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        {label}
        <ExternalLink className="size-3" />
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      {label}
      <ArrowRight className="size-3" />
    </Link>
  );
}

/**
 * Admin paneldan e'lon qilingan bannerlar.
 *
 * Yopilgan e'lon `localStorage` da belgilanadi — bir marta yopgan foydalanuvchi
 * uni har sahifada qayta ko'rmaydi.
 */
export function AnnouncementBanner() {
  const { t, locale } = useI18n();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      setDismissed(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDismissed([]);
    }
    setReady(true);
  }, []);

  const { data } = useQuery({
    queryKey: ["site-announcements"],
    queryFn: () => publicApi.site.announcements(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const dismiss = (id: string) => {
    const next = [...dismissed, id].slice(-40);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // localStorage yopiq bo'lsa ham banner shu sessiyada yopiladi
    }
  };

  if (!ready || !data?.length) return null;

  const rows = data.filter((row) => !dismissed.includes(row.id));
  if (!rows.length) return null;

  /* Sayt o'zbek tilida — `_en` maydonlari bazada saqlanadi, lekin
     ko'rsatilmaydi (ingliz tili keyinchalik qo'shiladi). */
  const title = (row: SiteAnnouncement) => row.title_uz;
  const body = (row: SiteAnnouncement) => row.body_uz;
  const actionLabel = (row: SiteAnnouncement) => row.action_label_uz;

  /* Banner sahifa konteyneri ICHIDA turadi: `SiteShell` allaqachon kenglik
     cheklovi va chekinish beradi, shuning uchun bu yerda o'z konteynerini
     ochish bannerni kontentdan siljitib qo'yardi (max-w-6xl ≠ --page). */
  return (
    <div className="enter mb-7 flex flex-col gap-2">
      {rows.map((row) => {
        const meta = LEVELS[row.level] ?? LEVELS.info;
        const Icon = meta.icon;
        return (
          <div
            key={row.id}
            role="status"
            className="flex items-start gap-3 rounded-[var(--r-pane)] border px-4 py-3"
            style={{
              backgroundColor: meta.wash,
              borderColor: `color-mix(in oklab, ${meta.ink} 24%, transparent)`,
              color: meta.ink,
            }}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold">{title(row)}</p>
              {body(row) ? (
                <p className="mt-0.5 text-[13px] leading-relaxed opacity-90">{body(row)}</p>
              ) : null}

              {/* Amal tugmasi — e'lon endi faqat xabar bermaydi, ish ham
                  bajartiradi. Tashqi manzil yangi oynada ochiladi. */}
              {row.action_url && actionLabel(row) ? (
                <AnnouncementAction
                  href={row.action_url}
                  label={actionLabel(row)}
                  ink={meta.ink}
                />
              ) : null}
            </div>

            {row.is_dismissible ? (
              <button
                type="button"
                onClick={() => dismiss(row.id)}
                aria-label={t.common.close}
                className={cn(
                  "focus-ring -mt-0.5 -mr-1.5 inline-flex size-7 shrink-0 items-center justify-center",
                  "rounded-[var(--r-ctl)] opacity-60 transition-opacity hover:opacity-100",
                )}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";

import { Popover } from "@/components/kit";
import { useI18n, useTheme } from "@/components/providers";
import type { ThemeMode } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Ko'rinish menyusi
   --------------------------------------------------------------------------
   Tema tanlovi ilgari faqat mobil menyuda edi: kompyuterdan kirgan
   (ayniqsa hisobsiz) foydalanuvchi qorong'i rejimga umuman o'ta olmasdi.

   Uch holat ro'yxat sifatida turadi — "tizim" rejimi ikki holatli
   almashtirgichga sig'maydi, u uchinchi qiymat.
   ========================================================================== */

const ROW = [
  "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left",
  "text-[15px] font-medium transition-colors duration-[var(--dur-1)] ring-focus",
].join(" ");

export function PrefsMenu({ className }: { className?: string }) {
  const { t } = useI18n();
  const { mode, resolved, setMode } = useTheme();
  const [open, setOpen] = useState(false);

  const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: t.site.nav.themeLight, icon: <Sun className="size-4" /> },
    { value: "dark", label: t.site.nav.themeDark, icon: <Moon className="size-4" /> },
    { value: "system", label: t.site.nav.themeSystem, icon: <Monitor className="size-4" /> },
  ];

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.site.nav.appearance}
        title={t.site.nav.appearance}
        className={cn(
          "flex size-9 items-center justify-center rounded-[var(--radius-sm)] ring-focus",
          "text-[var(--text-3)] transition-colors duration-[var(--dur-1)]",
          "hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
          open && "bg-[var(--surface-hover)] text-[var(--text)]",
        )}
      >
        {resolved === "dark" ? <Moon className="size-[17px]" /> : <Sun className="size-[17px]" />}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="min-w-44">
        <div role="menu" aria-label={t.site.nav.appearance}>
          <p className="ts-label px-2.5 pt-1.5 pb-1.5">{t.site.nav.appearance}</p>
          {themes.map((item) => {
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setMode(item.value);
                  setOpen(false);
                }}
                className={cn(
                  ROW,
                  active
                    ? "bg-[var(--green-wash)] text-[var(--green-text)]"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
                )}
              >
                <span className={cn("shrink-0", active ? "text-[var(--green)]" : "opacity-70")}>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {active ? <Check className="size-3.5 shrink-0 text-[var(--green)]" /> : null}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

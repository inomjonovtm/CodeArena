"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Popover } from "@/components/kit";
import { cn } from "@/lib/utils";

import type { NavLink } from "./nav-model";

/* ==========================================================================
   Bo'lim menyusi — yuqori paneldagi ochiluvchi ro'yxat
   --------------------------------------------------------------------------
   Sichqoncha kelganda ham, bosilganda ham ochiladi: sichqoncha bilan tez
   ko'rish qulay, bosish esa teginish ekranlarida va klaviaturada ishlaydi.

   Ochilish kechikadi (90ms) — sichqoncha panel bo'ylab o'tib ketganda
   menyular ketma-ket yonib-o'chmasligi kerak. Yopilish ham kechikadi
   (140ms), aks holda tugmadan menyuga o'tayotganda oradagi bo'shliqda
   yopilib qolardi.
   ========================================================================== */

export function NavMenu({
  label,
  links,
  authed,
}: {
  label: string;
  links: NavLink[];
  /** Kirmagan foydalanuvchiga `private` havolalar ko'rsatilmaydi */
  authed: boolean;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const menuId = useId();

  const visible = links.filter((link) => !link.private || authed);
  const active = visible.some((link) => pathname.startsWith(link.href));

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const schedule = (next: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? 90 : 140);
  };

  if (!visible.length) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => schedule(true)}
      onMouseLeave={() => schedule(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => {
          window.clearTimeout(timer.current);
          setOpen((previous) => !previous);
        }}
        className={cn(
          // Qora matn → hoverda ko'k. Faol bo'lim ham ko'k, lekin qalinroq:
          // rang "qayerdaman"ni, og'irlik esa "shu yerdaman"ni bildiradi.
          "focus-ring flex h-10 items-center gap-1.5 rounded-[var(--r-ctl)] px-3",
          "text-[14.5px] whitespace-nowrap",
          "transition-colors duration-[var(--t-fast)]",
          active || open
            ? "font-semibold text-[var(--brand)]"
            : "font-medium text-[var(--ink)] hover:text-[var(--brand)]",
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-[var(--t-base)]",
            open ? "rotate-180 text-[var(--brand)]" : "text-[var(--ink-4)]",
          )}
        />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} align="start" className="min-w-64 p-2">
        <div id={menuId}>
          {visible.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  // Ikonka plitkasiz — rangli kvadratchalar ro'yxati menyuni
                  // "ilovalar panelia"ga aylantiradi va nomlarni bosib ketadi.
                  "focus-ring flex items-center gap-3 rounded-[8px] px-3 py-2.5",
                  "text-[14px] transition-colors duration-[var(--t-fast)]",
                  isActive
                    ? "bg-[var(--brand-wash)] font-semibold text-[var(--brand-ink)]"
                    : "font-medium text-[var(--ink)] hover:bg-[var(--pane-hover)] hover:text-[var(--brand)]",
                )}
              >
                <span
                  className={cn(
                    "flex shrink-0 [&_svg]:size-4",
                    isActive ? "text-[var(--brand)]" : "text-[var(--ink-4)]",
                  )}
                >
                  {link.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

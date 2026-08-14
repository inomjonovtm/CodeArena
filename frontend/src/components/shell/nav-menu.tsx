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
          /* Tugma navbar balandligini to'liq egallaydi. Ichida guruh ichidan
             biror sahifa ochiq bo'lsa, pastida panel qirrasiga tegib turgan
             2px yashil chiziq yonadi — xuddi tekis havolalardagi kabi. */
          "ring-focus relative flex h-[var(--nav-h)] shrink-0 items-center gap-1 px-3",
          "text-[14px] whitespace-nowrap",
          "transition-colors duration-[var(--dur-1)]",
          active
            ? "font-semibold text-[var(--text)]"
            : open
              ? "font-medium text-[var(--text)]"
              : "font-medium text-[var(--text-3)] hover:text-[var(--text)]",
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-[var(--dur-2)]",
            open ? "rotate-180 text-[var(--text-2)]" : "text-[var(--text-4)]",
          )}
        />
        {active ? (
          <span
            aria-hidden
            className="absolute inset-x-3 bottom-0 h-[2px] rounded-t-full bg-[var(--green)]"
          />
        ) : null}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} align="start" className="min-w-56">
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
                  // "ilovalar paneli"ga aylantiradi va nomlarni bosib ketadi.
                  "ring-focus flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2",
                  "text-[13.5px] transition-colors duration-[var(--dur-1)]",
                  isActive
                    ? "bg-[var(--green-wash)] font-medium text-[var(--green-text)]"
                    : "font-medium text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
                )}
              >
                <span
                  className={cn(
                    "flex shrink-0 [&_svg]:size-4",
                    isActive ? "text-[var(--green)]" : "text-[var(--text-4)]",
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

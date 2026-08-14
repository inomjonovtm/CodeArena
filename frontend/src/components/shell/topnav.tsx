"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { KeyHint, MenuItem, MenuLink, Popover } from "@/components/kit";
import { useAuth, useI18n } from "@/components/providers";
import { useScrolled } from "@/hooks/use-scrolled";
import { publicApi } from "@/lib/public-api";
import { cn } from "@/lib/utils";

import { LogoLink } from "./logo";
import { NavMenu } from "./nav-menu";
import { useAccountLinks, useNavModel } from "./nav-model";
import { PrefsMenu } from "./prefs-menu";

/* ==========================================================================
   YUQORI NAVIGATSIYA — bo'limlar MA'NO bo'yicha guruhlangan
   --------------------------------------------------------------------------
   60px oq lenta, ostida bir piksel chiziq. Havolalar tekis qator emas —
   to'rtta ochiluvchi guruh (`nav-model.tsx` dagi tasnif):

     MASHQ     — masalalar, kunlik, yechimlarim, saqlanganlar
     BELLASHUV — musobaqalar, reyting
     JAMOA     — muhokamalar, guruhlar
     YORDAM    — savol-javob, aloqa

   Guruh ichida ochiq sahifa bo'lsa, tugma ostida panel qirrasiga tegib
   turgan 2px yashil chiziq yonadi. Menyu sichqoncha kelganda ham,
   bosilganda ham ochiladi (`nav-menu.tsx`).

   O'ngda: qidiruv maydoni (⌘K), tema, bildirishnoma, hisob. Sahifa
   siljiganda panel faqat yengil soya oladi — o'lchami va joyi o'zgarmaydi.
   ========================================================================== */

const ICON_BTN = [
  "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ring-focus",
  "text-[var(--text-2)] transition-colors duration-[var(--dur-1)] ease-[var(--ease)]",
  "hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
].join(" ");

function NotificationButton() {
  const { user } = useAuth();
  const { t } = useI18n();

  const { data } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => publicApi.notifications.unreadCount(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  if (!user) return null;
  const unread = data?.unread ?? 0;

  return (
    <Link
      href="/notifications"
      aria-label={
        unread ? `${unread} ${t.site.nav.unreadNotifications}` : t.site.nav.notifications
      }
      className={cn(ICON_BTN, "relative")}
    >
      <Bell className="size-[18px]" strokeWidth={1.75} />
      {unread > 0 ? (
        <span
          className={cn(
            "ts-num absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center",
            "rounded-full bg-[var(--green)] px-1 text-[10px] font-semibold text-[var(--text-on-green)]",
            "ring-2 ring-[var(--bg)]",
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function AccountButton() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const links = useAccountLinks(
    user?.username,
    user?.permissions?.can_access_studio,
    user?.permissions?.can_access_admin,
  );

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className={cn(
            "hidden h-9 items-center rounded-[var(--radius-md)] px-3 ring-focus sm:flex",
            "text-[14px] font-medium text-[var(--text-2)]",
            "transition-colors duration-[var(--dur-1)]",
            "hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
          )}
        >
          {t.site.nav.signIn}
        </Link>
        <Link
          href="/register"
          className={cn(
            "flex h-9 items-center rounded-[var(--radius-md)] px-3.5 ring-focus",
            "bg-[var(--green)] text-[14px] font-medium text-[var(--text-on-green)]",
            "shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-1)]",
            "hover:bg-[var(--green-hover)] active:translate-y-px",
          )}
        >
          {t.site.nav.getStarted}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.site.nav.account}
        className={cn(
          "flex h-9 items-center gap-1 rounded-[var(--radius-md)] pr-1.5 pl-1 ring-focus",
          "transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface-hover)]",
          open && "bg-[var(--surface-hover)]",
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--green-wash)] text-[11px] font-semibold text-[var(--green-text)]">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            user.username.slice(0, 2).toUpperCase()
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-[var(--text-4)] transition-transform duration-[var(--dur-1)]",
            open && "rotate-180",
          )}
        />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} align="end">
        <div className="mb-1 border-b border-[var(--line)] px-3 pt-1.5 pb-2.5">
          <p className="truncate text-[13px] font-medium text-[var(--text)]">{user.username}</p>
          <p className="ts-xs mt-0.5 text-[var(--text-4)]">
            {t.site.nav.rating}{" "}
            <span className="ts-num text-[var(--green-text)]">{user.rating}</span>
          </p>
        </div>

        {links.map((link) => (
          <MenuLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            external={"external" in link ? link.external : undefined}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </MenuLink>
        ))}

        <div className="mt-1 border-t border-[var(--line)] pt-1">
          <MenuItem
            icon={<LogOut className="size-4" />}
            tone="bad"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            {t.site.nav.logout}
          </MenuItem>
        </div>
      </Popover>
    </div>
  );
}

export function TopNav({
  onCommand,
  onMobileMenu,
}: {
  onCommand: () => void;
  onMobileMenu: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { groups, support } = useNavModel();
  const { scrolled, sentinelRef } = useScrolled();

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />

      <header
        className={cn(
          "sticky top-0 z-50 h-[var(--nav-h)] border-b border-[var(--line)] bg-[var(--bg)]",
          "transition-shadow duration-[var(--dur-2)] ease-[var(--ease)]",
          scrolled && "shadow-[var(--shadow-xs)]",
        )}
      >
        <div className="wrap flex h-full items-center gap-2">
          {/* --- mobil: menyu --- */}
          <button
            type="button"
            onClick={onMobileMenu}
            aria-label={t.site.nav.menu}
            aria-haspopup="dialog"
            className={cn(ICON_BTN, "-ml-1 lg:hidden")}
          >
            <Menu className="size-[18px]" strokeWidth={1.75} />
          </button>

          <LogoLink size="sm" className="max-sm:[&_span:last-child]:hidden" />

          {/* --- bo'limlar: ma'no bo'yicha guruhlangan ochiluvchi menyular --- */}
          <nav aria-label="CodeArena" className="ml-4 hidden min-w-0 items-center lg:flex">
            {groups.map((group) => (
              <NavMenu
                key={group.key}
                label={group.label}
                links={group.links}
                authed={Boolean(user)}
              />
            ))}
            <NavMenu label={t.site.sections.support} links={support} authed={Boolean(user)} />
          </nav>

          <div className="flex flex-1 items-center justify-end gap-1.5">
            {/* --- qidiruv --- */}
            <button
              type="button"
              onClick={onCommand}
              aria-label={t.site.nav.search}
              className={cn(
                "flex h-9 items-center gap-2 rounded-[var(--radius-md)] ring-focus",
                "border border-[var(--line)] bg-[var(--surface)] text-left",
                "transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface-hover)]",
                "size-9 justify-center xl:w-52 xl:justify-start xl:px-3",
              )}
            >
              <Search className="size-4 shrink-0 text-[var(--text-4)]" strokeWidth={1.75} />
              <span className="hidden min-w-0 flex-1 truncate text-[13px] text-[var(--text-4)] xl:block">
                {t.site.nav.search}
              </span>
              <KeyHint className="hidden shrink-0 xl:inline-flex">⌘K</KeyHint>
            </button>

            <PrefsMenu className="max-sm:hidden" />
            <NotificationButton />
            <AccountButton />
          </div>
        </div>
      </header>
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { KeyHint, MenuItem, MenuLink, Popover } from "@/components/kit";
import { useAuth, useI18n } from "@/components/providers";
import { publicApi } from "@/lib/public-api";
import { cn } from "@/lib/utils";

import { LogoLink } from "./logo";
import { NavMenu } from "./nav-menu";
import { useAccountLinks, useNavModel } from "./nav-model";
import { PrefsMenu } from "./prefs-menu";

/* ==========================================================================
   Yuqori navigatsiya paneli
   --------------------------------------------------------------------------
   Butun navigatsiya shu yerda: bo'limlar ma'no bo'yicha guruhlangan va har
   biri ochiluvchi menyu beradi. Shu tufayli o'n bir yo'nalish uchta tugmaga
   sig'adi — panel tinch qoladi, lekin hech narsa yashirilmaydi.

   Menyu sichqoncha kelganda ham, bosilganda ham ochiladi: sichqoncha bilan
   tez ko'rish qulay, bosish esa teginish ekranlarida va klaviaturada ishlaydi.

   Panel qat'iy iliq qog'oz rangida — kontent ostidan sizib chiqmaydi.
   ========================================================================== */

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
      className={cn(
        "relative flex size-9 items-center justify-center rounded-[var(--r-ctl)] focus-ring",
        "text-[var(--ink-3)] transition-colors duration-[var(--t-fast)]",
        "hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
      )}
    >
      <Bell className="size-[17px]" />
      {unread > 0 ? (
        <span
          className={cn(
            "t-num absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center",
            "rounded-full bg-[var(--brand)] px-1 text-[9.5px] font-bold text-[var(--ink-on-brand)]",
            "ring-2 ring-[var(--canvas)]",
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
  const links = useAccountLinks(user?.username, user?.permissions?.can_access_admin);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className={cn(
            "hidden h-9 items-center rounded-[var(--r-ctl)] px-3 focus-ring sm:flex",
            "text-[13.5px] font-medium text-[var(--ink-2)]",
            "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
          )}
        >
          {t.site.nav.signIn}
        </Link>
        <Link
          href="/register"
          className={cn(
            "flex h-9 items-center rounded-[var(--r-ctl)] px-3.5 focus-ring",
            "bg-[var(--brand)] text-[13.5px] font-semibold text-[var(--ink-on-brand)]",
            "shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]",
            "transition-colors duration-[var(--t-fast)] hover:bg-[var(--brand-hover)]",
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
          "flex h-9 items-center gap-1.5 rounded-[var(--r-ctl)] px-1.5 focus-ring",
          "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]",
          open && "bg-[var(--pane-hover)]",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px]",
            "border border-[var(--edge)] bg-[var(--brand-wash)] font-mono text-[10.5px] font-bold text-[var(--brand-ink)]",
          )}
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            user.username.slice(0, 2).toUpperCase()
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-[var(--ink-4)] transition-transform duration-[var(--t-fast)]",
            open && "rotate-180",
          )}
        />
      </button>

      <Popover open={open} onClose={() => setOpen(false)}>
        <div className="mb-1 border-b border-[var(--edge)] px-2.5 pt-2 pb-2.5">
          <p className="truncate text-[13px] font-semibold text-[var(--ink)]">{user.username}</p>
          <p className="t-eyebrow mt-1">
            {t.site.nav.rating} <span className="t-num text-[var(--ink-2)]">{user.rating}</span>
          </p>
        </div>

        {links.map((link) => (
          <MenuLink key={link.href} href={link.href} icon={link.icon} onClick={() => setOpen(false)}>
            {link.label}
          </MenuLink>
        ))}

        <div className="mt-1 border-t border-[var(--edge)] pt-1">
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

export function SiteBar({
  onCommand,
  onMobileMenu,
}: {
  onCommand: () => void;
  onMobileMenu: () => void;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { groups, support } = useNavModel();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-[var(--bar)]",
        // Qat'iy iliq qog'oz — kontent ostidan "sizib" chiqmaydi
        "border-b border-[var(--edge)] bg-[var(--canvas)]",
      )}
    >
      {/* Kontent bilan BIR XIL konteyner — navbar elementlari sahifa
          bloklariga aniq tekislanadi. */}
      <div className="mx-auto flex h-full w-full max-w-[var(--page)] items-center gap-2 px-4 sm:px-6 lg:px-[var(--gutter)]">
        {/* --- mobil: menyu --- */}
        <button
          type="button"
          onClick={onMobileMenu}
          aria-label={t.site.nav.menu}
          aria-haspopup="dialog"
          className={cn(
            "flex size-9 items-center justify-center rounded-[var(--r-ctl)] focus-ring lg:hidden",
            "text-[var(--ink-2)] transition-colors hover:bg-[var(--pane-hover)]",
          )}
        >
          <Menu className="size-[18px]" />
        </button>

        {/* --- brend --- */}
        <LogoLink size="sm" className="max-sm:[&_span:last-child]:hidden" />

        {/* --- bo'limlar: ochiluvchi menyular --- */}
        <nav aria-label="CodeArena" className="ml-3 hidden items-center gap-0.5 lg:flex">
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
              "flex h-9 items-center gap-2.5 rounded-[var(--r-ctl)] focus-ring",
              // Oq sirt + soch chizig'i — bu MAYDON, tugma emas: shakli
              // qidiruv qatoriga o'xshaydi va bosishga chaqiradi.
              "border border-[var(--edge)] bg-[var(--pane)] text-left",
              "transition-colors duration-[var(--t-fast)] hover:border-[var(--edge-strong)]",
              "size-9 justify-center md:w-52 md:justify-start md:px-2.5 lg:w-60",
            )}
          >
            <Search className="size-4 shrink-0 text-[var(--ink-4)]" />
            <span className="hidden min-w-0 flex-1 truncate text-[13px] text-[var(--ink-4)] md:block">
              {t.site.nav.search}
            </span>
            <KeyHint className="hidden shrink-0 md:inline-flex">⌘K</KeyHint>
          </button>

          {/* Tema va til — hisobsiz foydalanuvchiga ham ochiq */}
          <PrefsMenu className="max-sm:hidden" />
          <NotificationButton />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

"use client";

import { ChevronLeft, Globe, LogOut, Search, Star, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Count } from "@/components/kit";
import { LogoMark } from "@/components/shell/logo";
import { useAuth, useCan, useI18n } from "@/components/providers";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

import { buildNav, type NavGroup, type NavItem } from "./nav-config";

const PINNED_KEY = "codearena-nav-pinned";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  badges: { plagiarism?: number; reports?: number; queue?: number; trash?: number };
}

/**
 * Admin yon rail — iliq qog'oz sirt, o'ngida soch chizig'i.
 *
 * Tuzilma o'zgarmagan: barcha bo'limlar bir vaqtda ko'rinadi, tepada filtr,
 * yulduzcha bilan qadalganlar alohida guruhda. Faol bo'lim brend yuvindisi
 * va chap qirradagi brend chizig'i bilan belgilanadi.
 */
export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  badges,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const can = useCan();

  const groups = useMemo(() => buildNav(t), [t]);
  const [filter, setFilter] = useState("");
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PINNED_KEY) ?? "[]");
      if (Array.isArray(stored)) setPinned(stored.filter((row) => typeof row === "string"));
    } catch {
      setPinned([]);
    }
  }, []);

  // Yig'ilgan railda filtr maydoni sig'maydi — matn qolib ketmasin
  useEffect(() => {
    if (collapsed) setFilter("");
  }, [collapsed]);

  const togglePin = (href: string) => {
    setPinned((prev) => {
      const next = prev.includes(href) ? prev.filter((row) => row !== href) : [...prev, href];
      localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isActive = (href: string, matchPrefix?: boolean) => {
    if (href === "/admin") return pathname === "/admin";
    return matchPrefix ? Boolean(pathname?.startsWith(href)) : pathname === href;
  };

  const allowed = (item: NavItem) => !item.perm || can(item.perm);

  const query = filter.trim().toLowerCase();
  const matches = (item: NavItem) =>
    !query ||
    item.label.toLowerCase().includes(query) ||
    (item.keywords ?? "").toLowerCase().includes(query);

  const visibleGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((i) => allowed(i) && matches(i)) }))
    .filter((group) => group.items.length > 0);

  const pinnedItems = groups
    .flatMap((group) => group.items)
    .filter((item) => pinned.includes(item.href) && allowed(item));

  const badgeOf = (item: NavItem) => (item.badgeKey ? badges[item.badgeKey] : undefined);
  const roleLabel = user?.role === "admin" ? "Administrator" : "Moderator";

  const renderItem = (item: NavItem, key?: string) => {
    const active = isActive(item.href, item.matchPrefix);
    const badge = badgeOf(item);
    const isPinned = pinned.includes(item.href);

    return (
      <li key={key ?? item.href} className="group/item relative">
        <Link
          href={item.href}
          onClick={onCloseMobile}
          title={collapsed ? item.label : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-[var(--r-ctl)] py-2 text-[13px] font-medium focus-ring",
            "transition-colors duration-[var(--t-fast)]",
            collapsed ? "justify-center px-2" : "px-3 pr-8",
            active
              ? "edge-brand bg-[var(--brand-wash)] text-[var(--brand-ink)]"
              : "text-[var(--ink-3)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
          )}
        >
          <span className={cn("shrink-0", active ? "text-[var(--brand)]" : "text-[var(--ink-4)]")}>
            {item.icon}
          </span>
          {!collapsed ? <span className="truncate">{item.label}</span> : null}
          {badge && badge > 0 ? (
            collapsed ? (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--bad)]" />
            ) : (
              <Count
                value={badge > 99 ? "99+" : badge}
                className="ml-auto bg-[var(--bad-wash)] text-[var(--bad)]"
              />
            )
          ) : null}
        </Link>

        {!collapsed ? (
          <button
            type="button"
            onClick={() => togglePin(item.href)}
            aria-label={isPinned ? "Qadashni bekor qilish" : "Tepaga qadash"}
            title={isPinned ? "Qadashni bekor qilish" : "Tepaga qadash"}
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[var(--r-ctl)] p-1 focus-ring",
              "transition-[opacity,color] duration-[var(--t-fast)]",
              isPinned
                ? "text-[var(--warn)] opacity-100"
                : "text-[var(--ink-4)] opacity-0 hover:text-[var(--ink)] group-hover/item:opacity-100 focus-visible:opacity-100",
            )}
          >
            <Star className={cn("size-3", isPinned && "fill-current")} />
          </button>
        ) : null}
      </li>
    );
  };

  const content = (
    <>
      {/* ------------------------------------------------------------ logo */}
      <div
        className={cn(
          "flex h-[var(--bar)] shrink-0 items-center border-b border-[var(--edge)]",
          collapsed ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5 rounded-[var(--r-ctl)] focus-ring">
          <LogoMark size="sm" />
          {!collapsed ? (
            <span className="truncate font-[family-name:var(--font-display)] text-[15.5px] leading-tight font-bold tracking-[-0.035em]">
              <span className="text-[var(--ink)]">Code</span>
              <span className="text-[var(--brand)]">Arena</span>
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-[var(--r-ctl)] p-1 text-[var(--ink-4)] transition-colors hover:bg-[var(--pane-hover)] hover:text-[var(--ink)] focus-ring lg:hidden"
          aria-label={t.common.close}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* ---------------------------------------------------- profil karta */}
      {!collapsed ? (
        <Link
          href="/admin/settings"
          onClick={onCloseMobile}
          className={cn(
            "mx-3 mb-2 flex shrink-0 items-center gap-3 rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane)] px-3 py-2.5 focus-ring",
            "transition-[background-color,border-color] duration-[var(--t-fast)] hover:border-[var(--edge-strong)] hover:bg-[var(--pane-hover)]",
          )}
        >
          <Avatar src={user?.avatar_url} name={user?.full_name || user?.username} size="sm" rank={user?.rank} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight text-[var(--ink)]">
              {user?.full_name || user?.username}
            </span>
            <span className="t-eyebrow block truncate text-[var(--brand)]">
              {roleLabel}
            </span>
          </span>
        </Link>
      ) : (
        <Link
          href="/admin/settings"
          onClick={onCloseMobile}
          className="mx-auto mb-2 shrink-0 rounded-full focus-ring"
          title={user?.username}
        >
          <Avatar src={user?.avatar_url} name={user?.full_name || user?.username} size="sm" rank={user?.rank} />
        </Link>
      )}

      {/* ---------------------------------------------------------- filtr */}
      {!collapsed ? (
        <div className="relative mx-3 mb-2 shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--ink-4)]" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t.nav.searchNav}
            aria-label={t.nav.searchNav}
            className={cn(
              "h-8 w-full rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane)] pl-8 pr-8",
              "text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]",
              "transition-[background-color,border-color,box-shadow] duration-[var(--t-fast)]",
              "hover:border-[var(--edge-strong)]",
              "focus:border-[var(--brand)] focus:shadow-[0_0_0_var(--focus-w)_var(--focus)]",
            )}
          />
          {filter ? (
            <button
              type="button"
              onClick={() => setFilter("")}
              aria-label={t.common.close}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--r-chip)] p-1 text-[var(--ink-4)] transition-colors hover:text-[var(--ink)] focus-ring"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ------------------------------------------------------ navigatsiya */}
      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-3 pb-2">
        {!collapsed && !query && pinnedItems.length ? (
          <div>
            <p className="t-eyebrow mb-1.5 px-3">{t.nav.favorites}</p>
            <ul className="space-y-0.5">
              {pinnedItems.map((item) => renderItem(item, `pin-${item.href}`))}
            </ul>
          </div>
        ) : null}

        {visibleGroups.map((group) => (
          <div key={group.key}>
            {!collapsed && group.label ? (
              <p className="t-eyebrow mb-1.5 px-3">{group.label}</p>
            ) : null}
            {collapsed && group.key !== "overview" ? (
              <div className="mx-2 mb-1.5 border-t border-[var(--edge)]" />
            ) : null}
            <ul className="space-y-0.5">{group.items.map((item) => renderItem(item))}</ul>
          </div>
        ))}

        {visibleGroups.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12.5px] text-[var(--ink-4)]">
            {t.nav.noNavResults}
          </p>
        ) : null}
      </nav>

      {/* -------------------------------------------------------- pastki qism */}
      <div className="shrink-0 space-y-0.5 border-t border-[var(--edge)] p-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          title={collapsed ? "Saytga o'tish" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-[var(--r-ctl)] px-3 py-2 text-[13px] font-medium text-[var(--ink-3)] focus-ring",
            "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
            collapsed && "justify-center px-2",
          )}
        >
          <Globe className="size-4 shrink-0 text-[var(--ink-4)]" />
          {!collapsed ? <span>Saytga o&apos;tish</span> : null}
        </a>
        <button
          type="button"
          onClick={() => void logout()}
          title={collapsed ? t.common.logout : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[var(--r-ctl)] px-3 py-2 text-[13px] font-medium text-[var(--bad)] focus-ring",
            "transition-colors duration-[var(--t-fast)] hover:bg-[var(--bad-wash)]",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed ? <span>{t.common.logout}</span> : null}
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "hidden w-full items-center gap-2.5 rounded-[var(--r-ctl)] px-3 py-2 text-[13px] font-medium text-[var(--ink-4)] focus-ring",
            "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)] lg:flex",
            collapsed && "justify-center px-2",
          )}
        >
          <ChevronLeft
            className={cn(
              "size-4 shrink-0 transition-transform duration-[var(--t-base)] ease-[var(--ease-snap)]",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed ? <span>Yig&apos;ish</span> : null}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop — yorug' muzlatilgan rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--edge)] bg-[var(--canvas)]",
          "transition-[width] duration-[var(--t-base)] ease-[var(--ease-snap)] lg:flex",
          collapsed ? "w-[var(--rail)]" : "w-[var(--rail-open)]",
        )}
      >
        {content}
      </aside>

      {/* Mobile — suzuvchi qatlam */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="enter-veil absolute inset-0 bg-[rgb(26_25_23/0.44)] backdrop-blur-[2px]"
            onClick={onCloseMobile}
          />
          <aside className="enter relative flex h-full w-72 flex-col border-r border-[var(--edge)] bg-[var(--pane-solid)] shadow-[var(--lift-pop)]">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}

export type { NavGroup };

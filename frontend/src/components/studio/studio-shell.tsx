"use client";

import {
  ChevronsLeft,
  ExternalLink,
  Loader2,
  LogOut,
  Menu,
  PanelLeft,
  Shield,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

import { isActive, visibleNav } from "./nav";

const COLLAPSE_KEY = "codearena-studio-rail";

/**
 * Studio qobig'i.
 *
 * `/admin` dan ataylab boshqacha: yon menyu bitta ro'yxat (guruhsiz),
 * yuqori panel esa sahifaning O'ZINIKI — u yerda sahifa tablari va asosiy
 * amal turadi. Sabab: muallif bir vaqtning o'zida bitta obyekt ustida
 * ishlaydi (bitta masala, bitta olimpiada), shuning uchun ekranning yuqori
 * qismi shu obyektga tegishli bo'lishi kerak, umumiy navigatsiyaga emas.
 */
export function StudioShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  // Sahifa almashganda mobil menyu yopilsin — aks holda u yangi sahifa
  // ustida osilib qoladi va foydalanuvchi uni qo'lda yopishi kerak.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggle = () => {
    setCollapsed((value) => {
      localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      return !value;
    });
  };

  if (loading) {
    return (
      <div className="studio flex min-h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[var(--green)]" />
      </div>
    );
  }

  if (!user?.permissions.can_access_studio) {
    return (
      <div className="studio flex min-h-dvh items-center justify-center px-6">
        <div className="st-panel max-w-md p-8 text-center">
          <Shield className="mx-auto size-8 text-[var(--text-4)]" />
          <h1 className="ts-h2 mt-4 text-[var(--text)]">Studio yopiq</h1>
          <p className="ts-sm mt-2 text-[var(--text-3)]">
            Bu panel muallif, moderator va administratorlar uchun. Agar masala
            tuzmoqchi bo&apos;lsangiz, administratordan «Muallif» rolini so&apos;rang.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--text)] px-4 text-[16px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)]"
          >
            Bosh sahifaga
          </Link>
        </div>
      </div>
    );
  }

  const items = visibleNav(user.permissions.codes);

  return (
    <div className="studio min-h-dvh">
      <StudioRail
        items={items}
        pathname={pathname}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={toggle}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
        onLogout={logout}
      />

      <div
        className={cn(
          "transition-[padding] duration-[var(--dur-2)] ease-[var(--ease)]",
          collapsed ? "lg:pl-[var(--st-rail-mini)]" : "lg:pl-[var(--st-rail)]",
        )}
      >
        {/* Mobil uchun menyu tugmasi — desktopda rail doim ko'rinadi. */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="st-chrome sticky top-0 z-30 flex h-12 w-full items-center gap-2 border-b px-4 text-[16px] font-semibold text-[var(--text)] lg:hidden"
        >
          <Menu className="size-4" />
          Studio
        </button>

        <main className="min-h-dvh">{children}</main>
      </div>
    </div>
  );
}

function StudioRail({
  items,
  pathname,
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
  user,
  onLogout,
}: {
  items: ReturnType<typeof visibleNav>;
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onLogout: () => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Menyuni yopish"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "st-chrome fixed inset-y-0 left-0 z-50 flex flex-col border-r",
          "transition-[width,transform] duration-[var(--dur-2)] ease-[var(--ease)]",
          collapsed ? "lg:w-[var(--st-rail-mini)]" : "lg:w-[var(--st-rail)]",
          "w-[var(--st-rail)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logotip */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--st-edge-chrome)] px-4">
          <Link href="/studio" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-[var(--green)] font-mono text-[17px] font-bold text-[var(--text-on-green)]">
              &gt;
            </span>
            {!collapsed ? (
              <span className="truncate text-[16.5px] font-bold tracking-tight text-[var(--text)]">
                CodeArena <span className="text-[var(--green-text)]">Studio</span>
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Yopish"
            className="ml-auto grid size-8 place-items-center rounded-lg text-[var(--text-3)] hover:bg-[var(--st-chrome-hover)] hover:text-[var(--text)] lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Bo'limlar — TEKIS ro'yxat, guruh sarlavhalarisiz.
            Beshta band uchun sarlavha ortiqcha edi: u ro'yxatni uzaytirib,
            ikkita band uchun bitta izoh qo'yardi. Qisqa tekis ro'yxat esa
            bir qarashda o'qiladi. */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-active={isActive(pathname, item)}
              title={collapsed ? item.label : undefined}
              className={cn("st-nav", collapsed && "justify-center px-0")}
            >
              {item.icon}
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          ))}
        </nav>

        {/* Pastki blok: admin, saytga o'tish, profil, chiqish */}
        <div className="shrink-0 space-y-0.5 border-t border-[var(--st-edge-chrome)] p-2.5">
          {user.permissions.can_access_admin ? (
            /* `/admin` — Django sahifasi, Next router uni tanimaydi: oddiy
               <a> orqali to'liq sahifa yuklanishi kerak (aks holda Next
               prefetch qilib 404 oladi). */
            <a
              href="/admin/"
              title={collapsed ? "Admin panel" : undefined}
              className={cn("st-nav", collapsed && "justify-center px-0")}
            >
              <Shield className="size-[17px] shrink-0" />
              {!collapsed ? <span className="truncate">Admin panel</span> : null}
            </a>
          ) : null}

          <Link
            href="/"
            title={collapsed ? "Saytga o'tish" : undefined}
            className={cn("st-nav", collapsed && "justify-center px-0")}
          >
            <ExternalLink className="size-[17px] shrink-0" />
            {!collapsed ? <span className="truncate">Saytga o&apos;tish</span> : null}
          </Link>

          <div
            className={cn(
              "mt-1.5 flex items-center gap-2.5 rounded-[9px] px-2 py-2",
              collapsed && "justify-center px-0",
            )}
          >
            <Avatar src={user.avatar_url} name={user.full_name || user.username} size="sm" />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[var(--text)]">
                  {user.full_name || user.username}
                </p>
                <p className="truncate text-[13px] text-[var(--text-4)]">@{user.username}</p>
              </div>
            ) : null}
            {!collapsed ? (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Chiqish"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--text-4)] transition-colors hover:bg-[var(--st-chrome-hover)] hover:text-[var(--text)]"
              >
                <LogOut className="size-4" />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onToggle}
            className={cn("st-nav hidden w-full lg:flex", collapsed && "justify-center px-0")}
            title={collapsed ? "Menyuni ochish" : "Menyuni yig'ish"}
          >
            {collapsed ? (
              <PanelLeft className="size-[17px] shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="size-[17px] shrink-0" />
                <span className="truncate">Yig&apos;ish</span>
              </>
            )}
          </button>

          {/* Mualliflik qatori — panel oxirini yopadi va «bu qaysi
              mahsulot» degan savolga javob bo'lib turadi. */}
          {!collapsed ? (
            <p className="ts-num px-3 pt-2 text-[13px] text-[var(--text-4)]">
              © {new Date().getFullYear()} CodeArena
            </p>
          ) : null}
        </div>
      </aside>
    </>
  );
}

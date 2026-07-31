"use client";

import { LogOut, MoreHorizontal, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useAuth, useI18n, useTheme } from "@/components/providers";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { useAccountLinks, useMobileTabs, useNavModel } from "./nav-model";

/* ==========================================================================
   Mobil qatlam
   --------------------------------------------------------------------------
   Telefonda navigatsiya PASTDA. Yuqoridagi burger menyu bosh barmoq yetmaydigan
   joyda turadi va har safar qo'lni qayta joylashtirishga majbur qiladi.

   Pastki panelda to'rtta eng ko'p ishlatiladigan yo'nalish va beshinchi
   "Yana" tugmasi — u to'liq varaqni ochadi. Faol element ustida qisqa brend
   chizig'i: ikonka rangi bilan birga ikkita signal.
   ========================================================================== */

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname() ?? "";
  const { t } = useI18n();
  const tabs = useMobileTabs();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-60 lg:hidden",
        "border-t border-[var(--edge)] bg-[var(--canvas)]",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="flex h-[var(--tabbar)] items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 focus-ring",
                "transition-colors duration-[var(--t-fast)]",
                active ? "text-[var(--brand)]" : "text-[var(--ink-4)]",
              )}
            >
              {active ? (
                <span aria-hidden className="absolute top-0 h-[2px] w-7 bg-[var(--brand)]" />
              ) : null}
              <span className="[&_svg]:size-[18px]">{tab.icon}</span>
              <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMore}
          aria-haspopup="dialog"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 focus-ring",
            "text-[var(--ink-4)] transition-colors",
          )}
        >
          <MoreHorizontal className="size-[18px]" />
          <span className="text-[10px] font-medium">{t.site.nav.more}</span>
        </button>
      </div>
    </nav>
  );
}

/**
 * To'liq menyu varag'i.
 *
 * Pastdan ko'tariladi va ekranning 88% ini egallaydi — qolgan bo'shliqdan
 * ostidagi sahifa ko'rinib turadi, ya'ni "qayerdan chiqqanim" yo'qolmaydi.
 */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() ?? "";
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { resolved, toggle: toggleTheme } = useTheme();
  const { groups, support, legal } = useNavModel();
  const accountLinks = useAccountLinks(user?.username, user?.permissions?.can_access_admin);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Yo'nalish o'zgarganda varaq o'zi yopiladi
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const row = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[var(--r-ctl)] px-3 py-2.5 focus-ring",
        "text-[14px] transition-colors",
        isActive(href)
          ? "bg-[var(--brand-wash)] font-semibold text-[var(--brand-ink)]"
          : "font-medium text-[var(--ink-2)] hover:bg-[var(--pane-hover)]",
      )}
    >
      <span
        className={cn(
          "shrink-0 [&_svg]:size-4",
          isActive(href) ? "text-[var(--brand)]" : "text-[var(--ink-4)]",
        )}
      >
        {icon}
      </span>
      {label}
    </Link>
  );

  return (
    <div className="fixed inset-0 z-100 flex flex-col justify-end lg:hidden">
      <div className="enter-veil absolute inset-0 bg-[rgb(10_10_10/0.5)] backdrop-blur-[2px]" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.site.nav.menu}
        className={cn(
          "enter-sheet relative flex max-h-[88dvh] flex-col",
          "rounded-t-[var(--r-pane-lg)] border-t border-[var(--edge)] bg-[var(--pane-solid)]",
          "shadow-[var(--lift-pop)]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--edge)] px-5 pt-3.5 pb-3">
          <Logo size="sm" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex size-9 items-center justify-center rounded-[var(--r-ctl)] text-[var(--ink-3)] focus-ring hover:bg-[var(--pane-hover)]"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {groups.map((group) => {
            const links = group.links.filter((link) => !link.private || user);
            if (!links.length) return null;
            return (
              <div key={group.key} className="mb-4">
                <p className="t-eyebrow mb-1.5 px-3">{group.label}</p>
                <div className="flex flex-col gap-0.5">
                  {links.map((link) => row(link.href, link.icon, link.label))}
                </div>
              </div>
            );
          })}

          {user ? (
            <div className="mb-4">
              <p className="t-eyebrow mb-1.5 px-3">{t.site.nav.account}</p>
              <div className="flex flex-col gap-0.5">
                {accountLinks.map((link) => row(link.href, link.icon, link.label))}
              </div>
            </div>
          ) : null}

          <div className="mb-4">
            <p className="t-eyebrow mb-1.5 px-3">{t.site.sections.support}</p>
            <div className="flex flex-col gap-0.5">
              {[...support, ...legal].map((link) => row(link.href, link.icon, link.label))}
            </div>
          </div>

          {/* Tema — yuqori paneldagi `PrefsMenu` ning mobil ko'rinishi */}
          <div className="mb-4 border-t border-[var(--edge)] pt-4">
            <p className="t-eyebrow mb-1.5 px-3">{t.site.nav.appearance}</p>
            <div className="px-1">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={resolved === "dark" ? t.site.nav.themeLight : t.site.nav.themeDark}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-2 rounded-[var(--r-ctl)] focus-ring",
                  "border border-[var(--edge)] bg-[var(--pane-sunken)] text-[13.5px] font-medium text-[var(--ink-2)]",
                )}
              >
                {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {resolved === "dark" ? t.site.nav.themeLight : t.site.nav.themeDark}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--edge)] px-1 pt-4">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void logout();
                }}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--r-ctl)] focus-ring",
                  "bg-[var(--bad-wash)] text-[13.5px] font-medium text-[var(--bad)]",
                )}
              >
                <LogOut className="size-4" />
                {t.site.nav.logout}
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--r-ctl)] focus-ring",
                    "border border-[var(--edge)] bg-[var(--pane-sunken)] text-[13.5px] font-medium text-[var(--ink-2)]",
                  )}
                >
                  {t.site.nav.signIn}
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--r-ctl)] focus-ring",
                    "bg-[var(--brand)] text-[13.5px] font-semibold text-[var(--ink-on-brand)]",
                    "shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]",
                  )}
                >
                  {t.site.nav.getStarted}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

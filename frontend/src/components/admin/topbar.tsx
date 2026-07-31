"use client";

import {
  Check,
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Sun,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { IconButton, KeyHint } from "@/components/kit";
import { useAuth, useI18n, useTheme } from "@/components/providers";
import { Avatar } from "@/components/ui/misc";
import { RoleBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** URL segmentidan o'qiladigan sarlavha yasaydi. */
function useBreadcrumbs() {
  const pathname = usePathname() ?? "";
  const { t } = useI18n();

  const labels: Record<string, string> = {
    admin: t.common.adminPanel,
    problems: t.nav.problems,
    "test-cases": t.nav.testCases,
    tags: t.nav.tags,
    "daily-challenge": t.nav.dailyChallenge,
    judge0: "Judge0",
    "judge-languages": t.nav.judgeLanguages,
    "contact-messages": t.nav.contactMessages,
    sessions: t.nav.sessions,
    backups: t.nav.backups,
    trash: t.nav.trash,
    submissions: t.nav.submissions,
    contests: t.nav.contests,
    users: t.nav.users,
    groups: t.nav.groups,
    discussions: t.nav.discussions,
    comments: t.nav.comments,
    reports: t.nav.reports,
    plagiarism: t.nav.plagiarism,
    "audit-log": t.nav.auditLog,
    announcements: t.nav.announcements,
    settings: t.nav.settings,
    new: t.common.create,
  };

  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isId = segment.length > 20 || /^\d+$/.test(segment);
    return {
      href,
      label: labels[segment] ?? (isId ? `#${segment.slice(0, 8)}` : segment),
      isLast: index === segments.length - 1,
    };
  });
}

const MENU_ITEM =
  "flex w-full items-center gap-2.5 rounded-[var(--r-ctl)] px-2.5 py-2 text-[13px] font-medium text-[var(--ink-2)] transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)] focus-ring";

/**
 * Admin tepa paneli — yupqa, qat'iy va yopishqoq.
 * Shaffoflik ham, blur ham yo'q: qirra kontentdan faqat soch chizig'i bilan
 * ajraladi, shu tufayli ostidan o'tayotgan jadval qatorlari "sizib" chiqmaydi.
 */
export function Topbar({
  onOpenSidebar,
  onOpenPalette,
}: {
  onOpenSidebar: () => void;
  onOpenPalette: () => void;
}) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { mode, resolved, setMode } = useTheme();
  const breadcrumbs = useBreadcrumbs();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const themeOptions = [
    { value: "light" as const, label: t.common.light, icon: Sun },
    { value: "dark" as const, label: t.common.dark, icon: Moon },
    { value: "system" as const, label: t.common.system, icon: Monitor },
  ];

  return (
    <header className="sticky-edge z-30 flex h-[var(--bar)] items-center gap-3 border-b border-[var(--edge)] px-3 sm:px-5">
      <IconButton
        size="sm"
        label="Menyu"
        onClick={onOpenSidebar}
        className="lg:hidden"
      >
        <Menu className="size-[18px]" />
      </IconButton>

      {/* ------------------------------------------------------ breadcrumb */}
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[12.5px] md:flex">
        {breadcrumbs.map((crumb) => (
          <span key={crumb.href} className="flex min-w-0 items-center gap-1">
            {crumb.isLast ? (
              <span className="truncate font-medium text-[var(--ink)]">{crumb.label}</span>
            ) : (
              <>
                <Link
                  href={crumb.href}
                  className="truncate rounded-[var(--r-ctl)] text-[var(--ink-3)] transition-colors duration-[var(--t-fast)] hover:text-[var(--ink)] focus-ring"
                >
                  {crumb.label}
                </Link>
                <span className="shrink-0 font-mono text-[var(--ink-4)] opacity-45">/</span>
              </>
            )}
          </span>
        ))}
      </nav>

      {/* ------------------------------------------------------ qidiruv */}
      <button
        type="button"
        onClick={onOpenPalette}
        className={cn(
          "ml-auto flex h-8 items-center gap-2 rounded-[var(--r-ctl)] border border-[var(--edge)] bg-[var(--pane)] px-2.5",
          "text-[12.5px] text-[var(--ink-4)] focus-ring sm:w-56",
          "transition-[background-color,border-color,color] duration-[var(--t-fast)]",
          "hover:border-[var(--edge-strong)] hover:text-[var(--ink-3)]",
        )}
      >
        <Search className="size-3.5 shrink-0" />
        <span className="hidden truncate sm:inline">{t.common.search}</span>
        <KeyHint className="ml-auto hidden sm:inline-flex">Ctrl K</KeyHint>
      </button>

      {/* ---------------------------------------------------------- tema */}
      <IconButton
        size="sm"
        label={t.common.theme}
        onClick={() => setMode(resolved === "dark" ? "light" : "dark")}
      >
        {resolved === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </IconButton>

      {/* --------------------------------------------------- profil menyu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={cn(
            "flex items-center gap-2 rounded-[var(--r-ctl)] p-0.5 pr-1 focus-ring",
            "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)]",
          )}
        >
          <Avatar src={user?.avatar_url} name={user?.full_name || user?.username} size="sm" rank={user?.rank} />
          <span className="hidden min-w-0 text-left lg:block">
            <span className="block max-w-[8rem] truncate text-[13px] font-medium leading-tight text-[var(--ink)]">
              {user?.full_name || user?.username}
            </span>
            <span className="block text-[11px] leading-tight text-[var(--ink-4)]">
              {user?.role === "admin" ? t.users.roleAdmin : t.users.roleModerator}
            </span>
          </span>
        </button>

        {menuOpen ? (
          <div className="enter-pop absolute right-0 top-full z-40 mt-1.5 w-64 origin-top-right overflow-hidden rounded-[var(--r-field)] pane-float">
            <div className="flex items-center gap-3 border-b border-[var(--edge)] p-3">
              <Avatar src={user?.avatar_url} name={user?.full_name || user?.username} size="md" rank={user?.rank} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--ink)]">
                  {user?.full_name || user?.username}
                </p>
                <p className="truncate text-[11px] text-[var(--ink-3)]">{user?.email}</p>
              </div>
            </div>

            <div className="border-b border-[var(--edge)] p-1.5">
              {user ? (
                <div className="mb-1.5 px-1.5 pt-1">
                  <RoleBadge value={user.role} />
                </div>
              ) : null}
              <Link href="/admin/settings" onClick={() => setMenuOpen(false)} className={MENU_ITEM}>
                <UserIcon className="size-4 text-[var(--ink-4)]" />
                {t.common.profile}
              </Link>
              <a href="/" target="_blank" rel="noreferrer" className={MENU_ITEM}>
                <ExternalLink className="size-4 text-[var(--ink-4)]" />
                Saytni ochish
              </a>
            </div>

            <div className="border-b border-[var(--edge)] p-1.5">
              <p className="t-eyebrow px-2.5 pb-1 pt-1.5">{t.common.theme}</p>
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={MENU_ITEM}
                >
                  <option.icon className="size-4 text-[var(--ink-4)]" />
                  {option.label}
                  {mode === option.value ? (
                    <Check className="ml-auto size-3.5 text-[var(--brand)]" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="p-1.5">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2.5 rounded-[var(--r-ctl)] px-2.5 py-2 text-[13px] font-medium text-[var(--bad)] transition-colors duration-[var(--t-fast)] hover:bg-[var(--bad-wash)] focus-ring"
              >
                <LogOut className="size-4" />
                {t.common.logout}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

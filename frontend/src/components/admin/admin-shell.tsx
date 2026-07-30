"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { CommandPalette } from "@/components/admin/command-palette";
import { KeyboardShortcuts } from "@/components/admin/shortcuts";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { useAuth } from "@/components/providers";
import { api } from "@/lib/api";
import type { DashboardStats, TrashResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "codearena-sidebar-collapsed";

/**
 * Admin panel qobig'i.
 *
 * Marshrut layouti (`app/admin/layout.tsx`) server komponenti bo'lib qoldi —
 * u yerdan `metadata` eksport qilinadi (sarlavha shabloni va `noindex`).
 * Interaktiv qism, ya'ni shu fayl, klientda ishlaydi.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  // Ctrl/Cmd + K — command palette
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Sidebar badge'lari uchun yengil so'rov
  const { data: stats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<DashboardStats>("/admin/dashboard/stats/"),
    enabled: Boolean(user?.permissions.can_access_admin),
    refetchInterval: 60_000,
  });

  const { data: trash } = useQuery({
    queryKey: ["trash", "", ""],
    queryFn: () => api.get<TrashResponse>("/admin/trash/"),
    enabled: Boolean(user?.permissions.can_access_admin),
    refetchInterval: 120_000,
  });

  const toggleCollapse = () => {
    setCollapsed((value) => {
      localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      return !value;
    });
  };

  if (loading || !user?.permissions.can_access_admin) {
    return (
      <div className="aurora-canvas flex min-h-dvh items-center justify-center">
        <div className="relative z-1 flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-[var(--brand)]" />
          <p className="t-meta text-[var(--ink-3)]">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aurora-canvas min-h-dvh">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        badges={{
          plagiarism: stats?.moderation.plagiarism_pending,
          reports: stats?.moderation.reports_open,
          queue: stats?.submissions.pending,
          trash: trash?.total,
        }}
      />

      <div
        className={cn(
          "relative z-1 transition-[padding] duration-[var(--t-base)] ease-[var(--ease-snap)]",
          collapsed ? "lg:pl-[var(--rail)]" : "lg:pl-[var(--rail-open)]",
        )}
      >
        <Topbar
          onOpenSidebar={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="mx-auto w-full max-w-[110rem] px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <KeyboardShortcuts />
    </div>
  );
}

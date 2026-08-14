import type { Metadata } from "next";

import { SiteShell } from "@/components/shell/site-shell";
import { AnnouncementBanner } from "@/components/site/announcement-banner";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

/**
 * Foydalanuvchi qismining qobig'i.
 *
 * Navigatsiya TEPADA (ochiluvchi menyular bilan), mobilda esa pastki
 * tab-panelda. Eng pastda futer — huquqiy va yordam havolalari o'sha yerda.
 * Tafsilotlar: `components/wrap/site-shell.tsx`.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <AnnouncementBanner />
      {children}
    </SiteShell>
  );
}

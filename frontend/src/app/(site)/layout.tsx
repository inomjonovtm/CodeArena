import type { Metadata } from "next";

import { SiteShell } from "@/components/shell/site-shell";
import { AnnouncementBanner } from "@/components/site/announcement-banner";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

/**
 * Foydalanuvchi qismining qobig'i.
 *
 * Navigatsiya chapdagi railda va mobil pastki panelda — tepada gorizontal
 * menyu yo'q (`components/shell/` ga qarang). Footer ham olib tashlandi:
 * railda yordam va huquqiy havolalar doim qo'l ostida, ya'ni har bir
 * sahifaning oxiriga takroriy blok qo'shish shart emas.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <AnnouncementBanner />
      {children}
    </SiteShell>
  );
}

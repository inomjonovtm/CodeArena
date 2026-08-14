import type { Metadata } from "next";

import { StudioShell } from "@/components/studio/studio-shell";

/**
 * Studio marshrutlari uchun meta.
 *
 * `noindex` — muallif paneli qidiruv natijalarida ko'rinmasligi kerak.
 * Interaktiv qism `StudioShell` da (klient komponenti).
 */
export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio · CodeArena" },
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}

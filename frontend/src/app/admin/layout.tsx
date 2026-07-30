import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Admin marshrutlari uchun meta.
 *
 * `noindex` — panel qidiruv natijalarida ko'rinmasligi kerak; sarlavha
 * shabloni esa har bir admin sahifasini brauzer tabida ajratib turadi.
 */
export const metadata: Metadata = {
  title: { default: "Admin panel", template: "%s · Admin · CodeArena" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

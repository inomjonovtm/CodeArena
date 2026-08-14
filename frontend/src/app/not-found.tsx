import type { Metadata } from "next";
import Link from "next/link";

import { LinkButton } from "@/components/kit";
import { SiteShell } from "@/components/shell/site-shell";

export const metadata: Metadata = {
  title: "Sahifa topilmadi",
  robots: { index: false, follow: false },
};

/* ==========================================================================
   404
   --------------------------------------------------------------------------
   Ilgari bu holatda Next'ning ingliz tilidagi standart sahifasi chiqardi:
   boshqa shrift, boshqa rang, navigatsiyasiz. Endi 404 ham sayt qobig'ida
   turadi — foydalanuvchi yo'qolib qolmaydi, panel va futer joyida qoladi.
   ========================================================================== */

const SUGGESTIONS = [
  { href: "/problems", label: "Masalalar" },
  { href: "/contests", label: "Musobaqalar" },
  { href: "/leaderboard", label: "Reyting" },
  { href: "/discussions", label: "Muhokamalar" },
  { href: "/help", label: "Yordam" },
];

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto flex w-full max-w-[var(--container-narrow)] flex-col items-start py-10 sm:py-16">
        <p className="ts-label flex items-center gap-2">
          <span className="text-[var(--green)]">404</span>
          <span aria-hidden className="h-px w-6 bg-[var(--line-strong)]" />
          Sahifa topilmadi
        </p>

        <h1 className="ts-h1 mt-5 text-[var(--text)]">Bu manzilda hech narsa yo&apos;q</h1>
        <p className="ts-body mt-4 max-w-md text-[var(--text-3)]">
          Havola eskirgan, manzil xato yozilgan yoki sahifa o&apos;chirilgan bo&apos;lishi mumkin.
          Quyidagi bo&apos;limlardan davom eting.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <LinkButton href="/problems" variant="primary">
            Masalalarga o&apos;tish
          </LinkButton>
          <LinkButton href="/">Bosh sahifa</LinkButton>
        </div>

        <div className="divider mt-10 w-full pt-5">
          <p className="ts-label">Balki shu kerakdir</p>
          <nav className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2.5">
            {SUGGESTIONS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="ring-focus rounded-[5px] text-[14.5px] text-[var(--text-3)] transition-colors hover:text-[var(--green)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </SiteShell>
  );
}

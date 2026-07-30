"use client";

import {
  Facebook,
  Github,
  Instagram,
  Linkedin,
  Send,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/components/providers";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { useNavModel } from "./nav-model";

/* ==========================================================================
   Sayt futeri
   --------------------------------------------------------------------------
   Navigatsiya chap raildan yuqori panelga ko'chirilganda futer ham olib
   tashlangan edi — natijada "Foydalanish shartlari" va "Maxfiylik siyosati"
   sahifalariga kompyuterdan umuman yo'l qolmagan (ular faqat mobil menyuda
   turardi). Huquqiy hujjatlar har bir sahifadan bir bosishda ochilishi kerak.

   Futer dizayn tiliga bo'ysunadi: kartasiz, tepasida soch chizig'i, ustunlar
   bo'shliq bilan ajraladi. Mobilda pastki tab-panel bilan to'qnashmasligi
   uchun ostiga qo'shimcha chekinish beriladi.
   ========================================================================== */

const LINK = [
  "focus-ring inline-block rounded-[5px] text-[13px] text-[var(--ink-3)]",
  "transition-colors duration-[var(--t-fast)] hover:text-[var(--ink)]",
].join(" ");

/* Ijtimoiy tarmoq havolalari admin paneldagi «Ijtimoiy tarmoqlar» guruhidan
   keladi. Ikonka shu jadval orqali topiladi: sozlamada bo'sh qoldirilgan
   tarmoq futerga umuman chiqmaydi, to'ldirilgani esa shu yerda paydo
   bo'ladi — joyi o'zgarmaydi. */
const SOCIAL_ICON: Record<string, LucideIcon> = {
  social_telegram: Send,
  social_instagram: Instagram,
  social_youtube: Youtube,
  social_github: Github,
  social_linkedin: Linkedin,
  social_facebook: Facebook,
  social_x: Twitter,
};

const SOCIAL_BTN = [
  "focus-ring grid size-9 place-items-center rounded-full",
  "border border-[var(--edge)] text-[var(--ink-3)]",
  "transition-[color,border-color,background-color] duration-[var(--t-fast)]",
  "hover:border-[var(--brand)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand)]",
].join(" ");

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="t-eyebrow">{title}</p>
      <ul className="mt-3.5 flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

export function SiteFooter({
  /** Mobil tab-panel ostida qolmasligi uchun qo'shimcha chekinish.
      Bosh sahifada tab-panel yo'q — u yerda `false`. */
  clearTabBar = true,
}: {
  clearTabBar?: boolean;
}) {
  const { t } = useI18n();
  const { groups, support, legal } = useNavModel();
  const { siteEmail, socials } = useSiteSettings();

  const practice = groups.find((group) => group.key === "practice");
  const compete = groups.find((group) => group.key === "compete");
  const community = groups.find((group) => group.key === "community");

  // Shaxsiy bo'limlar (yechimlarim, saqlanganlar) futerda ko'rsatilmaydi:
  // ular hisobga bog'liq va yuqori panelda allaqachon bor.
  const publicLinks = (links: { href: string; label: string; private?: boolean }[] = []) =>
    links.filter((link) => !link.private);

  return (
    <footer className="mt-16 border-t border-[var(--edge)]">
      <div
        className={cn(
          "mx-auto w-full max-w-[var(--page)] px-4 pt-12 sm:px-6 lg:px-[var(--gutter)]",
          clearTabBar ? "pb-[calc(var(--tabbar)+2rem)] lg:pb-12" : "pb-12",
        )}
      >
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
          <div className="min-w-0">
            <Logo size="sm" />
            <p className="t-meta mt-4 max-w-xs text-[var(--ink-3)]">{t.site.footer.tagline}</p>
            <p className="t-meta mt-4 text-[var(--ink-4)]">{t.site.footer.location}</p>
            <a href={`mailto:${siteEmail}`} className={cn(LINK, "mt-1.5")}>
              {siteEmail}
            </a>

            {/* Ijtimoiy tarmoqlar — doimiy joy. Sozlamada biror havola
                to'ldirilmagan bo'lsa, bo'sh sarlavha qolmasligi uchun butun
                blok chiqmaydi. */}
            {socials.length > 0 ? (
              <div className="mt-6">
                <p className="t-eyebrow">{t.site.footer.social}</p>
                <ul className="mt-3 flex flex-wrap items-center gap-2">
                  {socials.map((row) => {
                    const Icon = SOCIAL_ICON[row.key];
                    if (!Icon) return null;
                    return (
                      <li key={row.key}>
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={SOCIAL_BTN}
                          aria-label={row.label}
                          title={row.label}
                        >
                          <Icon className="size-[17px]" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <Column title={t.site.sections.practice}>
            {publicLinks(practice?.links).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </Column>

          <Column title={t.site.footer.community}>
            {[...publicLinks(compete?.links), ...publicLinks(community?.links)].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </Column>

          <Column title={t.site.footer.help}>
            {[...support, ...legal].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </Column>
        </div>

        <div className="rule mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-5">
          <p className="t-meta text-[var(--ink-4)]">
            <span className="t-num">© {new Date().getFullYear()}</span> CodeArena ·{" "}
            {t.site.footer.rights}
          </p>
          <nav aria-label={t.site.footer.help} className="flex items-center gap-x-5 gap-y-2">
            {legal.map((link) => (
              <Link key={link.href} href={link.href} className={cn(LINK, "text-[12.5px]")}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

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
   Futer — sahifadagi yagona doimiy QORA blok. U ikki vazifani bajaradi:
   sahifani "yopadi" (oq kontent qora poydevorga tushadi) va huquqiy
   hujjatlarga har bir sahifadan bir bosishda yo'l beradi.

   Ichkarida `on-dark` klassi turadi: u sirt va siyoh tokenlarini ag'daradi,
   shuning uchun logotip, havolalar va ikonkalar o'z kodiga tegmasdan to'q
   fonga moslashadi. Matn oq, ikkinchi darajali qatorlar kulrang, havola
   hoverda ko'kga o'tadi — sayt bo'ylab bir xil qoida.
   ========================================================================== */

const LINK = [
  "focus-ring inline-block rounded-[6px] text-[14.5px] text-[var(--stage-ink-2)]",
  "transition-colors duration-[var(--t-fast)] hover:text-[var(--stage-brand)]",
].join(" ");

/* Ijtimoiy tarmoq havolalari admin paneldagi «Ijtimoiy tarmoqlar» guruhidan
   keladi. Ikonka shu jadval orqali topiladi: sozlamada bo'sh qoldirilgan
   tarmoq futerga umuman chiqmaydi. */
const SOCIAL_ICON: Record<string, LucideIcon> = {
  social_telegram: Send,
  social_instagram: Instagram,
  social_youtube: Youtube,
  social_github: Github,
  social_linkedin: Linkedin,
  social_facebook: Facebook,
  social_x: Twitter,
};

/* Chiziqli (outline) ikonka → hoverda ko'k to'ldirma va 1.1 barobar
   kattalashish. Ikkalasi birga bo'lgani uchun harakat "javob" kabi
   o'qiladi: element bosishga tayyorligini bildiradi. */
const SOCIAL_BTN = [
  "focus-ring grid size-10 place-items-center rounded-full",
  "border border-[var(--stage-edge)] text-[var(--stage-ink-2)]",
  "transition-[color,border-color,background-color,transform] duration-[var(--t-fast)] ease-[var(--ease-snap)]",
  "hover:scale-110 hover:border-[var(--stage-brand)] hover:bg-[var(--stage-brand)] hover:text-[#0a0a0a]",
].join(" ");

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-semibold tracking-[0.12em] text-white uppercase">{title}</p>
      <ul className="mt-5 flex flex-col gap-3.5">{children}</ul>
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
    /* Yuqori chekinish YO'Q: oldingi blok (kontent yoki CTA lentasi) o'z
       pastki bo'shlig'ini beradi, futer esa sahifaning oxirgi qatlami
       sifatida to'g'ridan-to'g'ri unga tegib turadi. */
    <footer className="on-dark bg-[var(--stage-2)]">
      <div
        className={cn(
          "shell pt-20",
          clearTabBar ? "pb-[calc(var(--tabbar)+3rem)] lg:pb-20" : "pb-20",
        )}
      >
        {/* Brend ustuni kengroq: u nafaqat havolalar, balki mahsulot
            haqidagi bir jumla va aloqa ma'lumotini ham ushlaydi. */}
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:gap-16">
          <div className="min-w-0">
            <Logo size="md" />
            <p className="mt-6 max-w-xs text-[15px] leading-[1.65] text-[var(--stage-ink-2)]">
              {t.site.footer.tagline}
            </p>
            <p className="mt-6 text-[14px] text-[var(--stage-ink-3)]">{t.site.footer.location}</p>
            <a href={`mailto:${siteEmail}`} className={cn(LINK, "mt-1.5")}>
              {siteEmail}
            </a>

            {socials.length > 0 ? (
              <ul className="mt-8 flex flex-wrap items-center gap-3">
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
                        <Icon className="size-[18px]" />
                      </a>
                    </li>
                  );
                })}
              </ul>
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

        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-[var(--stage-edge)] pt-8">
          <p className="text-[13px] text-[var(--stage-ink-3)]">
            <span className="t-num">© {new Date().getFullYear()}</span> CodeArena ·{" "}
            {t.site.footer.rights}
          </p>
          <nav aria-label={t.site.footer.help} className="flex items-center gap-x-6 gap-y-2">
            {legal.map((link) => (
              <Link key={link.href} href={link.href} className={cn(LINK, "text-[13px]")}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

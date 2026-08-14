"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";

import { useNavModel } from "./nav-model";

/* ==========================================================================
   SAYT FUTERI — bitta ingichka qator
   --------------------------------------------------------------------------
   Ilgari futer sahifaning "yashil poydevori" edi: to'yingan blok, chaqiriq,
   uch ustun havola, ijtimoiy tarmoqlar. Yon panelli tartibda bularning
   hammasi ortiqcha: navigatsiya doim chapda ochiq turibdi, chaqiriq esa
   panelning o'zida.

   Qolgani — har sahifadan bir bosishda bo'lishi SHART bo'lgan huquqiy
   havolalar va mualliflik satri. Ular kontent ostidagi bitta tinch
   qatorga sig'adi.
   ========================================================================== */

const LINK = [
  "ring-focus rounded-[4px] text-[13px] text-[var(--text-4)]",
  "transition-colors duration-[var(--dur-1)] hover:text-[var(--text-2)]",
].join(" ");

export function SiteFooter({
  /** Mobil tab-panel ostida qolmasligi uchun qo'shimcha chekinish. */
  clearTabBar = true,
}: {
  clearTabBar?: boolean;
}) {
  const { t } = useI18n();
  const { legal, support } = useNavModel();
  const { siteEmail } = useSiteSettings();

  return (
    <footer
      className={cn(
        "mt-auto border-t border-[var(--line)]",
        clearTabBar && "max-lg:mb-[var(--tabbar-h)]",
      )}
    >
      <div className="wrap flex flex-wrap items-center gap-x-5 gap-y-2 py-4">
        <p className="ts-num text-[13px] text-[var(--text-4)]">
          © {new Date().getFullYear()} CodeArena
        </p>
        <span className="flex-1" />
        {[...support, ...legal].map((link) => (
          <Link key={link.href} href={link.href} className={LINK}>
            {link.label}
          </Link>
        ))}
        <a href={`mailto:${siteEmail}`} className={LINK} title={t.site.footer.help}>
          {siteEmail}
        </a>
      </div>
    </footer>
  );
}

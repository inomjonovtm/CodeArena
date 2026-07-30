"use client";

import {
  Bookmark,
  CalendarDays,
  CircleHelp,
  History,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Phone,
  Scale,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import { useI18n } from "@/components/providers";

/* ==========================================================================
   Navigatsiya modeli
   --------------------------------------------------------------------------
   Bo'limlar ma'no bo'yicha guruhlangan, tekis ro'yxat emas:

     MASHQ    — kundalik ish (masalalar, kunlik masala, yechimlar, xatcho'p)
     BELLASHUV — natija va raqobat (musobaqalar, reyting)
     JAMOA    — odamlar va matn (muhokama, guruh, yangilik)

   Eski panelda beshta havola tepada, sakkiztasi "yana" menyusida yashiringan
   edi — ya'ni yarmi ko'rinmasdi. Guruhlash barchasini bitta ustunga sig'diradi
   va yonma-yon turgan bo'limlar bir-birini izohlaydi.
   ========================================================================== */

export type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Faqat kirgan foydalanuvchiga ko'rinadi */
  private?: boolean;
};

export type NavGroup = {
  key: string;
  label: string;
  links: NavLink[];
};

export function useNavModel() {
  const { t } = useI18n();

  const groups: NavGroup[] = [
    {
      key: "practice",
      label: t.site.sections.practice,
      links: [
        { href: "/problems", label: t.site.nav.problems, icon: <ListChecks className="size-[18px]" /> },
        { href: "/daily", label: t.site.nav.daily, icon: <CalendarDays className="size-[18px]" /> },
        { href: "/submissions", label: t.site.nav.mySubmissions, icon: <History className="size-[18px]" />, private: true },
        { href: "/bookmarks", label: t.site.nav.bookmarks, icon: <Bookmark className="size-[18px]" />, private: true },
      ],
    },
    {
      key: "compete",
      label: t.site.sections.compete,
      links: [
        { href: "/contests", label: t.site.nav.contests, icon: <Swords className="size-[18px]" /> },
        { href: "/leaderboard", label: t.site.nav.leaderboard, icon: <Trophy className="size-[18px]" /> },
      ],
    },
    {
      key: "community",
      label: t.site.sections.community,
      links: [
        { href: "/discussions", label: t.site.nav.discussions, icon: <MessageSquare className="size-[18px]" /> },
        { href: "/groups", label: t.site.nav.groups, icon: <Users className="size-[18px]" /> },
      ],
    },
  ];

  /** Yordam bo'limi — railning pastida, asosiy oqimdan ajratilgan */
  const support: NavLink[] = [
    { href: "/help", label: t.site.footer.helpFaq, icon: <CircleHelp className="size-[18px]" /> },
    { href: "/contact", label: t.site.nav.contact, icon: <Phone className="size-[18px]" /> },
  ];

  const legal: NavLink[] = [
    { href: "/terms", label: t.site.footer.terms, icon: <Scale className="size-4" /> },
    { href: "/privacy", label: t.site.footer.privacy, icon: <ShieldCheck className="size-4" /> },
  ];

  return { groups, support, legal };
}

export function useAccountLinks(username?: string, canAccessAdmin?: boolean) {
  const { t } = useI18n();
  return [
    ...(username
      ? [{ href: `/u/${username}`, label: t.site.nav.myProfile, icon: <Users className="size-4" /> }]
      : []),
    { href: "/settings", label: t.site.nav.settings, icon: <Settings className="size-4" /> },
    ...(canAccessAdmin
      ? [{ href: "/admin", label: t.site.nav.adminPanel, icon: <LayoutDashboard className="size-4" /> }]
      : []),
  ];
}

/** Mobil pastki panel — bosh barmoq yetadigan to'rtta yo'nalish (+ "Yana") */
export function useMobileTabs() {
  const { t } = useI18n();
  return [
    { href: "/problems", label: t.site.nav.problems, icon: <ListChecks className="size-[19px]" /> },
    { href: "/contests", label: t.site.nav.contests, icon: <Swords className="size-[19px]" /> },
    { href: "/daily", label: t.site.nav.daily, icon: <CalendarDays className="size-[19px]" /> },
    { href: "/leaderboard", label: t.site.nav.leaderboard, icon: <Trophy className="size-[19px]" /> },
  ];
}

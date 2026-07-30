"use client";

import {
  Activity,
  Bell,
  Bookmark,
  CalendarDays,
  DatabaseBackup,
  FileText,
  FlaskConical,
  Flag,
  Gauge,
  Languages,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  MonitorSmartphone,
  Puzzle,
  ScrollText,
  Server,
  Settings,
  ShieldAlert,
  Tags,
  Terminal,
  Trash2,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";

import type { Dictionary } from "@/i18n/dictionaries";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Badge key — layoutda jonli sonlar bilan to'ldiriladi. */
  badgeKey?: "plagiarism" | "reports" | "queue" | "trash";
  /**
   * Bo'lim ko'rinishi uchun kerakli huquq kodi.
   *
   * Ilgari bu yerda `(p) => p.can_manage_problems` kabi funksiyalar edi va
   * ular rolga bog'langan bayroqlarni tekshirardi — moderatordan huquq olib
   * tashlansa ham menyu o'zgarmasdi. Endi menyu ham, API ham bir xil kodni
   * tekshiradi, shuning uchun natija doim mos keladi.
   */
  perm?: string;
  /** `/admin/problems/new` kabi ichki sahifalarda ham aktiv bo'lishi uchun. */
  matchPrefix?: boolean;
  /** Tez qidiruv uchun qo'shimcha kalit so'zlar. */
  keywords?: string;
}

export interface NavGroup {
  key: string;
  label: string;
  icon?: React.ReactNode;
  items: NavItem[];
}

const iconClass = "size-4 shrink-0";

/**
 * Admin menyusi.
 *
 * Guruhlar soni 6 tadan 5 taga tushdi va nomlari ish jarayoniga qarab
 * qo'yildi («Masalalar», «Musobaqa va judge», «Foydalanuvchilar»...), chunki
 * eski «Kontent / Tizim» kabi umumiy nomlarda kerakli bo'limni topish qiyin
 * edi — masalan test-case'lar «Kontent» ichida turardi.
 */
export function buildNav(t: Dictionary): NavGroup[] {
  return [
    {
      key: "overview",
      label: "",
      items: [
        {
          href: "/admin",
          label: t.nav.dashboard,
          icon: <LayoutDashboard className={iconClass} />,
          perm: "dashboard.view",
          keywords: "dashboard statistika bosh sahifa",
        },
      ],
    },
    {
      key: "problems",
      label: t.nav.problems,
      icon: <Puzzle className={iconClass} />,
      items: [
        {
          href: "/admin/problems",
          label: t.nav.problems,
          icon: <Puzzle className={iconClass} />,
          matchPrefix: true,
          perm: "problems.view",
          keywords: "masala problem task",
        },
        {
          href: "/admin/test-cases",
          label: t.nav.testCases,
          icon: <FlaskConical className={iconClass} />,
          perm: "testcases.view",
          keywords: "test case sinov",
        },
        {
          href: "/admin/tags",
          label: t.nav.tags,
          icon: <Tags className={iconClass} />,
          perm: "tags.view",
          keywords: "teg tag kategoriya",
        },
        {
          href: "/admin/daily-challenge",
          label: t.nav.dailyChallenge,
          icon: <CalendarDays className={iconClass} />,
          perm: "problems.view",
          keywords: "kunlik daily challenge kalendar",
        },
      ],
    },
    {
      key: "judge",
      label: t.nav.judge,
      icon: <Activity className={iconClass} />,
      items: [
        {
          href: "/admin/submissions",
          label: t.nav.submissions,
          icon: <Activity className={iconClass} />,
          badgeKey: "queue",
          matchPrefix: true,
          perm: "submissions.view",
          keywords: "yuborish submission natija",
        },
        {
          href: "/admin/contests",
          label: t.nav.contests,
          icon: <Trophy className={iconClass} />,
          matchPrefix: true,
          perm: "contests.view",
          keywords: "musobaqa contest turnir",
        },
        {
          href: "/admin/judge0",
          label: "Judge0",
          icon: <Server className={iconClass} />,
          perm: "judge.view",
          keywords: "judge0 sozlama server kod bajarish",
        },
        {
          href: "/admin/judge-languages",
          label: t.nav.judgeLanguages,
          icon: <Terminal className={iconClass} />,
          perm: "judge.view",
          keywords: "til language python cpp javascript",
        },
      ],
    },
    {
      key: "people",
      label: t.nav.community,
      icon: <Users className={iconClass} />,
      items: [
        {
          href: "/admin/users",
          label: t.nav.users,
          icon: <Users className={iconClass} />,
          matchPrefix: true,
          perm: "users.view",
          keywords: "foydalanuvchi user huquq ruxsat rol",
        },
        {
          href: "/admin/groups",
          label: t.nav.groups,
          icon: <UsersRound className={iconClass} />,
          matchPrefix: true,
          perm: "groups.view",
          keywords: "guruh group sinf",
        },
        {
          href: "/admin/discussions",
          label: t.nav.discussions,
          icon: <MessagesSquare className={iconClass} />,
          perm: "content.view",
          keywords: "muhokama discussion forum",
        },
        {
          href: "/admin/comments",
          label: t.nav.comments,
          icon: <MessageSquare className={iconClass} />,
          perm: "content.view",
          keywords: "izoh comment",
        },
        {
          href: "/admin/reports",
          label: t.nav.reports,
          icon: <Flag className={iconClass} />,
          badgeKey: "reports",
          perm: "content.view",
          keywords: "shikoyat report",
        },
        {
          href: "/admin/contact-messages",
          label: t.nav.contactMessages,
          icon: <Mail className={iconClass} />,
          perm: "content.view",
          keywords: "xabar contact murojaat",
        },
      ],
    },
    {
      key: "publishing",
      label: t.nav.announcements,
      icon: <Megaphone className={iconClass} />,
      items: [
        {
          href: "/admin/announcements",
          label: t.nav.announcements,
          icon: <Bell className={iconClass} />,
          perm: "announcements.view",
          keywords: "e'lon announcement banner",
        },
      ],
    },
    {
      key: "system",
      label: t.nav.system,
      icon: <Settings className={iconClass} />,
      items: [
        {
          href: "/admin/plagiarism",
          label: t.nav.plagiarism,
          icon: <ShieldAlert className={iconClass} />,
          badgeKey: "plagiarism",
          matchPrefix: true,
          perm: "moderation.view",
          keywords: "plagiat plagiarism nusxa",
        },
        {
          href: "/admin/audit-log",
          label: t.nav.auditLog,
          icon: <ScrollText className={iconClass} />,
          perm: "audit.view",
          keywords: "audit log tarix jurnal",
        },
        {
          href: "/admin/trash",
          label: t.nav.trash,
          icon: <Trash2 className={iconClass} />,
          badgeKey: "trash",
          perm: "trash.view",
          keywords: "savat trash o'chirilgan",
        },
        {
          href: "/admin/sessions",
          label: t.nav.sessions,
          icon: <MonitorSmartphone className={iconClass} />,
          perm: "sessions.view",
          keywords: "sessiya session qurilma",
        },
        {
          href: "/admin/backups",
          label: t.nav.backups,
          icon: <DatabaseBackup className={iconClass} />,
          perm: "settings.backup",
          keywords: "zaxira backup nusxa",
        },
        {
          href: "/admin/settings",
          label: t.nav.settings,
          icon: <Settings className={iconClass} />,
          perm: "settings.view",
          keywords: "sozlama setting konfiguratsiya reyting daraja",
        },
      ],
    },
  ];
}

/** Menyudagi barcha bo'limlar tekis ro'yxat sifatida (qidiruv uchun). */
export function flatNav(t: Dictionary): (NavItem & { group: string })[] {
  return buildNav(t).flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label })),
  );
}

export const commandIcons = {
  problem: <Puzzle className="size-4" />,
  user: <Users className="size-4" />,
  contest: <Trophy className="size-4" />,
  article: <FileText className="size-4" />,
  page: <LayoutDashboard className="size-4" />,
  bookmark: <Bookmark className="size-4" />,
  metric: <Gauge className="size-4" />,
};

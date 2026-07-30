"use client";

import { useQuery } from "@tanstack/react-query";

import { publicApi } from "@/lib/public-api";

/**
 * Admin paneldan boshqariladigan ochiq sayt sozlamalari.
 *
 * Backendda `is_public=True` deb belgilangan qatorlargina keladi
 * (`GET /api/site/settings/`) — Judge0 tokeni kabi maxfiy kalitlar bu
 * javobga tushmaydi.
 *
 * Nega alohida hook: aloqa emaili va ijtimoiy tarmoq havolalari bir necha
 * sahifada kerak (futer, «Bog'lanish», huquqiy hujjatlar). Har birida
 * `useQuery` yozilsa, bir xil `queryKey` ni takrorlash va standart qiymatni
 * har joyda qaytarish kerak bo'lardi. Sozlamalar kamdan-kam o'zgargani
 * uchun javob uzoq muddat «yangi» hisoblanadi va sahifalar orasida
 * qayta so'ralmaydi.
 */

/** Sozlama kelmasa ishlatiladigan zaxira qiymatlar. */
const FALLBACK = {
  site_name: "CodeArena",
  site_email: "support@codearena.uz",
} as const;

export interface SiteSocialLink {
  key: string;
  label: string;
  url: string;
}

/** Futerda chiqadigan tartib — sozlamada to'ldirilganlari shu ketma-ketlikda. */
const SOCIAL_ORDER: { key: string; label: string }[] = [
  { key: "social_telegram", label: "Telegram" },
  { key: "social_instagram", label: "Instagram" },
  { key: "social_youtube", label: "YouTube" },
  { key: "social_github", label: "GitHub" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_facebook", label: "Facebook" },
  { key: "social_x", label: "X (Twitter)" },
];

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => publicApi.site.settings(),
    staleTime: 10 * 60_000,
    // Sozlama yetib kelmasa sayt ishlashda davom etsin — zaxira qiymat bor.
    retry: 1,
  });

  const values = data ?? {};

  const socials: SiteSocialLink[] = SOCIAL_ORDER.map(({ key, label }) => ({
    key,
    label,
    url: asString(values[key]),
  })).filter((row) => row.url.length > 0);

  return {
    siteName: asString(values.site_name) || FALLBACK.site_name,
    siteEmail: asString(values.site_email) || FALLBACK.site_email,
    socials,
  };
}

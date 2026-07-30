import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * `robots.txt` — qidiruv robotlari uchun.
 *
 * Admin panel, shaxsiy bo'limlar va autentifikatsiya sahifalari indeksdan
 * chiqariladi: ular bot uchun foydasiz va qidiruv natijalarida ko'rinmasligi
 * kerak.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/settings",
          "/notifications",
          "/bookmarks",
          "/submissions",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

import type { MetadataRoute } from "next";

import { SITE_URL, fetchMeta } from "@/lib/site";

/* ==========================================================================
   Sitemap
   --------------------------------------------------------------------------
   Statik bo'limlar + backenddagi ochiq yozuvlar (masala, musobaqa).
   Backend javob bermasa faqat statik ro'yxat chiqadi: sitemap hech qachon
   buildni to'xtatmasligi kerak.
   ========================================================================== */

type Row = { slug: string; updated_at?: string; created_at?: string };
type Page<T> = { results?: T[] };

const STATIC: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/problems", priority: 0.9, changeFrequency: "daily" },
  { path: "/courses", priority: 0.9, changeFrequency: "weekly" },
  { path: "/daily", priority: 0.8, changeFrequency: "daily" },
  { path: "/contests", priority: 0.8, changeFrequency: "daily" },
  { path: "/leaderboard", priority: 0.7, changeFrequency: "daily" },
  { path: "/discussions", priority: 0.6, changeFrequency: "daily" },
  { path: "/groups", priority: 0.4, changeFrequency: "weekly" },
  { path: "/help", priority: 0.4, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.3, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

async function collection(path: string, prefix: string, priority: number) {
  const data = await fetchMeta<Page<Row>>(`${path}?page_size=200`);
  return (data?.results ?? []).map((row) => ({
    url: `${SITE_URL}${prefix}/${row.slug}`,
    lastModified: new Date(row.updated_at ?? row.created_at ?? Date.now()),
    changeFrequency: "weekly" as const,
    priority,
  }));
}

/**
 * Kurslar va ularning mavzulari.
 *
 * Katalog sahifalanmagan massiv qaytaradi, mavzular esa faqat kurs
 * ichida ko'rinadi — shuning uchun har bir kurs uchun bitta qo'shimcha
 * so'rov ketadi. Kurslar soni o'nlab bo'lgani uchun bu qimmat emas, lekin
 * SEO uchun har bir mavzu alohida sahifa sifatida indekslanadi.
 */
async function courseUrls(now: Date): Promise<MetadataRoute.Sitemap> {
  const list = await fetchMeta<{ slug: string }[]>("/api/courses/");
  if (!list?.length) return [];

  const details = await Promise.all(
    list.map((row) =>
      fetchMeta<{ slug: string; modules?: { lessons?: { slug: string }[] }[] }>(
        `/api/courses/${row.slug}/`,
      ),
    ),
  );

  const urls: MetadataRoute.Sitemap = [];
  for (const course of details) {
    if (!course) continue;
    urls.push({
      url: `${SITE_URL}/courses/${course.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    // `module` nomi ataylab ishlatilmaydi — u Next buildida modul
    // tizimining o'zgaruvchisini soyalab qo'yadi.
    for (const section of course.modules ?? []) {
      for (const lesson of section.lessons ?? []) {
        urls.push({
          url: `${SITE_URL}/courses/${course.slug}/${lesson.slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  }
  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [problems, contests, courses] = await Promise.all([
    collection("/api/problems/", "/problems", 0.7),
    collection("/api/contests/", "/contests", 0.6),
    courseUrls(now),
  ]);

  return [
    ...STATIC.map((entry) => ({
      url: `${SITE_URL}${entry.path}`,
      lastModified: now,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
    ...problems,
    ...courses,
    ...contests,
  ];
}

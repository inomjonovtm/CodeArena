import type { Metadata } from "next";

import { fetchMeta, toDescription } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

/**
 * Kurs sarlavhasi backenddan olinadi (masala sahifasidagi kabi): sahifaning
 * o'zi klient komponenti, shuning uchun meta shu server layoutda hisoblanadi.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const course = await fetchMeta<{
    title_uz: string;
    subtitle_uz: string;
    description_uz: string;
    lesson_count: number;
  }>(`/api/courses/${encodeURIComponent(slug)}/`);

  if (!course) return { title: "Kurs" };

  const description =
    course.subtitle_uz ||
    toDescription(course.description_uz) ||
    `${course.lesson_count} ta mavzu, har birida misollar, test va kod topshiriqlari.`;

  return {
    title: course.title_uz,
    description,
    openGraph: { title: `${course.title_uz} · CodeArena`, description, type: "article" },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

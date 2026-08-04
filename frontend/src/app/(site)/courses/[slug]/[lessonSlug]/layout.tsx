import type { Metadata } from "next";

import { fetchMeta, toDescription } from "@/lib/site";

type Params = { params: Promise<{ slug: string; lessonSlug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const lesson = await fetchMeta<{
    title_uz: string;
    summary_uz: string;
    content_md: string;
    course_title: string;
  }>(`/api/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonSlug)}/`);

  if (!lesson) return { title: "Mavzu" };

  const description = lesson.summary_uz || toDescription(lesson.content_md);

  return {
    title: `${lesson.title_uz} — ${lesson.course_title}`,
    description,
    openGraph: {
      title: `${lesson.title_uz} · ${lesson.course_title}`,
      description,
      type: "article",
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

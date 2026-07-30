import type { Metadata } from "next";

import { fetchMeta, toDescription } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const contest = await fetchMeta<{
    title_uz: string;
    description_uz: string;
    problem_count: number;
    duration_minutes: number;
  }>(`/api/contests/${encodeURIComponent(slug)}/`);

  if (!contest) return { title: "Musobaqa" };

  return {
    // Ichki sahifa (musobaqa masalasi) ham "· CodeArena" bilan tugasin
    title: { default: contest.title_uz, template: "%s · CodeArena" },
    description:
      toDescription(contest.description_uz) ??
      `${contest.problem_count} ta masala, ${contest.duration_minutes} daqiqa. Ro'yxatdan o'ting va jonli natijalar jadvalida qatnashing.`,
    openGraph: { title: `${contest.title_uz} · CodeArena`, type: "website" },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

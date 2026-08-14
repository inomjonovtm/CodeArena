import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og";
import { fetchMeta, toDescription } from "@/lib/site";

export const alt = "CodeArena musobaqasi";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const contest = await fetchMeta<{
    title_uz: string;
    description_uz: string;
    problem_count: number;
    duration_minutes: number;
  }>(`/api/contests/${encodeURIComponent(slug)}/`);

  if (!contest) {
    return ogCard({ eyebrow: "Musobaqa", title: "CodeArena musobaqasi" });
  }

  const facts: string[] = [];
  if (contest.problem_count) facts.push(`${contest.problem_count} ta masala`);
  if (contest.duration_minutes) facts.push(`${contest.duration_minutes} daqiqa`);
  facts.push("Ishtirok bepul");

  return ogCard({
    eyebrow: "Musobaqa",
    title: contest.title_uz,
    subtitle: toDescription(contest.description_uz, 120),
    facts,
  });
}

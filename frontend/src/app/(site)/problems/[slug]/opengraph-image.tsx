import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og";
import { fetchMeta, toDescription } from "@/lib/site";

/* Masala havolasi ulashilganda karta masalaning O'ZI haqida gapiradi:
   nomi, darajasi, bahosi va qabul foizi. Umumiy brend rasmi o'rniga
   aniq ma'lumot — bosish ehtimoli shundan oshadi. */

export const alt = "CodeArena masalasi";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const LEVEL: Record<string, string> = { easy: "Oson", medium: "O'rta", hard: "Qiyin" };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const problem = await fetchMeta<{
    title_uz: string;
    description_uz: string;
    difficulty: string;
    points: number;
    acceptance_rate: number;
  }>(`/api/problems/${encodeURIComponent(slug)}/`);

  // Backend javob bermasa ham karta chiziladi — bo'sh rasm 404 dan yaxshi.
  if (!problem) {
    return ogCard({ eyebrow: "Masala", title: "CodeArena masalasi" });
  }

  const facts = [
    LEVEL[problem.difficulty] ?? problem.difficulty,
    `${problem.points} ball`,
  ];
  if (typeof problem.acceptance_rate === "number") {
    facts.push(`${Math.round(problem.acceptance_rate)}% qabul`);
  }

  return ogCard({
    eyebrow: "Masala",
    title: problem.title_uz,
    subtitle: toDescription(problem.description_uz, 120),
    facts,
  });
}

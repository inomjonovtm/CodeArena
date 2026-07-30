import type { Metadata } from "next";

import { fetchMeta, toDescription } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

/**
 * Masala sahifasining sarlavhasi backenddan olinadi.
 *
 * Sahifaning o'zi klient komponenti, ya'ni undan `metadata` eksport qilib
 * bo'lmaydi — shuning uchun meta shu server layoutda hisoblanadi. Backend
 * javob bermasa umumiy sarlavha qoladi, sahifa esa baribir ochiladi.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const problem = await fetchMeta<{
    title_uz: string;
    description_uz: string;
    difficulty: string;
    points: number;
  }>(`/api/problems/${encodeURIComponent(slug)}/`);

  if (!problem) return { title: "Masala" };

  const level =
    problem.difficulty === "easy" ? "Oson" : problem.difficulty === "medium" ? "O'rta" : "Qiyin";

  return {
    title: problem.title_uz,
    description:
      toDescription(problem.description_uz) ??
      `${level} darajadagi masala — ${problem.points} ball. Yeching va natijani darhol ko'ring.`,
    openGraph: {
      title: `${problem.title_uz} · CodeArena`,
      description: toDescription(problem.description_uz),
      type: "article",
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

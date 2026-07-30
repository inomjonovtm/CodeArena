import type { Metadata } from "next";

import { fetchMeta, toDescription } from "@/lib/site";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchMeta<{
    username: string;
    full_name: string;
    bio: string;
    rating: number;
    problems_solved: number;
  }>(`/api/users/${encodeURIComponent(username)}/`);

  if (!profile) return { title: `@${username}` };

  const name = profile.full_name || profile.username;

  return {
    title: `${name} (@${profile.username})`,
    description:
      toDescription(profile.bio) ??
      `${name} — reyting ${profile.rating}, yechilgan masalalar: ${profile.problems_solved}.`,
    openGraph: { title: `${name} · CodeArena`, type: "profile" },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

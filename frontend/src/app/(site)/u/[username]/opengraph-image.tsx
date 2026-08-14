import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og";
import { fetchMeta, toDescription } from "@/lib/site";

export const alt = "CodeArena profili";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await fetchMeta<{
    username: string;
    full_name: string;
    bio: string;
    rating: number;
    problems_solved: number;
  }>(`/api/users/${encodeURIComponent(username)}/`);

  if (!profile) {
    return ogCard({ eyebrow: "Profil", title: `@${username}` });
  }

  const facts: string[] = [`Reyting ${profile.rating}`];
  if (profile.problems_solved) facts.push(`${profile.problems_solved} ta yechim`);

  return ogCard({
    eyebrow: "Profil",
    title: profile.full_name || profile.username,
    subtitle: toDescription(profile.bio, 120) ?? `@${profile.username}`,
    facts,
  });
}

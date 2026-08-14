import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og";

/** Saytning umumiy ijtimoiy kartasi — bosh sahifa va meta merosxo'rlari. */
export const alt = "CodeArena — dasturlashni mashq bilan o'rganing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "Algoritmik mashq platformasi",
    title: "Kod yozing, darhol tekshiring va reytingingizni oshiring.",
    subtitle:
      "Yechim izolyatsiyalangan muhitda yashirin testlardan o'tadi. Musobaqalarda jonli natijalar taxtasi.",
    facts: ["Python", "JavaScript", "C++"],
  });
}

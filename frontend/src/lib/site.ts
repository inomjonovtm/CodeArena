/**
 * Saytning tashqi manzili — metama'lumot, sitemap va `robots.txt` uchun.
 *
 * Brauzerdagi so'rovlar nisbiy yo'ldan ketadi (`/api/...`), lekin serverda
 * yaratiladigan absolyut havolalar uchun to'liq manzil kerak. Produksiyada
 * `NEXT_PUBLIC_SITE_URL` ni domenga qo'ying.
 *
 * MUHIM: `??` emas, `||` ishlatiladi. Docker build argumenti berilib, lekin
 * BO'SH qolganda (`--build-arg NEXT_PUBLIC_SITE_URL=`) `??` bo'sh satrni
 * qabul qilardi va `new URL("")` butun buildni tushunarsiz `TypeError`
 * bilan to'xtatardi. Endi bo'sh qiymat "berilmagan" deb hisoblanadi;
 * ogohlantirish esa `next.config.mjs` da chiqadi.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/**
 * Serverdan backendga to'g'ridan-to'g'ri murojaat.
 *
 * `generateMetadata` brauzerda emas, Node'da ishlaydi — u yerda `/api/...`
 * nisbiy manzili mavjud emas, shuning uchun Django manzili to'liq beriladi.
 * Xatolik yuz bersa `null` qaytadi: sarlavha zaxira qiymat bilan chiqadi,
 * sahifa esa baribir ochiladi.
 */
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export async function fetchMeta<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json" },
      // Metama'lumot bir daqiqa keshlanadi — har bir bot so'roviga
      // backendga borish shart emas
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Tavsifni meta uchun qisqartiradi — Markdown belgilarisiz, bitta qator. */
export function toDescription(input: string | null | undefined, limit = 160): string | undefined {
  if (!input) return undefined;
  const flat = input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_>`~[\]()]/g, " ")
    .replace(/\s+/g, " ")
    // Markdown belgisi olib tashlangan joyda tinish belgisidan OLDIN bo'sh
    // joy qolardi: `**palindrommi?**` → "palindrommi ?". Qidiruv natijasida
    // va ijtimoiy kartada bu darhol ko'zga tashlanadi.
    .replace(/\s+([,.!?;:…])/g, "$1")
    .trim();
  if (!flat) return undefined;
  return flat.length > limit ? `${flat.slice(0, limit - 1).trimEnd()}…` : flat;
}

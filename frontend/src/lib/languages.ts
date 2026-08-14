import type { Language, LanguageMeta } from "./types";

/* ==========================================================================
   Tillar — interfeys uchun metama'lumot
   --------------------------------------------------------------------------
   Haqiqiy ro'yxat SERVERDA (`/api/judge/status/` → `catalog`): u yerda
   qaysi kompilyator haqiqatan o'rnatilgani ham ko'rinadi. Bu yerdagi
   ro'yxat esa ZAXIRA: server javob bermaguncha yoki umuman javob bermasa
   ham til tanlagichi bo'sh qolmasligi kerak.
   ========================================================================== */

export const LANGUAGE_LABEL: Record<Language, string> = {
  python: "Python 3",
  cpp: "C++ 17",
  c: "C 17",
  java: "Java 17",
  javascript: "JavaScript",
  typescript: "TypeScript",
  go: "Go",
  rust: "Rust",
  kotlin: "Kotlin",
  csharp: "C#",
  php: "PHP",
  ruby: "Ruby",
};

/** Serverdagi tartib bilan bir xil. */
export const LANGUAGE_ORDER: Language[] = [
  "python",
  "cpp",
  "c",
  "java",
  "javascript",
  "typescript",
  "go",
  "rust",
  "kotlin",
  "csharp",
  "php",
  "ruby",
];

/** Eskidan qolgan ustunlar (`starter_code_python` ...) shu uchta til uchun. */
export const LEGACY_STARTER_KEY: Partial<Record<Language, string>> = {
  python: "starter_code_python",
  javascript: "starter_code_javascript",
  cpp: "starter_code_cpp",
};

export const FALLBACK_CATALOG: LanguageMeta[] = LANGUAGE_ORDER.map((key) => ({
  key,
  label: LANGUAGE_LABEL[key],
  extension: key,
  monaco: key,
  starter: "",
  // Server javob bermaguncha hech narsani "o'chirilgan" deb ko'rsatmaymiz:
  // aks holda tanlagich bo'sh bo'lib qolardi.
  available: true,
}));

/**
 * Masala uchun boshlang'ich kodni topadi.
 *
 * Uch manba, shu tartibda: masalaning yangi `starter_code` xaritasi →
 * eskidan qolgan alohida ustun → tilning umumiy shabloni. Shu tufayli eski
 * masalalar ham, yangi tillar ham bo'sh muharrir bilan ochilmaydi.
 */
export function starterFor(
  problem: Record<string, unknown> | undefined,
  language: Language,
  catalog: LanguageMeta[],
): string {
  if (!problem) return "";

  const map = problem.starter_code as Record<string, string> | undefined;
  const fromMap = map?.[language];
  if (typeof fromMap === "string" && fromMap.trim()) return fromMap;

  const legacyKey = LEGACY_STARTER_KEY[language];
  const legacy = legacyKey ? problem[legacyKey] : undefined;
  if (typeof legacy === "string" && legacy.trim()) return legacy;

  return catalog.find((row) => row.key === language)?.starter ?? "";
}

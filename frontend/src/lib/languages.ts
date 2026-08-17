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

/** Haqiqiy fayl kengaytmalari — yuklab olishda `main.python` emas, `main.py`. */
const EXTENSION: Record<Language, string> = {
  python: "py",
  cpp: "cpp",
  c: "c",
  java: "java",
  javascript: "js",
  typescript: "ts",
  go: "go",
  rust: "rs",
  kotlin: "kt",
  csharp: "cs",
  php: "php",
  ruby: "rb",
};

/** Monaco muharriri tushunadigan til identifikatorlari. */
const MONACO_ID: Record<Language, string> = {
  python: "python",
  cpp: "cpp",
  c: "c",
  java: "java",
  javascript: "javascript",
  typescript: "typescript",
  go: "go",
  rust: "rust",
  kotlin: "kotlin",
  csharp: "csharp",
  php: "php",
  ruby: "ruby",
};

export const FALLBACK_CATALOG: LanguageMeta[] = LANGUAGE_ORDER.map((key) => ({
  key,
  label: LANGUAGE_LABEL[key],
  extension: EXTENSION[key],
  monaco: MONACO_ID[key],
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

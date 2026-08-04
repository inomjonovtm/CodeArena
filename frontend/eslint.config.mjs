/**
 * ESLint (flat config).
 *
 * Ilgari loyihada ESLint konfiguratsiyasi UMUMAN yo'q edi va
 * `next.config.mjs` da `eslint.ignoreDuringBuilds: true` turardi — ya'ni
 * lint hech qachon ishlamagan. Endi konfig bor va CI da alohida qadam
 * sifatida chaqiriladi.
 *
 * `eslint-config-next` hozircha faqat eski (eslintrc) formatda chiqadi,
 * shuning uchun `FlatCompat` orqali ulanadi.
 */
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      ".next/**",
      ".next-*/**",
      "node_modules/**",
      "coverage/**",
      // Monaco fayllari `node_modules` dan ko'chiriladi — bizning kod emas.
      "public/monaco/**",
      "public/sw.js",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Ishlatilmayotgan o'zgaruvchi — xato emas, ogohlantirish. Nom oldida
      // pastki chiziq bo'lsa (`_unused`) ataylab qoldirilgan deb hisoblanadi.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // `any` ba'zi joylarda (tashqi kutubxona tiplari) muqarrar —
      // buni to'sib qo'yish o'rniga ko'rinib tursin.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default config;

"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import { dictionaries, type Dictionary, type LocaleKey } from "@/i18n/dictionaries";

/* ==========================================================================
   Matnlar
   --------------------------------------------------------------------------
   Sayt BITTA tilda — o'zbekcha. Til almashtirgich, ikkinchi lug'at va
   avtomatik tarjima olib tashlangan: yarim tarjima qilingan interfeys
   umuman tarjimasizdan yomonroq ko'rinadi.

   Provayder shakli saqlangan (`t`, `fmt`, `locale`), shuning uchun ingliz
   tili keyinchalik qo'shilsa, ekranlarni qayta yozish shart emas — faqat
   shu fayl o'zgaradi.
   ========================================================================== */

interface I18nContextValue {
  /** Hozircha doim `"uz"` — ekranlardagi tekshiruvlar shu qiymatga qarab ishlaydi. */
  locale: LocaleKey;
  t: Dictionary;
  /** `t.validation.minLength` kabi shablonlarga qiymat qo'yish uchun. */
  fmt: (template: string, values: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const fmt = useCallback(
    (template: string, values: Record<string, string | number>) =>
      template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`)),
    [],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale: "uz", t: dictionaries.uz, fmt }),
    [fmt],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n I18nProvider ichida ishlatilishi kerak");
  return context;
}

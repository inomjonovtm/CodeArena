"use client";

import { LegalPage } from "@/components/site/legal-page";

/* Matn admin panelda: Tizim → Huquqiy sahifalar → «Foydalanish shartlari». */
export default function TermsPage() {
  return (
    <LegalPage
      slug="terms"
      intro="Quyidagi shartlar CodeArena platformasi va u orqali taqdim etiladigan barcha xizmatlarga taalluqli. Iltimos, ularni diqqat bilan o'qing — hisob yaratish orqali siz ularga rozilik bildirasiz."
    />
  );
}

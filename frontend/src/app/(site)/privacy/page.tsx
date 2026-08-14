"use client";

import { LegalPage } from "@/components/site/legal-page";

/* Matn admin panelda: Tizim → Huquqiy sahifalar → «Maxfiylik siyosati».
   Bu yerda faqat sahifa qobig'i qoladi. */
export default function PrivacyPage() {
  return (
    <LegalPage
      slug="privacy"
      intro="Bu hujjat CodeArena platformasida shaxsiy ma'lumotlaringiz qanday yig'ilishi, ishlatilishi va himoyalanishini tushuntiradi. Savolingiz bo'lsa, istalgan vaqtda biz bilan bog'lanishingiz mumkin."
    />
  );
}

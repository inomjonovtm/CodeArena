/* ==========================================================================
   "Asosiy kontentga o'tish"
   --------------------------------------------------------------------------
   Klaviatura bilan yuradigan foydalanuvchi har bir sahifada avval butun
   navigatsiyani (uchta ochiluvchi menyu, qidiruv, tema tugmasi, hisob
   menyusi) bosib o'tishga majbur edi — sahifadan sahifaga o'tganda bu har
   safar takrorlanardi.

   Havola odatda ko'rinmaydi va faqat Tab bosilganda panelning tepasidan
   chiqadi. WCAG 2.4.1 "Bypass Blocks".

   Ko'rinish qoidalari `globals.css` dagi `.skip-link` da — Tailwind'ning
   `sr-only` / `focus:not-sr-only` juftligi v4 da ishonchli emas.
   ========================================================================== */

/** `<main>` elementining identifikatori — havola shu yerga sakraydi. */
export const MAIN_ID = "content";

export function SkipLink() {
  return (
    <a href={`#${MAIN_ID}`} className="skip-link">
      Asosiy kontentga o&apos;tish
    </a>
  );
}

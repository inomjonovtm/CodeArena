import Script from "next/script";

/**
 * Cookie-siz analitika (Plausible yoki Umami).
 *
 * Nima uchun kerak: hozir foydalanuvchi qayerda tashlab ketayotgani,
 * qaysi sahifa ishlamayotgani haqida hech qanday ma'lumot yo'q — qarorlar
 * taxminga qurilyapti.
 *
 * Nima uchun Google Analytics emas: u cookie qo'yadi va shaxsiy ma'lumot
 * yig'adi, ya'ni rozilik oynasi (cookie banner) talab qilinadi. Plausible
 * va Umami cookie ishlatmaydi, shuning uchun banner kerak emas va sahifa
 * ochilishiga qo'shimcha to'siq qo'yilmaydi.
 *
 * Sozlanmagan bo'lsa (`NEXT_PUBLIC_ANALYTICS_SRC` bo'sh) — hech qanday
 * tashqi so'rov ketmaydi.
 */
export function Analytics() {
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  const websiteId = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID;

  if (!src) return null;

  return (
    <Script
      src={src}
      // Sahifa interaktiv bo'lgandan keyin — analitika hech qachon
      // saytning yuklanishini sekinlashtirmasligi kerak.
      strategy="afterInteractive"
      defer
      {...(domain ? { "data-domain": domain } : {})}
      {...(websiteId ? { "data-website-id": websiteId } : {})}
    />
  );
}

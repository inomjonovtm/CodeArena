/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const isDev = process.env.NODE_ENV !== "production";

/**
 * Analitika skripti (Plausible / Umami — ikkalasi ham cookie ishlatmaydi).
 * Manzil berilmasa hech narsa yuklanmaydi va CSP ham kengaymaydi.
 */
const ANALYTICS_SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC ?? "";
const analyticsOrigin = (() => {
  if (!ANALYTICS_SRC) return "";
  try {
    return new URL(ANALYTICS_SRC).origin;
  } catch {
    console.warn(`[csp] NEXT_PUBLIC_ANALYTICS_SRC noto'g'ri URL: ${ANALYTICS_SRC}`);
    return "";
  }
})();

/**
 * Content-Security-Policy.
 *
 * `'unsafe-inline'` script uchun ATAYLAB qoldirilgan: Next sahifa
 * hidratsiyasi uchun inline `<script>` bloklarini o'zi joylaydi. Ularni
 * nonce bilan almashtirish har bir sahifani DINAMIK render qilishga
 * majburlaydi (nonce har so'rovda boshqacha bo'lishi kerak), ya'ni statik
 * keshlash butunlay yo'qoladi. Shuning uchun:
 *
 *   - inline skriptga ruxsat bor, lekin TASHQI manbadan skript yuklash
 *     to'silgan (`script-src 'self'`) — bu ko'pchilik XSS zanjirini uzadi;
 *   - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` —
 *     ma'lumotni tashqariga oqizadigan klassik yo'llar yopiq;
 *   - `frame-ancestors 'none'` — clickjacking to'silgan.
 *
 * Monaco muharriri o'z serverimizdan yuklanadi (`public/monaco/vs`),
 * shuning uchun tashqi CDN'ga ruxsat kerak emas. Uning ishchi oqimlari
 * (worker) blob orqali yaratiladi.
 */
const csp = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    // `next dev` HMR va react-refresh uchun `eval` ishlatadi. Produksiya
    // buildida bu YO'Q — sozlama build paytida hal bo'ladi.
    isDev ? "'unsafe-eval'" : "",
    analyticsOrigin,
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  // Avatar Google hisobidan kelishi mumkin; `blob:` — rasm yuklashdagi
  // ko'rib chiqish (preview) uchun.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  ["connect-src 'self'", isDev ? "ws: http://localhost:*" : "", analyticsOrigin]
    .filter(Boolean)
    .join(" "),
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // HTTP orqali ochilganda brauzer buni e'tiborsiz qoldiradi, shuning uchun
  // har doim yuborish xavfsiz.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },

  // Tip tekshiruvi `next build` ichida ALOHIDA jarayonda ketadi va o'z heap'ini
  // oladi. Xotirasi cheklangan build muhitlarida (hosting platformalarining
  // konteynerlari) aynan shu jarayon "JavaScript heap out of memory" bilan
  // tushadi — kompilyatsiyaning o'zi muammosiz o'tgan bo'lsa ham.
  //
  // Tiplar baribir tekshiriladi: CI da alohida `npm run typecheck` qadami bor
  // va lokal `next build` ham bu bayroqsiz ishlaydi. Ya'ni bu yerda faqat
  // TAKRORIY tekshiruv o'chiriladi, nazorat yo'qolmaydi.
  ...(process.env.NEXT_SKIP_TYPE_CHECK === "1"
    ? { typescript: { ignoreBuildErrors: true } }
    : {}),

  // Statik sahifalarni yaratish bir nechta parallel worker'da ketadi va
  // har biri alohida xotira oladi. Tor muhitda ularni bittaga tushirish
  // buildni sekinlashtiradi, lekin OOM'dan saqlaydi.
  ...(process.env.NEXT_BUILD_CPUS
    ? { experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) } }
    : {}),

  // Dev server ishlab turganda `next build` bir xil `.next` katalogiga yozib,
  // sahifalarni topa olmay qolishi mumkin. `NEXT_DIST_DIR` bilan buildni
  // alohida katalogga yo'naltirish mumkin.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // `/api/...` yo'llaridagi oxirgi slash Next tomonidan olib tashlanmasligi
  // kerak — Django manzillari aynan slash bilan ro'yxatdan o'tgan.
  skipTrailingSlashRedirect: true,

  async headers() {
    return [
      {
        // `/api/` va `/media/` Django tomonidan beriladi (produksiyada
        // nginx to'g'ridan-to'g'ri uzatadi) — ular o'z headerlarini
        // qo'yadi, shuning uchun bu yerda faqat sayt sahifalari.
        source: "/((?!api/|media/).*)",
        headers: securityHeaders,
      },
      {
        // Monaco fayllari nomida versiya yo'q, lekin ular faqat build
        // bilan birga o'zgaradi — bir hafta keshlash xavfsiz.
        source: "/monaco/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ];
  },

  async rewrites() {
    // Brauzer `/api/...` ga so'rov yuboradi, Next uni Django backendga uzatadi.
    // Shu tufayli HttpOnly cookie same-origin bo'lib qoladi (12-bo'lim: xavfsizlik).
    //
    // Next `:path*` ga mos kelishdan oldin yo'l oxiridagi slashni normallashtirib
    // olib tashlaydi (`skipTrailingSlashRedirect` faqat brauzerga redirect
    // yubormaslikni bildiradi). Django manzillari esa slash bilan ro'yxatdan
    // o'tgan — shuning uchun uni manzilga qayta qo'shamiz. Backendda
    // `APPEND_SLASH = False`, ya'ni Django hech qachon 301 qaytarmaydi:
    // brauzer 301 ni doimiy keshlab, sahifani buzib qo'yishi mumkin edi.
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*/` },
      // Yuklangan fayllar (avatar, muqova) Django `MEDIA_ROOT` da turadi.
      // Ularsiz `/media/...` manzillari 404 beradi va profil rasmi
      // ko'rinmay qoladi. Produksiyada bu yo'lni nginx bevosita uzatadi
      // (`infra/nginx/app.conf`), lekin dev serverda proksi shu yerda kerak.
      { source: "/media/:path*", destination: `${API_URL}/media/:path*` },
    ];
  },
};

export default nextConfig;

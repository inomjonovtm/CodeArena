/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
      // (`infra/nginx.conf`), lekin dev serverda proksi shu yerda kerak.
      { source: "/media/:path*", destination: `${API_URL}/media/:path*` },
    ];
  },
};

export default nextConfig;

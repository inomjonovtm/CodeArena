import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Providers } from "@/components/providers";
import { themeInitScript } from "@/components/providers/theme-provider";

import "./globals.css";

/* ==========================================================================
   Shriftlar — bitta ovoz, bitta istisno
   --------------------------------------------------------------------------
   · Inter — HAMMASI. Sarlavha ham, interfeys ham, raqam ham. Ikkinchi
     sarlavha shrifti (ilgari Space Grotesk) tizimga xarakter bermay, ohangni
     ikkiga bo'lardi: sarlavha bir oilada, matn boshqasida "gapirardi".
     Yirik o'lchamdagi 700 og'irlik va zich harf oralig'i xarakterni
     shriftni almashtirmasdan beradi.
   · JetBrains Mono — faqat KOD. Muharrir, kod bloki, test chiqishi. Raqamlar
     endi Inter'ning `tabular-nums` xususiyati bilan tekislanadi, shuning
     uchun jadval ustunlari monoshriftsiz ham tik turadi.
   ========================================================================== */

/* O'zgaruvchi nomlari ataylab shrift nomidan olingan: `--font-sans` kabi
   umumiy nomlar Tailwind `@theme` chiqaradigan tokenlar bilan to'qnashadi. */
const sans = Inter({
  subsets: ["latin", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jet",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CodeArena",
    template: "%s · CodeArena",
  },
  description:
    "Masalalar yeching, musobaqalarda qatnashing va reytingingizni oshiring — Python, JavaScript va C++ da.",
  // `app/manifest.ts` dan beriladi — qurilmaga o'rnatish uchun
  manifest: "/manifest.webmanifest",
  applicationName: "CodeArena",
  appleWebApp: {
    capable: true,
    title: "CodeArena",
    // iOS'da holat paneli sayt foni bilan qo'shilib ketsin
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    // Kanvas ranglari — brauzer chrome sahifa foniga mos tushadi
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  // O'rnatilgan ilovada kontent ekranning to'liq maydonini egallasin
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <head>
        {/* Sahifa yuklanishida tema "miltillamasligi" uchun */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

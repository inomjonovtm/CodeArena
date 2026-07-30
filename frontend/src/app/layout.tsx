import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { Providers } from "@/components/providers";
import { themeInitScript } from "@/components/providers/theme-provider";

import "./globals.css";

/* ==========================================================================
   Shriftlar — uchta ovoz, uchta vazifa
   --------------------------------------------------------------------------
   Bitta shriftda qurilgan interfeys tekis eshitiladi: sarlavha ham, jadval
   ham, raqam ham bir xil ohangda gapiradi. Shu yerda uchta rol ajratilgan:

   · Space Grotesk — SARLAVHA. Tor apertura va o'ziga xos `a`/`g` harflari
     mahsulotga xarakter beradi; faqat yirik o'lchamda ishlatiladi.
   · Inter — INTERFEYS. Zich jadval, yorliq va uzun matnda eng o'qishli.
   · JetBrains Mono — RAQAM va KOD. Reyting, vaqt, foiz, ball — hammasi
     bir xil kenglikdagi raqamlarda, shuning uchun ustunlar tik turadi.
   ========================================================================== */

/* O'zgaruvchi nomlari ataylab shrift nomidan olingan: `--font-sans` kabi
   umumiy nomlar Tailwind `@theme` chiqaradigan tokenlar bilan to'qnashadi. */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

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
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
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
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
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

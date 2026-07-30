import type { MetadataRoute } from "next";

/**
 * PWA manifesti — `/manifest.webmanifest` sifatida beriladi.
 *
 * Shu fayl tufayli saytni telefon ekraniga o'rnatish mumkin bo'ladi va
 * brauzer push xabarlariga ruxsat so'rashga yo'l ochiladi: Chrome push
 * obunasini faqat service worker ro'yxatdan o'tgan sahifada beradi, o'rnatilgan
 * ilova ko'rinishi esa bildirishnomalarni tabiiy qiladi.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CodeArena — algoritmik masalalar platformasi",
    short_name: "CodeArena",
    description:
      "Masalalar yeching, musobaqalarda qatnashing va reytingingizni oshiring — Python, JavaScript va C++ da.",
    start_url: "/problems",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // Yuklanish ekrani sayt fonining o'zi bo'lsin — "miltillash" bo'lmaydi.
    // Qiymat `--canvas` (iliq qog'oz) bilan bir xil: eski yashil-qora
    // (#080b09) brend almashgandan keyin ham qolib ketgan edi va o'rnatilgan
    // ilova boshqa mahsulotdek ochilardi.
    background_color: "#f7f7f4",
    theme_color: "#f7f7f4",
    lang: "uz",
    dir: "ltr",
    categories: ["education", "productivity", "developer"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android ikonkani o'z shakliga qirqadi — bu variantda glif xavfsiz
      // zona ichida turadi va qirqilib ketmaydi
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Masalalar", url: "/problems" },
      { name: "Kunlik masala", url: "/daily" },
      { name: "Musobaqalar", url: "/contests" },
    ],
  };
}

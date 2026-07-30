"use client";

import { useEffect } from "react";

/**
 * `/sw.js` ni ro'yxatdan o'tkazadi — bu ikki narsani ochadi: brauzer push
 * xabarlari va saytni qurilmaga o'rnatish imkoniyati.
 *
 * Hech narsa render qilmaydi. Ro'yxatdan o'tkazish `load` dan keyinga
 * suriladi: sahifaning birinchi ochilishi bilan raqobatlashmasligi kerak.
 *
 * Service worker'da kesh mantig'i yo'q (`public/sw.js` dagi izohga qarang),
 * shuning uchun u sahifa yangilanishini eskirgan nusxa bilan almashtirib
 * qo'ymaydi.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // Ro'yxatdan o'tmasa sayt oddiy ishlashda davom etadi — faqat push
        // xabarlari mavjud bo'lmaydi.
        console.warn("Service worker ro'yxatdan o'tmadi:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

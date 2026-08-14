"use client";

import { useEffect, useState } from "react";

/* ==========================================================================
   Sahifa tepasidan siljidimi?
   --------------------------------------------------------------------------
   Yopishqoq panel sahifa tepasida turganda kontentdan AJRALMASLIGI kerak:
   u shu paytda sahifaning bir qismi, alohida qatlam emas. Foydalanuvchi
   pastga siljishi bilan esa panel kontent USTIGA chiqadi — mana shu paytda
   u chegara va yengil soya oladi. Bu dizayn tizimidagi "soya — javob,
   bezak emas" qoidasining aynan o'zi, faqat hover o'rniga siljishga.

   NEGA `scroll` HODISASI EMAS. `scroll` soniyasiga o'nlab marta uchraydi
   va har safar React holatini qo'zg'atish siljishni titratadi. Bu yerda
   sahifa boshiga 1px "kuzatuvchi" qo'yiladi va `IntersectionObserver`
   uni ko'zdan yo'qolganda BIR MARTA xabar beradi — hisob-kitob brauzerning
   kompozitor oqimida ketadi, asosiy oqim bo'sh qoladi.
   ========================================================================== */

export function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!sentinel) return;

    if (typeof IntersectionObserver === "undefined") {
      // Kuzatuvchi yo'q brauzerda panel doim ajralgan holatda tursin —
      // chegarasiz variant kontent bilan qo'shilib ketishidan xavfsizroq.
      setScrolled(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel]);

  /** `ref` — sahifaning eng tepasiga qo'yiladigan ko'rinmas 1px element. */
  return { scrolled, sentinelRef: setSentinel };
}

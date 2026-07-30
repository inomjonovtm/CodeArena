"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Matn maydonini kontentga qarab cho'zadi.
 *
 * Nima uchun kerak: uch qatorli qutiga uzun izoh yozish — foydalanuvchi
 * uchraydigan eng keng tarqalgan noqulaylik. Brauzerning "tortish" dastagi
 * esa sensorli ekranda umuman yo'q, sichqonchada ham ko'rinmaydi.
 *
 * Balandlik `scrollHeight` orqali o'lchanadi: avval `height: auto` qo'yiladi,
 * so'ng haqiqiy kontent balandligi. Bu tartibsiz ko'rinsa ham majburiy —
 * `auto` ga qaytarmasak, maydon faqat o'sardi va matn o'chirilganda
 * qisqarmasdi.
 *
 * `maxRows` dan keyin maydon to'xtaydi va ichida aylanadi: aks holda uzun
 * matn butun sahifani egallab, tasdiqlash tugmalarini pastga surib yuborardi.
 */
export function useAutoGrow<T extends HTMLTextAreaElement>({
  enabled = true,
  maxRows = 18,
  value,
  forwardedRef,
}: {
  enabled?: boolean;
  maxRows?: number;
  /** Nazorat qilinadigan qiymat — o'zgarganda qayta o'lchanadi */
  value?: unknown;
  forwardedRef?: React.Ref<T>;
}) {
  const innerRef = useRef<T | null>(null);

  const setRef = useCallback(
    (node: T | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<T | null>).current = node;
      }
    },
    [forwardedRef],
  );

  const resize = useCallback(() => {
    const node = innerRef.current;
    if (!node || !enabled) return;

    const styles = window.getComputedStyle(node);
    const line = parseFloat(styles.lineHeight) || 20;
    const chrome =
      parseFloat(styles.paddingTop) +
      parseFloat(styles.paddingBottom) +
      parseFloat(styles.borderTopWidth) +
      parseFloat(styles.borderBottomWidth);
    const max = line * maxRows + chrome;

    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, max)}px`;
    node.style.overflowY = node.scrollHeight > max ? "auto" : "hidden";
  }, [enabled, maxRows]);

  // Boshlang'ich qiymat (tahrirlash formasi) ham to'g'ri balandlikda ochilsin
  useLayoutEffect(resize, [resize, value]);

  // Oyna kengligi o'zgarsa qatorlar soni ham o'zgaradi
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [enabled, resize]);

  return { setRef, resize };
}

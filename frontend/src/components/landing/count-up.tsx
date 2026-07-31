"use client";

import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   Raqamning "sanalishi"
   --------------------------------------------------------------------------
   Statistik raqam sahifaga kirganda 0 dan haqiqiy qiymatgacha sanaydi.
   Ikki qoida:

   · Faqat KO'RINGANDA boshlanadi. Sahifa tepasida sanalib bo'lgan raqam
     foydalanuvchi pastga tushganda allaqachon tugagan bo'lardi — animatsiya
     bekorga sarflanadi.
   · `prefers-reduced-motion` yoqilgan bo'lsa raqam darhol oxirgi qiymatda
     turadi. Harakatga sezgir foydalanuvchi uchun sanalayotgan raqam eng
     bezovta qiluvchi elementlardan biri.
   ========================================================================== */

/** Element ko'rinish maydoniga kirganini bir marta kuzatadi. */
export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, threshold]);

  return { ref, inView };
}

/** 0 → `target`, easeOutCubic bilan (oxiriga borib sekinlashadi). */
export function useCountUp(target: number, active: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = window.requestAnimationFrame(step);
    };

    frameRef.current = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [target, active, duration]);

  return value;
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { publicApi } from "@/lib/public-api";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Sahnadagi jonli metrikalar — raqam nolddan haqiqiy qiymatgacha sanaydi.
 *
 * Raqamlar backenddan keladi. Ma'lumot kelmasa blok umuman ko'rsatilmaydi:
 * bosh sahifada o'ylab topilgan statistika turishi — eng arzon va eng
 * zararli yolg'on.
 */

/** Ko'rinishga kirganda 0 dan `target` gacha sanaydi. */
function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const duration = 1100;
    let start = 0;

    const step = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic — oxiriga borib sekinlashadi, "to'xtab qoldi" hissi bo'lmaydi
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = window.requestAnimationFrame(step);
    };

    frameRef.current = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [target, active]);

  return value;
}

function Metric({ label, value, hint, active }: {
  label: string;
  value: number;
  hint: string;
  active: boolean;
}) {
  const shown = useCountUp(value, active);
  return (
    <div className="min-w-0 px-5 py-6 first:pl-0">
      <p className="t-eyebrow truncate text-[var(--stage-ink-3)]">{label}</p>
      <p className="t-metric t-num mt-3 text-[var(--stage-ink)]">{formatNumber(shown)}</p>
      <p className="t-meta mt-1 truncate text-[var(--stage-ink-3)]">{hint}</p>
    </div>
  );
}

export function StageStats({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  const { data } = useQuery({
    queryKey: ["site-stats"],
    queryFn: () => publicApi.site.stats(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  /* `data` bog'liqliklarda turishi SHART: ma'lumot kelmaguncha komponent
     `null` qaytaradi, ya'ni `ref` hali DOM'ga ulanmagan bo'ladi. Bo'sh
     bog'liqlik bilan effekt faqat bir marta — hali tugun yo'q paytda —
     ishlab, kuzatuvchi hech qachon o'rnatilmasdi va raqamlar 0 da qotib
     qolardi. */
  useEffect(() => {
    const node = ref.current;
    if (!node || active) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [data, active]);

  if (!data) return null;

  const items = [
    { label: "Masalalar", value: data.problems, hint: "amaliyot va musobaqa" },
    { label: "Yechimlar", value: data.submissions, hint: "avtomatik tekshirilgan" },
    { label: "Foydalanuvchilar", value: data.users, hint: "Elo reyting bilan" },
    { label: "Musobaqalar", value: data.contests, hint: "jonli leaderboard" },
  ];

  return (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-2 divide-[var(--stage-edge)] sm:grid-cols-4 sm:divide-x",
        className,
      )}
    >
      {items.map((item) => (
        <Metric key={item.label} {...item} active={active} />
      ))}
    </div>
  );
}

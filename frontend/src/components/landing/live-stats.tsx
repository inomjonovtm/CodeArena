"use client";

import { useQuery } from "@tanstack/react-query";

import { publicApi } from "@/lib/public-api";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Bosh sahifadagi jonli raqamlar — kanvasda turgan lenta, karta emas.
 *
 * Kartaga solingan statistika sahifadagi boshqa bloklar bilan bir xil
 * og'irlikda ko'rinadi. Bu yerda esa faqat yuqori va pastdagi soch chizig'i
 * va ustunlar orasidagi vertikal chiziq — raqamlar o'zi gapiradi.
 *
 * Ma'lumot kelmaguncha (yoki backend yopiq bo'lsa) blok umuman
 * ko'rsatilmaydi — o'ylab topilgan raqamlar chiqmasligi uchun.
 */
export function LiveStats({ className }: { className?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["site-stats"],
    queryFn: () => publicApi.site.stats(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (isLoading) {
    // Skelet haqiqiy lentaning shaklini takrorlaydi
    return (
      <div className={cn("grid grid-cols-2 border-y border-[var(--edge)] sm:grid-cols-4", className)}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn("min-w-0 px-5 py-6", index > 0 && "border-l border-[var(--edge)]")}
          >
            <div className="loading-block h-2.5 w-20 rounded-[3px]" />
            <div className="loading-block mt-3.5 h-7 w-16 rounded-[4px]" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const items = [
    { label: "Masala", value: formatNumber(data.problems) },
    { label: "Foydalanuvchi", value: formatNumber(data.users) },
    { label: "Yuborilgan yechim", value: formatNumber(data.submissions) },
    { label: "Musobaqa", value: formatNumber(data.contests) },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 border-y border-[var(--edge)] sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 border-[var(--edge)] px-5 py-6",
            // Mobil: 2 ustun — ikkinchi ustunda chap chiziq, ikkinchi qatorda ustki
            index % 2 === 1 && "border-l",
            index > 1 && "border-t",
            // Keng ekran: 4 ustun — birinchisidan boshqa hammasida chap chiziq
            "sm:border-t-0 sm:border-l sm:first:border-l-0",
          )}
        >
          <p className="t-eyebrow truncate">{item.label}</p>
          <p className="t-metric mt-3 text-[var(--ink)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

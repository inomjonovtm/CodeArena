"use client";

import { cn } from "@/lib/utils";

export interface MarqueeItem {
  label: string;
  icon: React.ReactNode;
}

/**
 * Cheksiz gorizontal aylanuvchi qator — iliq qog'ozda oq chiplar.
 * Ro'yxat ikki marta chiziladi va trek yarmiga suriladi, shuning uchun
 * ulanish joyi ko'rinmaydi. Sichqoncha ustiga kelganda to'xtaydi.
 */
export function Marquee({
  items,
  direction = "left",
  duration = 46,
  className,
}: {
  items: MarqueeItem[];
  direction?: "left" | "right";
  /** To'liq aylanish davri (sekund). */
  duration?: number;
  className?: string;
}) {
  return (
    <div className={cn("marquee-row marquee-mask overflow-hidden", className)}>
      <div
        className="marquee-track gap-3"
        data-direction={direction}
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-3 pr-3" aria-hidden={copy === 1}>
            {items.map((item) => (
              <span
                key={`${copy}-${item.label}`}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-[var(--r-chip)]",
                  "border border-[var(--edge)] bg-[var(--pane)] px-4 py-2.5",
                )}
              >
                <span className="text-[var(--ink-4)] [&_svg]:size-4">{item.icon}</span>
                <span className="text-[13px] font-medium text-[var(--ink-2)]">{item.label}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

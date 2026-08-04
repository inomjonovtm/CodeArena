"use client";

import { Check } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Mavzu bo'limlari — bosqichli tab paneli
   --------------------------------------------------------------------------
   Ilgari nazariya, misollar, test va topshiriqlar bitta uzun ustunda ketma-ket
   turardi. Uzun mavzuda bu ikki narsani buzardi: (1) topshiriqqa yetish uchun
   butun matnni aylantirib o'tish kerak edi, (2) «qayerdaman va yana nima
   qoldi» degan savolga sahifa javob bermasdi.

   Bu panel ularni BOSQICHGA aylantiradi. Har bir bo'lim raqamlangan, soni
   ko'rsatilgan va bajarilgani belgi bilan ajraladi — ya'ni panelning o'zi
   progressni ko'rsatadigan xarita. Pastdagi chiziq faol bo'limni belgilaydi
   va u siljib boradi: ko'z qayerdan qayerga o'tganini kuzatadi.

   Nega `Segmented` emas: u filtrlar uchun ixcham tanlagich (bir qatorli
   matn). Bu yerda har bir element uch xil ma'lumot tashiydi — tartib raqami,
   nom va holat — hamda sahifaning asosiy navigatsiyasi bo'lib turadi.
   ========================================================================== */

export interface LessonTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Yonida turadigan son — misollar/savollar/topshiriqlar soni */
  count?: number;
  /** Bo'lim bajarilgan (belgi qo'yiladi) */
  done?: boolean;
}

export function LessonTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: LessonTab[];
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const [line, setLine] = useState<{ left: number; width: number } | null>(null);

  // Chiziq bo'yoqdan OLDIN joyiga qo'yiladi — aks holda birinchi renderda
  // chapdan siljib kelayotgani ko'rinib qolardi.
  useLayoutEffect(() => {
    const active = itemRefs.current.get(value);
    const track = trackRef.current;
    if (!active) return;
    setLine({ left: active.offsetLeft, width: active.offsetWidth });

    // Tor ekranda panel suriladi. Bo'lim pastdagi «Keyingi bo'lim» tugmasi
    // bilan almashsa, faol yorliq ko'rish maydonidan chetda qolishi mumkin
    // edi — ya'ni qayerdaligi ko'rinmasdi. Faqat GORIZONTAL surilish
    // o'zgartiriladi: `scrollIntoView` sahifani tikka ham siljitib yuborardi.
    //
    // Surilish ATAYLAB bir zumda (`smooth` emas): sahifa ayni damda silliq
    // aylanmoqda va brauzer ikkinchi silliq surilishni bekor qiladi —
    // natijada yorliq umuman siljimay qolardi. Bu esa vertikal harakat
    // ostida sodir bo'ladi, shuning uchun sakragani ko'zga tashlanmaydi.
    if (!track) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    const pad = 12;
    if (left < track.scrollLeft) {
      track.scrollLeft = Math.max(0, left - pad);
    } else if (right > track.scrollLeft + track.clientWidth) {
      track.scrollLeft = right - track.clientWidth + pad;
    }
  }, [value, tabs.length]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label="Mavzu bo'limlari"
      className={cn(
        "relative -mx-1 flex items-stretch gap-1 overflow-x-auto px-1",
        "border-b border-[var(--edge)]",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            ref={(node) => {
              if (node) itemRefs.current.set(tab.key, node);
              else itemRefs.current.delete(tab.key);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              "focus-ring group relative flex shrink-0 items-center gap-2.5 rounded-t-[var(--r-ctl)]",
              "px-3.5 py-3 text-left whitespace-nowrap",
              "transition-colors duration-[var(--t-fast)]",
              active ? "text-[var(--ink)]" : "text-[var(--ink-3)] hover:text-[var(--ink-2)]",
            )}
          >
            {/* Tartib raqami yoki bajarilgan belgisi — bo'lim holati shu
                yerda, yorliqni uzaytirmasdan ko'rinadi */}
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                "transition-colors duration-[var(--t-fast)]",
                tab.done
                  ? "bg-[var(--ok)] text-[var(--canvas)]"
                  : active
                    ? "bg-[var(--brand)] text-[var(--ink-on-brand)]"
                    : "border border-[var(--edge-strong)] text-[var(--ink-4)]",
              )}
            >
              {tab.done ? <Check className="size-3" strokeWidth={4} /> : index + 1}
            </span>

            <span className="flex items-center gap-1.5">
              <span className={cn("text-[14px]", active ? "font-semibold" : "font-medium")}>
                {tab.label}
              </span>
              {tab.count ? (
                <span className="t-num text-[12px] text-[var(--ink-4)]">{tab.count}</span>
              ) : null}
            </span>
          </button>
        );
      })}

      {/* Faol bo'lim chizig'i — chegara ustida turadi va siljiydi */}
      {line ? (
        <span
          aria-hidden
          className={cn(
            "absolute -bottom-px h-[2px] rounded-full bg-[var(--brand)]",
            "transition-[left,width] duration-[var(--t-base)] ease-[var(--ease-snap)]",
          )}
          style={{ left: line.left, width: line.width }}
        />
      ) : null}
    </div>
  );
}

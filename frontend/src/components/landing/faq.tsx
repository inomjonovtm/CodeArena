"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Bir vaqtda bitta savol ochiq turadigan akkordeon.
 *
 * Har bir savol alohida kartada EMAS — bu bitta ro'yxat, savollar orasida
 * ingichka kulrang chiziq. Sakkizta karta sahifada sakkizta chegara demak,
 * savollar esa bir turkumga tegishli: ular birga o'qiladi.
 *
 * Ochiq savolning uch belgisi bor: matni KO'K, chap qirrasida ko'k vertikal
 * chiziq va o'ngdagi "+" 45 gradusga burilib "×" ga aylanadi. Javob esa
 * pastga ochiladi (grid 0fr → 1fr, 300ms).
 */
export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState(0);
  const baseId = useId();

  return (
    <div className="border-t border-[var(--edge)]">
      {items.map((item, index) => {
        const isOpen = index === open;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.question} className="relative border-b border-[var(--edge)]">
            {/* Chap qirradagi ko'k chiziq — faqat ochiq savolda */}
            <span
              aria-hidden
              className={cn(
                "absolute top-0 left-0 w-[3px] rounded-full bg-[var(--brand)]",
                "transition-[height,opacity] duration-[var(--t-slow)] ease-[var(--ease-snap)]",
                isOpen ? "h-full opacity-100" : "h-0 opacity-0",
              )}
            />

            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : index)}
                className="focus-ring group flex w-full items-start gap-5 py-7 pl-6 text-left"
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[18px] font-semibold",
                    "transition-colors duration-[var(--t-base)]",
                    isOpen
                      ? "text-[var(--brand)]"
                      : "text-[var(--ink)] group-hover:text-[var(--brand)]",
                  )}
                >
                  {item.question}
                </span>
                <Plus
                  className={cn(
                    "mt-1 size-5 shrink-0",
                    "transition-[transform,color] duration-[var(--t-slow)] ease-[var(--ease-snap)]",
                    isOpen ? "rotate-45 text-[var(--brand)]" : "text-[var(--ink-3)]",
                  )}
                />
              </button>
            </h3>

            {/* Balandlik animatsiyasi — grid 0fr → 1fr */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid transition-[grid-template-rows] duration-[var(--t-slow)] ease-[var(--ease-soft)]",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pr-10 pb-8 pl-6 text-[16px] leading-[1.7] text-[var(--ink-2)]">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

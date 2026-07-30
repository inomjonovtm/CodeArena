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
 * soch chizig'i. Sakkizta karta sahifada sakkizta chegara demak, savollar
 * esa bir turkumga tegishli: ular birga o'qiladi.
 *
 * Tartib raqami monoshriftda chapda turadi — ro'yxat sanab o'tilgan, ya'ni
 * uzunligi ko'rinadi va foydalanuvchi qayerda turganini biladi.
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
          <div key={item.question} className="border-b border-[var(--edge)]">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : index)}
                className="focus-ring group flex w-full items-start gap-4 py-5 text-left"
              >
                <span
                  className={cn(
                    "t-num mt-0.5 w-6 shrink-0 text-[12px] font-medium transition-colors",
                    isOpen ? "text-[var(--brand)]" : "text-[var(--ink-4)]",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[15.5px] font-medium transition-colors duration-[var(--t-fast)]",
                    isOpen
                      ? "text-[var(--ink)]"
                      : "text-[var(--ink-2)] group-hover:text-[var(--ink)]",
                  )}
                >
                  {item.question}
                </span>
                <Plus
                  className={cn(
                    "mt-1 size-4 shrink-0 transition-transform duration-[var(--t-base)] ease-[var(--ease-snap)]",
                    isOpen ? "rotate-45 text-[var(--brand)]" : "text-[var(--ink-4)]",
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
                {/* Javob savol matni bilan bir chiziqda boshlanadi */}
                <p className="t-body max-w-2xl pb-6 pl-10 text-[var(--ink-3)]">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

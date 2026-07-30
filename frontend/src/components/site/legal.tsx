"use client";

import { useEffect, useState } from "react";

import { Divider, Pane } from "@/components/kit";
import { cn, formatDate } from "@/lib/utils";

export interface LegalSection {
  title: string;
  body: string[];
}

/**
 * Ekranda ko'rinib turgan bo'limni kuzatadi — mundarijada faol qatorni
 * belgilash uchun. `rootMargin` tepadan qobiq balandligini, pastdan esa
 * ekranning uchdan ikkisini kesadi: shu tufayli "faol" bo'lim doim
 * o'qilayotgan joyga to'g'ri keladi.
 */
function useActiveSection(count: number): number {
  const [active, setActive] = useState(1);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Bir vaqtda bir nechta bo'lim ko'rinsa — eng yuqoridagisi faol
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const index = Number(visible.target.id.replace("section-", ""));
        if (Number.isFinite(index) && index > 0) setActive(index);
      },
      { rootMargin: "-88px 0px -66% 0px" },
    );

    for (let index = 1; index <= count; index += 1) {
      const node = document.getElementById(`section-${index}`);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [count]);

  return active;
}

/**
 * Huquqiy hujjatlar uchun umumiy tartib.
 *
 * Uch karta: mundarija, kirish va matnning o'zi. Uzun matn bitta oq varaqda
 * qoladi — har bir bo'limni alohida kartaga solish o'qishni uzib qo'yardi.
 * Mundarija katta ekranda o'ngda yopishib turadi, mobilda matndan oldin chiqadi.
 */
export function LegalDocument({
  updatedAt,
  intro,
  sections,
}: {
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}) {
  const active = useActiveSection(sections.length);

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
      {/* --------------------------------------------------- mundarija kartasi */}
      <aside className="order-1 w-full shrink-0 lg:sticky lg:top-[calc(var(--bar)+16px)] lg:order-2 lg:w-64">
        <nav aria-label="Mundarija" className="pane enter rounded-[var(--r-pane)] p-4">
          <p className="t-eyebrow px-2.5">Mundarija</p>

          <ol className="mt-2 flex flex-col gap-0.5">
            {sections.map((section, index) => {
              const number = index + 1;
              const current = number === active;
              return (
                <li key={section.title}>
                  <a
                    href={`#section-${number}`}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "focus-ring flex gap-2 rounded-[var(--r-ctl)] px-2.5 py-1.5 text-[13px]",
                      "transition-colors duration-[var(--t-fast)]",
                      current
                        ? "bg-[var(--brand-wash)] font-medium text-[var(--brand-ink)]"
                        : "text-[var(--ink-3)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
                    )}
                  >
                    <span
                      className={cn(
                        "t-num shrink-0",
                        current ? "text-[var(--brand)]" : "text-[var(--ink-4)]",
                      )}
                    >
                      {number}
                    </span>
                    <span className="min-w-0">{section.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>

          <Divider className="my-3" />

          <p className="t-meta px-2.5 text-[var(--ink-4)]">
            Oxirgi yangilanish:{" "}
            <span className="t-num text-[var(--ink-2)]">{formatDate(updatedAt, false)}</span>
          </p>
        </nav>
      </aside>

      {/* --------------------------------------------------------------- matn */}
      <div className="order-2 flex min-w-0 flex-1 flex-col gap-5 lg:order-1">
        {/* Kirish — yetakchi karta */}
        <Pane inset="lg" className="enter">
          <p className="t-body text-[var(--ink-2)]">{intro}</p>
        </Pane>

        {/* Butun matn bitta oq varaqda — o'qish oqimi uzilmasin */}
        <Pane inset="lg" className="sm:p-9">
          <div className="enter-stagger flex flex-col gap-9">
            {sections.map((section, index) => (
              <section
                key={section.title}
                id={`section-${index + 1}`}
                className="scroll-mt-[calc(var(--bar)+24px)]"
              >
                <h2 className="t-section flex gap-2.5 text-[var(--ink)]">
                  <span className="t-num shrink-0 text-[var(--brand)]">{index + 1}.</span>
                  <span className="min-w-0">{section.title}</span>
                </h2>

                <div className="prose-ca mt-2">
                  {section.body.map((paragraph, pIndex) => (
                    <p key={pIndex} className="text-[var(--ink-2)]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Pane>
      </div>
    </div>
  );
}

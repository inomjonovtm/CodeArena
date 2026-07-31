"use client";

import { useEffect, useState } from "react";

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
      { rootMargin: "-100px 0px -66% 0px" },
    );

    for (let index = 1; index <= count; index += 1) {
      const node = document.getElementById(`section-${index}`);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [count]);

  return active;
}

/* ==========================================================================
   Huquqiy hujjatlar uchun umumiy tartib
   --------------------------------------------------------------------------
   Bu sahifalarda MATN ustuvor, shuning uchun u kartaga solinmaydi: matn
   to'g'ridan-to'g'ri oq varaqda turadi, xuddi bosma hujjatdagidek. Karta
   ichidagi uzun matn ikki chegara orasida siqilib, o'qishni og'irlashtiradi.

   Ustun kengligi ~68 belgi bilan cheklangan — bu ko'z bir qatordan
   ikkinchisiga adashmasdan o'tadigan maksimal kenglik.

   O'ngda yopishqoq mundarija: qaysi bo'lim o'qilayotgani ko'k rang va chap
   qirradagi chiziq bilan belgilanadi.
   ========================================================================== */

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
    <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
      {/* --------------------------------------------------------- mundarija */}
      <aside className="order-1 w-full shrink-0 lg:sticky lg:top-[calc(var(--bar)+32px)] lg:order-2 lg:w-64">
        <nav aria-label="Mundarija" className="enter border-t border-[var(--edge)] pt-6">
          <p className="t-eyebrow">Mundarija</p>

          <ol className="mt-5 flex flex-col">
            {sections.map((section, index) => {
              const number = index + 1;
              const current = number === active;
              return (
                <li key={section.title}>
                  <a
                    href={`#section-${number}`}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "focus-ring flex gap-3 border-l-2 py-2 pl-4 text-[14px]",
                      "transition-colors duration-[var(--t-fast)]",
                      current
                        ? "border-[var(--brand)] font-semibold text-[var(--brand)]"
                        : "border-transparent text-[var(--ink-3)] hover:text-[var(--brand)]",
                    )}
                  >
                    <span className="t-num shrink-0">{number}</span>
                    <span className="min-w-0">{section.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>

          <p className="mt-6 border-t border-[var(--edge)] pt-5 text-[13px] text-[var(--ink-3)]">
            Oxirgi yangilanish:{" "}
            <span className="t-num font-semibold text-[var(--ink)]">
              {formatDate(updatedAt, false)}
            </span>
          </p>
        </nav>
      </aside>

      {/* --------------------------------------------------------------- matn */}
      <div className="order-2 min-w-0 flex-1 lg:order-1">
        {/* Kirish — qolgan matndan yirikroq, "yetakchi paragraf" */}
        <p className="enter max-w-[68ch] border-l-2 border-[var(--brand)] pl-6 text-[19px] leading-[1.6] text-[var(--ink-2)]">
          {intro}
        </p>

        <div className="enter-stagger mt-16 flex flex-col gap-14">
          {sections.map((section, index) => (
            <section
              key={section.title}
              id={`section-${index + 1}`}
              className="max-w-[68ch] scroll-mt-[calc(var(--bar)+32px)]"
            >
              <h2 className="flex gap-3 text-[24px] leading-[1.3] font-bold text-[var(--ink)]">
                <span className="t-num shrink-0 text-[var(--brand)]">{index + 1}.</span>
                <span className="min-w-0">{section.title}</span>
              </h2>

              <div className="mt-4 flex flex-col gap-4">
                {section.body.map((paragraph, pIndex) => (
                  <p key={pIndex} className="text-[16px] leading-[1.7] text-[var(--ink-2)]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

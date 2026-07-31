"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/* ==========================================================================
   Foydalanuvchi sharhlari
   --------------------------------------------------------------------------
   DIQQAT — bu yerdagi matnlar SHABLON, haqiqiy sharh emas.

   Men o'ylab topilgan sharh yozmadim: nomi va lavozimi bilan keltirilgan
   soxta iqtibos — bu foydalanuvchini aldash. Bo'lim dizayn tizimiga muvofiq
   to'liq qurilgan, faqat `TESTIMONIALS` massivini haqiqiy sharhlar bilan
   almashtirish kerak.

   Massiv bo'sh bo'lsa bo'lim umuman ko'rsatilmaydi — ya'ni sharhlar
   yig'ilmaguncha uni bitta qator bilan o'chirib turish mumkin.

   Ko'rinish: yirik yarim shaffof KO'K tirnoq belgisi, katta sharh matni,
   doira shaklidagi rasm o'rni, pastda nuqtali navigatsiya. Sharh almashganda
   fade (400ms).
   ========================================================================== */

type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "[Shablon] Bu yerga haqiqiy foydalanuvchining sharhi yoziladi — u platformadan qanday foydalangani va nimaga erishgani haqida ikki-uch jumla.",
    name: "Ism Familiya",
    role: "Lavozim · Tashkilot",
  },
  {
    quote:
      "[Shablon] Ikkinchi sharh. Aniq tafsilot bo'lgani yaxshi: qancha masala yechgani, qaysi musobaqada qatnashgani yoki reytingi qanday o'zgargani.",
    name: "Ism Familiya",
    role: "Lavozim · Tashkilot",
  },
  {
    quote:
      "[Shablon] Uchinchi sharh. Sharhlar soni uchtadan ko'p bo'lsa, pastdagi nuqtalar avtomatik ko'payadi.",
    name: "Ism Familiya",
    role: "Lavozim · Tashkilot",
  },
];

export function Testimonials({ items = TESTIMONIALS }: { items?: Testimonial[] }) {
  const [active, setActive] = useState(0);

  if (!items.length) return null;
  const current = items[Math.min(active, items.length - 1)];

  return (
    <section className="band bg-[var(--canvas-deep)]">
      <div className="shell">
        <Reveal className="mx-auto max-w-3xl">
          {/* Dekorativ tirnoq — yarim shaffof ko'k, matn ortida turadi */}
          <span
            aria-hidden
            className="block text-[120px] leading-[0.6] font-bold text-[var(--brand)] opacity-20 select-none"
          >
            &ldquo;
          </span>

          {/* Sharh almashganda `key` o'zgaradi — blok qaytadan o'rnatiladi
              va fade animatsiyasi qayta ishga tushadi. */}
          <blockquote key={active} className="animate-fade-in mt-2">
            <p className="text-[clamp(1.375rem,1.1rem+1.1vw,1.75rem)] leading-[1.45] font-medium text-[var(--ink)]">
              {current.quote}
            </p>

            <footer className="mt-8 flex items-center gap-4">
              {/* Rasm o'rni — doira. Haqiqiy rasm qo'shilganda shu yerga
                  `<img>` qo'yiladi, o'lcham va shakl o'zgarmaydi. */}
              <span
                aria-hidden
                className="grid size-14 shrink-0 place-items-center rounded-full border border-[var(--edge)] bg-[var(--pane)] text-[16px] font-bold text-[var(--ink-4)]"
              >
                {current.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-[var(--ink)]">{current.name}</p>
                <p className="mt-0.5 text-[14px] text-[var(--ink-3)]">{current.role}</p>
              </div>
            </footer>
          </blockquote>

          {/* Nuqtali navigatsiya — faol nuqta ko'k va kengroq */}
          {items.length > 1 ? (
            <div className="mt-10 flex items-center gap-2.5">
              {items.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`${index + 1}-sharh`}
                  aria-current={index === active}
                  className={cn(
                    "focus-ring h-2 rounded-full transition-[width,background-color] duration-[var(--t-slow)]",
                    index === active
                      ? "w-8 bg-[var(--brand)]"
                      : "w-2 bg-[var(--edge-strong)] hover:bg-[var(--ink-4)]",
                  )}
                />
              ))}
            </div>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}

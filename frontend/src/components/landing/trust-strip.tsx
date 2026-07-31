"use client";

import { Reveal } from "./reveal";

/* ==========================================================================
   Ishonch lentasi — hero ostidagi monoxrom qator
   --------------------------------------------------------------------------
   Dizayn tizimida bu joy "mijoz logotiplari" uchun: kulrang-monoxrom
   belgilar, sichqoncha kelganda qora bo'ladi. CodeArena'da mijoz logotipi
   yo'q — o'ylab topilgan kompaniya nomlarini qo'yish esa yolg'on bo'lardi.
   Shuning uchun bu yerda MAHSULOT haqidagi tekshirib bo'ladigan faktlar
   turadi: qaysi tillarda yozish mumkin va kod nima bilan tekshiriladi.

   Ko'rinish qoidasi o'zgarmadi: tinch holatda kulrang va yarim shaffof,
   hoverda qora va to'liq — `logo-strip-item` klassi.
   ========================================================================== */

const ITEMS = ["Python", "JavaScript", "C++", "Judge0", "PWA"];

export function TrustStrip() {
  return (
    <section className="shell pb-16 sm:pb-20">
      <Reveal>
        <div className="border-y border-[var(--edge)] py-8">
          <p className="text-center text-[13px] font-semibold tracking-[0.12em] text-[var(--ink-3)] uppercase">
            Qo&apos;llab-quvvatlanadigan tillar va tekshiruv muhiti
          </p>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {ITEMS.map((item) => (
              <li
                key={item}
                className="logo-strip-item text-[22px] font-bold tracking-[-0.02em] text-[var(--ink)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

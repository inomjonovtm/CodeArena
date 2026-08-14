"use client";

import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import type { HealthCheck, ProblemHealth } from "@/lib/studio-types";
import { cn } from "@/lib/utils";

/* ==========================================================================
   MASALA USTIDAGI TAB QATORI
   --------------------------------------------------------------------------
   Ilgari bu yerda «qadamlar yo'li» turardi: to'rtta raqamlangan qadam,
   ular orasida chiziq, yonida ikkita «asbob» tugmasi va ostida yana bitta
   «keyingi qadam» qatori. Jami uchta gorizontal lenta — sarlavha paneli,
   qadamlar va keyingi amal — ekranning uchdan biri navigatsiya bo'lib
   qolardi va muallif ish maydonini kech ko'rardi.

   Endi bu ODDIY TAB QATORI: bo'limlar yonma-yon, o'ngda esa asosiy amal
   («Chop etish»). Bu — masala muharrirlarining odatiy tili va uni
   tushuntirish shart emas.

   Tayyorlik ma'lumoti yo'qolmadi, faqat SIQILDI:

     · tabda nuqta — o'sha bo'limda yetishmayotgan narsa bor;
     · qator ostidagi bitta jumla — chop etishga nima to'sqinlik qilyapti
       va «O'tish» tugmasi to'g'ri tabga olib boradi.

   Ya'ni ekranda hamon «endi nima qilaman?» degan savolga javob bor,
   lekin u alohida lenta emas, bitta qator.
   ========================================================================== */

export type StepKey = "statement" | "tests" | "solutions" | "verify";

/** Tab → unga tegishli tayyorlik bandlari (`health.checks` kalitlari). */
const TAB_CHECKS: Record<string, string[]> = {
  statement: ["statement"],
  tests: ["samples", "tests", "expected"],
  checker: ["checker"],
  solutions: ["model", "verified"],
  generator: [],
  verify: [],
};

/**
 * Tab qatorida ko'rinadigan bo'limlar — TO'RTTA, ortiq emas.
 *
 * «Generator» va «Nashr» qatordan OLIB TASHLANDI, chunki ikkalasi ham
 * boshqa joyda takrorlanardi:
 *
 *   · Generator — chap relsda «Test yasovchi» bo'limi bor, «Testlar»
 *     tabida esa unga o'tadigan tugma. Uchinchi yo'l ortiqcha edi.
 *   · Nashr — ichida tayyorlik ro'yxati va «Chop etish» turardi. Endi
 *     ikkalasi ham shu qatorning O'ZIDA: tugma o'ng chetda, ro'yxat esa
 *     pastdagi «N/M» ni bosganda ochiladi.
 *
 * «Yechim» esa QOLDI va u ixtiyoriy emas: backend tayyorlik ro'yxatida
 * `model` («Etalon yechim mavjud») va `verified` («Etalon barcha
 * testlardan o'tdi») bandlari MAJBURIY. Etalon yechimsiz `ready: false`
 * bo'ladi, ya'ni masalani chop etib bo'lmaydi. Undan tashqari
 * «Javoblarni hisoblash» tugmasi kutilgan chiqishlarni aynan shu koddan
 * oladi — ya'ni bu tab ishlaydigan mexanizm, bezak emas.
 *
 * Marshrutlar saqlangan: `?tab=generator` va `?tab=verify` hamon
 * ochiladi, faqat qatorda ko'rinmaydi.
 */
export const TABS: { key: string; label: string; hint: string }[] = [
  { key: "statement", label: "Masala", hint: "Nomi, shart, limitlar va teglar" },
  { key: "tests", label: "Testlar", hint: "Namuna va yashirin testlar" },
  { key: "checker", label: "Checker", hint: "Bir nechta to'g'ri javob bo'lsa" },
  { key: "solutions", label: "Yechim", hint: "Etalon kod — javoblar shundan hisoblanadi" },
];

/**
 * Qatorda DOIM ko'rinmaydigan, lekin ochilishi mumkin bo'lgan bo'limlar.
 *
 * «Testlar» tabidagi «Generator» tugmasi generatorni ochadi, eski
 * havolalar esa `?tab=verify` bilan kelishi mumkin. Bunday paytda qatorda
 * hech narsa tanlangan ko'rinmasa, odam qayerdaligini yo'qotadi va
 * orqaga qaytish yo'lini topmaydi.
 *
 * Shuning uchun ochilgan yashirin bo'lim qatorga VAQTINCHA qo'shiladi:
 * u tanlangan bo'lib turadi, boshqa tabga o'tilishi bilan yo'qoladi.
 */
const EXTRA_TABS: Record<string, { key: string; label: string; hint: string }> = {
  generator: { key: "generator", label: "Generator", hint: "Ko'p testni kod bilan yaratish" },
  verify: { key: "verify", label: "Nashr", hint: "Yakuniy tayyorlik ro'yxati" },
};

/** Chop etishga to'sqinlik qilayotgan BIRINCHI band. */
export function firstBlocker(health: ProblemHealth | undefined): HealthCheck | null {
  if (!health) return null;
  return health.checks.find((check) => !check.optional && !check.ok) ?? null;
}

/** Band qaysi bo'limda tuzatiladi — «O'tish» tugmasi shu yerga olib boradi.
    Zaxira qiymat «testlar»: u har doim ko'rinadigan tab, ya'ni tugma
    hech qachon yopiq bo'limga olib bormaydi. */
function tabOf(checkKey: string): string {
  for (const [tab, keys] of Object.entries(TAB_CHECKS)) {
    if (keys.includes(checkKey)) return tab;
  }
  return "tests";
}

/** Shu tabda yetishmayotgan majburiy band bormi? */
function needsAttention(tab: string, health: ProblemHealth | undefined): boolean {
  if (!health) return false;
  const keys = TAB_CHECKS[tab] ?? [];
  if (!keys.length) return false;
  return health.checks.some((check) => keys.includes(check.key) && !check.optional && !check.ok);
}

export function ProblemSteps({
  health,
  active,
  onSelect,
  isNew,
  action,
}: {
  health?: ProblemHealth;
  active: string;
  onSelect: (key: string) => void;
  /** Hali saqlanmagan masala — tayyorlik ma'lumoti yo'q. */
  isNew?: boolean;
  /** O'ng chetdagi asosiy amal (odatda «Chop etish»). */
  action?: React.ReactNode;
}) {
  const [listOpen, setListOpen] = useState(false);

  // Ochilgan yashirin bo'lim qatorga vaqtincha qo'shiladi
  const extra = TABS.some((tab) => tab.key === active) ? null : EXTRA_TABS[active];
  const visibleTabs = extra ? [...TABS, extra] : TABS;

  const blocker = firstBlocker(health);
  const required = health?.checks.filter((check) => !check.optional) ?? [];
  const doneCount = required.filter((check) => check.ok).length;

  return (
    <div className="st-chrome sticky top-[var(--st-bar)] z-20 border-b">
      {/* ------------------------------------------------- tablar + amal */}
      <div className="flex items-center gap-3 px-4 sm:px-6">
        <div role="tablist" className="scroll-thin flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const selected = active === tab.key;
            const attention = !isNew && needsAttention(tab.key, health);

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                title={tab.hint}
                onClick={() => onSelect(tab.key)}
                className={cn(
                  "relative flex h-[var(--st-tabs)] shrink-0 items-center gap-2 px-3.5",
                  "text-[15.5px] whitespace-nowrap transition-colors duration-[var(--dur-1)]",
                  selected
                    ? "font-semibold text-[var(--text)]"
                    : "font-medium text-[var(--text-4)] hover:text-[var(--text-2)]",
                )}
              >
                {tab.label}
                {attention ? (
                  <span
                    aria-label="yetishmayapti"
                    className="size-1.5 shrink-0 rounded-full bg-[var(--green)]"
                  />
                ) : null}
                {/* Tanlangan tab ostidagi yashil chiziq — muharrir oynalarining
                    odatiy tili. */}
                {selected ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-t-full bg-[var(--green)]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        {action ? <div className="flex shrink-0 items-center gap-2 py-2">{action}</div> : null}
      </div>

      {/* ------------------------------------------------ keyingi amal
          Bitta qator: hozir aynan nima qilinadi. Hamma tabda turadi —
          muallif «Nashr» tabiga borib qidirmaydi. */}
      {isNew ? (
        <p className="border-t border-[var(--st-edge-soft)] px-4 py-2.5 text-[15px] text-[var(--text-3)] sm:px-6">
          Nom va shartni yozib saqlang — shundan keyin testlar, yechim va chop
          etish bo&apos;limlari ochiladi.
        </p>
      ) : blocker ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--st-edge-soft)] px-4 py-2.5 sm:px-6">
          <span className="st-label shrink-0">Keyingi qadam</span>
          <p className="min-w-0 flex-1 text-[15px] text-[var(--text-2)]">{blocker.hint}</p>
          <button
            type="button"
            onClick={() => onSelect(tabOf(blocker.key))}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1",
              "text-[14px] font-semibold text-[var(--green-text)]",
              "transition-colors hover:bg-[var(--surface-hover)]",
            )}
          >
            O&apos;tish
            <ArrowRight className="size-3.5" />
          </button>
          {required.length ? (
            <button
              type="button"
              onClick={() => setListOpen((open) => !open)}
              aria-expanded={listOpen}
              title="To'liq tayyorlik ro'yxati"
              className={cn(
                "st-num inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5",
                "text-[13.5px] text-[var(--text-4)] transition-colors",
                "hover:bg-[var(--st-chrome-hover)] hover:text-[var(--text-2)]",
              )}
            >
              {doneCount}/{required.length}
              <ChevronDown
                className={cn("size-3.5 transition-transform", listOpen && "rotate-180")}
              />
            </button>
          ) : null}
        </div>
      ) : (
        <p className="border-t border-[var(--st-edge-soft)] px-4 py-2.5 text-[15px] text-[var(--text-3)] sm:px-6">
          Hammasi tayyor — masalani chop etish mumkin.
        </p>
      )}

      {/* TO'LIQ TAYYORLIK RO'YXATI — «Nashr» tabining o'rnini bosadi.
          Yig'ilgan holatda joy egallamaydi, kerak bo'lganda esa hamma
          band bir joyda ko'rinadi. */}
      {listOpen && health ? (
        <ul className="border-t border-[var(--st-edge-soft)] px-4 py-3 sm:px-6">
          {health.checks.map((check) => (
            <li key={check.key} className="flex items-start gap-2.5 py-1.5">
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                  check.ok
                    ? "bg-[var(--green)] text-[var(--text-on-green)]"
                    : "ring-1 ring-[var(--st-edge)] ring-inset",
                )}
              >
                {check.ok ? <Check className="size-2.5" strokeWidth={4} /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "text-[15px]",
                    check.ok ? "text-[var(--text-3)]" : "font-medium text-[var(--text)]",
                  )}
                >
                  {check.label}
                </span>
                {check.optional ? (
                  <span className="ml-2 text-[13.5px] text-[var(--text-4)]">ixtiyoriy</span>
                ) : null}
                {!check.ok ? (
                  <span className="mt-0.5 block text-[14px] text-[var(--text-4)]">{check.hint}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

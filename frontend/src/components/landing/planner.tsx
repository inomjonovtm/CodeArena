"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { cn, formatNumber } from "@/lib/utils";

import { Reveal } from "./reveal";

/* ==========================================================================
   Mashq rejasi — interaktiv bo'lim
   --------------------------------------------------------------------------
   Sahifadagi YAGONA to'q bo'lim (futerdan tashqari). Kontrast ikki vazifani
   bajaradi: bo'limni qolganlaridan ajratadi va foydalanuvchini "bu yerda
   nimadir qilinadi" degan fikrga olib keladi.

   Hisob ataylab SODDA va oshkora: kuniga nechta masala × haftada necha kun
   × 52 hafta. Bu — arifmetika, va'da emas. Shuning uchun natija yonida
   "taxminiy" deb yozilgan: platforma buni kafolatlamaydi, foydalanuvchi
   shunchaki o'z rejasini ko'radi.

   Slayder: yo'l kulrang, bosib o'tilgan qismi ko'k, tugmasi oq va ko'k
   halqali (uslub `globals.css` dagi `.slider-blue` da).
   ========================================================================== */

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (next: number) => void;
}) {
  const id = useId();
  // Bosib o'tilgan qism foizda — ko'k to'ldirma shu qiymatga qarab chiziladi
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[15px] font-medium text-[var(--stage-ink-2)]">
          {label}
        </label>
        <span className="t-num text-[17px] font-bold text-white">
          {value}
          <span className="ml-1 text-[14px] font-medium text-[var(--stage-ink-2)]">{suffix}</span>
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="slider-blue mt-4 w-full"
        style={{ ["--progress" as string]: `${progress}%` }}
      />
    </div>
  );
}

export function Planner() {
  const [perDay, setPerDay] = useState(2);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  const perYear = perDay * daysPerWeek * 52;
  // Bitta masala uchun o'rtacha 25 daqiqa — FAQ'da aytilgan oraliqning
  // (20-30 daqiqa) o'rtasi. Soatga aylantiriladi.
  const hoursPerYear = Math.round((perYear * 25) / 60);

  return (
    <section className="on-dark band stage-surface relative isolate overflow-hidden">
      <span aria-hidden className="dot-paper absolute inset-0 opacity-40" />

      <div className="shell relative">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          {/* -------------------------------------------------- boshqaruv */}
          <div className="min-w-0">
            <Reveal>
              <p className="t-eyebrow-brand text-[var(--stage-brand)]">Mashq rejasi</p>
              <h2 className="t-title mt-4 text-white">
                Bir yilda qancha masala yechishingizni hisoblang.
              </h2>
              <p className="mt-5 text-[17px] leading-[1.6] text-[var(--stage-ink-2)]">
                Ikkita slayderni suring — reja darhol yangilanadi. Muhimi son emas,
                uzluksizlik: kunlik masala va seriya aynan shuning uchun.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-10 flex flex-col gap-8">
                <Slider
                  label="Kuniga nechta masala"
                  value={perDay}
                  min={1}
                  max={5}
                  suffix="ta"
                  onChange={setPerDay}
                />
                <Slider
                  label="Haftada necha kun"
                  value={daysPerWeek}
                  min={1}
                  max={7}
                  suffix="kun"
                  onChange={setDaysPerWeek}
                />
              </div>
            </Reveal>
          </div>

          {/* ----------------------------------------------------- natija */}
          <Reveal delay={200} className="min-w-0">
            <div className="rounded-[var(--r-pane-lg)] border border-[var(--stage-edge)] bg-[var(--stage)] p-8 sm:p-10">
              <p className="text-[13px] font-semibold tracking-[0.12em] text-[var(--stage-ink-3)] uppercase">
                Bir yilda — taxminiy
              </p>

              {/* Raqam o'zgarishi yumshoq: `transition` rang va shaffoflikka
                  beriladi, chunki matnning o'zi bir zumda almashadi. */}
              <p
                className={cn(
                  "t-num mt-5 text-[clamp(3rem,2rem+5vw,4.5rem)] leading-none font-bold",
                  "text-[var(--stage-brand)] transition-opacity duration-200",
                )}
              >
                {formatNumber(perYear)}
              </p>
              <p className="mt-3 text-[16px] text-[var(--stage-ink-2)]">yechilgan masala</p>

              <div className="mt-8 border-t border-[var(--stage-edge)] pt-8">
                <p className="t-num text-[28px] leading-none font-bold text-white">
                  ≈ {formatNumber(hoursPerYear)} soat
                </p>
                <p className="mt-2.5 text-[14px] text-[var(--stage-ink-3)]">
                  bitta masalaga o&apos;rtacha 25 daqiqa hisobida
                </p>
              </div>

              {/* To'q fondagi CTA — to'yingan ko'k, hoverda ochroq ko'k */}
              <Link
                href="/register"
                className={cn(
                  "focus-ring mt-9 inline-flex h-12 w-full items-center justify-center gap-2.5",
                  "rounded-[var(--r-ctl)] bg-[var(--brand)] px-7 text-[15px] font-semibold text-[var(--ink-on-brand)]",
                  "transition-[background-color,transform] duration-[var(--t-base)] ease-[var(--ease-snap)]",
                  "hover:bg-[var(--brand-hover)] active:scale-[0.97]",
                )}
              >
                Rejani boshlash
                <ArrowRight className="size-[18px]" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

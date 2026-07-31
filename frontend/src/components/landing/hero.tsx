"use client";

import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { CodeCube } from "./code-cube";
import { Reveal } from "./reveal";
import { StageField } from "./stage-field";
import { StageStats } from "./stage-stats";

/* Sahna ustidagi tugmalar kit'dagi variantlardan foydalanmaydi: ular oq
   sirt uchun sozlangan va to'q fonda kontrasti yetmaydi. DESIGN.md ga ko'ra
   `--stage-*` ustida oq matn ruxsat etilgan. */
const PRIMARY = [
  "inline-flex h-11 items-center gap-2 rounded-[var(--r-ctl)] px-5",
  "bg-[var(--brand)] text-[15px] font-medium text-white focus-ring",
  "transition-colors duration-[var(--t-fast)] hover:bg-[var(--brand-hover)]",
].join(" ");

const SECONDARY = [
  "inline-flex h-11 items-center gap-2 rounded-[var(--r-ctl)] px-5",
  "border border-[var(--stage-edge)] text-[15px] font-medium text-[var(--stage-ink)] focus-ring",
  "transition-colors duration-[var(--t-fast)]",
  "hover:border-[var(--stage-brand)] hover:text-white",
].join(" ");

export function Hero() {
  return (
    <section className="stage-surface stage-glow relative isolate overflow-hidden">
      <StageField />
      <span aria-hidden className="dot-paper texture-fade absolute inset-0 opacity-[0.35]" />

      <div className="relative mx-auto w-full max-w-[var(--page)] px-4 pt-16 pb-14 sm:px-6 sm:pt-24 lg:px-[var(--gutter)]">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
          {/* ------------------------------------------------------- matn */}
          <div className="min-w-0">
            <Reveal>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-[var(--r-chip)] px-3 py-1",
                  "border border-[var(--stage-edge)] font-mono text-[11px] font-medium uppercase",
                  "tracking-[0.06em] text-[var(--stage-ink-2)]",
                )}
              >
                <span className="size-1.5 rounded-full bg-[var(--stage-ok)]" />
                Judge0 jonli ishlayapti
              </span>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="t-display mt-7 text-[var(--stage-ink)]">
                Algoritmik mahoratingni{" "}
                <span className="text-[var(--stage-brand)]">sinovdan o&apos;tkaz</span> va eng
                kuchlilar safiga qo&apos;shil.
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-7 max-w-xl text-[17px] leading-[1.65] text-[var(--stage-ink-2)]">
                Avtomatik testlash, real-vaqt musobaqalar va adolatli Elo-reyting tizimiga ega
                zamonaviy platforma.
              </p>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/problems" className={PRIMARY}>
                  Masalalarni yechish
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/contests" className={SECONDARY}>
                  <Trophy className="size-4" />
                  Contestda qatnashish
                </Link>
              </div>
            </Reveal>
          </div>

          {/* -------------------------------------------------------- 3D */}
          <Reveal delay={240} className="flex justify-center lg:justify-end">
            <CodeCube />
          </Reveal>
        </div>

        {/* --------------------------------------------------- metrikalar */}
        <Reveal delay={300}>
          <StageStats className="mt-16 border-t border-[var(--stage-edge)] pt-2 sm:mt-20" />
        </Reveal>
      </div>
    </section>
  );
}

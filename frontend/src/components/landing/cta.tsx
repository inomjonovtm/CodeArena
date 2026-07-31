"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Reveal } from "./reveal";
import { StageField } from "./stage-field";

export function CTA() {
  return (
    <section className="mx-auto w-full max-w-[var(--page)] px-4 pb-20 sm:px-6 sm:pb-28 lg:px-[var(--gutter)]">
      <Reveal>
        {/* Sahifadagi YAGONA to'yingan brend blok (DESIGN.md, 2-bo'lim) */}
        <div className="relative isolate overflow-hidden rounded-[var(--r-pane-lg)] bg-[var(--brand)] px-6 py-14 text-center sm:px-10 sm:py-20">
          <StageField className="opacity-40" />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="t-title text-white">
              Bugunoq birinchi kodingizni yozing va reytingingizni oshiring.
            </h2>
            <p className="mt-4 text-[15.5px] leading-[1.6] text-white/80">
              Ro&apos;yxatdan o&apos;tish bepul. Birinchi masalani yechish uchun besh daqiqa
              yetadi.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="focus-ring inline-flex h-11 items-center gap-2 rounded-[var(--r-ctl)] bg-white px-5 text-[15px] font-medium text-[var(--brand-ink)] transition-opacity duration-[var(--t-fast)] hover:opacity-90"
              >
                Bepul boshlash
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/problems"
                className="focus-ring inline-flex h-11 items-center rounded-[var(--r-ctl)] border border-white/35 px-5 text-[15px] font-medium text-white transition-colors duration-[var(--t-fast)] hover:border-white/70"
              >
                Avval masalalarni ko&apos;rish
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

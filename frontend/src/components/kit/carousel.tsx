"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Karusel — bir vaqtda bitta kartani ko'rsatuvchi gorizontal lenta
   --------------------------------------------------------------------------
   NEGA SCROLL-SNAP. Slaydlarni `transform` bilan surish o'rniga brauzerning
   o'z gorizontal scroll'i ishlatiladi va `scroll-snap` har bir kartani
   joyiga qo'yadi. Buning uchta afzalligi bor: sensorli ekranda barmoq bilan
   surish o'zi ishlaydi, klaviatura va skrinriderlar uchun tartib tabiiy
   qoladi, JavaScript o'chsa ham kontent o'qiladi.

   HARAKAT. Dizayn tizimi ortiqcha animatsiyani taqiqlaydi, shuning uchun
   avtomatik aylanish sekin (8 s) va u quyidagi hollarda TO'XTAYDI: sichqoncha
   ustida, fokus ichida, karusel ekrandan chiqqanda va foydalanuvchi
   `prefers-reduced-motion` tanlaganida. Ya'ni u hech qachon o'qiyotgan
   odamning tagidan kontentni tortib olmaydi.
   ========================================================================== */

const AUTOPLAY_MS = 8000;

export function Carousel({
  children,
  label,
  autoplay = true,
  className,
}: {
  children: React.ReactNode[];
  /** Skrinrider uchun karusel nomi. */
  label: string;
  autoplay?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = children.length;

  /* Faol slayd — scroll holatidan hisoblanadi, aksincha emas: shu tufayli
     barmoq bilan surish ham, tugma bosish ham bitta manbaga olib keladi. */
  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    setActive(Math.min(Math.max(index, 0), count - 1));
  }, [count]);

  const goTo = useCallback((raw: number) => {
    const track = trackRef.current;
    if (!track) return;

    const index = Math.min(Math.max(raw, 0), count - 1);
    /* Faol slaydni DARHOL belgilaymiz. `scroll` hodisasiga tayanib bo'lmaydi:
       u silliq surish tugagach keladi, ba'zi holatlarda esa umuman kelmaydi
       (fonda turgan varaq). Qo'l bilan surilganda `syncActive` baribir
       haqiqiy holatga tuzatib qo'yadi. */
    setActive(index);

    const left = track.clientWidth * index;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      track.scrollLeft = left;
      return;
    }

    track.scrollTo({ left, behavior: "smooth" });

    /* Ba'zi muhitlarda (fonda turgan varaq, animatsiyasi o'chirilgan
       brauzer, `scroll-snap` bilan qo'shilganda) `behavior: "smooth"`
       umuman qimirlamaydi — tugma bosilmagandek tuyuladi. Shuning uchun
       biroz kutib tekshiramiz: lenta JOYIDAN SILJIMAGAN bo'lsa qiymatni
       to'g'ridan-to'g'ri o'rnatamiz. Silliq surish ishlayotgan bo'lsa bu
       vaqtga u allaqachon harakatlangan bo'ladi va shart bajarilmaydi.
       (`requestAnimationFrame` bu yerda yaramaydi: ko'rinmayotgan varaqda
       uning chaqiruvi umuman kelmaydi.) */
    const before = track.scrollLeft;
    window.setTimeout(() => {
      if (track.scrollLeft === before && before !== left) track.scrollLeft = left;
    }, 300);
  }, [count]);

  /* Avtomatik aylanish — faqat karusel ko'rinib turganda va tinch holatda. */
  useEffect(() => {
    if (!autoplay || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const track = trackRef.current;
    if (!track) return;

    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.5 },
    );
    observer.observe(track);

    const timer = window.setInterval(() => {
      if (!visible || document.hidden) return;
      goTo((active + 1) % count);
    }, AUTOPLAY_MS);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [autoplay, paused, active, count, goTo]);

  const arrow =
    "grid size-9 place-items-center rounded-[var(--radius-md)] border border-[var(--line)] " +
    "bg-[var(--surface)] text-[var(--text-3)] ring-focus " +
    "transition-colors duration-[var(--dur-1)] " +
    "hover:border-[var(--green-line)] hover:text-[var(--green)] " +
    "disabled:pointer-events-none disabled:opacity-35";

  return (
    <section
      aria-roledescription="karusel"
      aria-label={label}
      className={cn("flex flex-col gap-5", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={syncActive}
        className="scroll-hidden flex snap-x snap-mandatory overflow-x-auto"
      >
        {children.map((slide, index) => (
          <div
            key={index}
            role="group"
            aria-roledescription="slayd"
            aria-label={`${index + 1} / ${count}`}
            aria-hidden={index !== active}
            className="w-full shrink-0 snap-center px-px"
          >
            {slide}
          </div>
        ))}
      </div>

      {/* Boshqaruv: nuqtalar markazda, strelkalar chetda */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Oldingi"
          disabled={active === 0}
          onClick={() => goTo(active - 1)}
          className={arrow}
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-2">
          {children.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`${index + 1}-slayd`}
              aria-current={index === active}
              onClick={() => goTo(index)}
              className={cn(
                "ring-focus h-2 rounded-full transition-[width,background-color]",
                "duration-[var(--dur-2)]",
                index === active
                  ? "w-8 bg-[var(--green)]"
                  : "w-2 bg-[var(--line-strong)] hover:bg-[var(--text-4)]",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Keyingi"
          disabled={active === count - 1}
          onClick={() => goTo(active + 1)}
          className={arrow}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </section>
  );
}

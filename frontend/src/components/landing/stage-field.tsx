"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Sahna orqasidagi zarralar maydoni — bir-biriga yaqin nuqtalar chiziq bilan
 * bog'lanadi ("konstellyatsiya" effekti).
 *
 * Nega canvas, WebGL emas: bu yerda kerak bo'ladigan narsa — bir necha o'nlab
 * nuqta va ular orasidagi chiziqlar. Uch o'lchamli sahna dvigateli (three.js)
 * bundle'ga yuzlab kilobayt qo'shardi va konteyner build'ini og'irlashtirardi;
 * 2D canvas bir xil natijani nol qo'shimcha bog'liqlik bilan beradi.
 *
 * Batareyani ayamaslik oson bo'lgani uchun uchta himoya bor:
 *   * `prefers-reduced-motion` — bir marta chiziladi, keyin rAF ishlamaydi;
 *   * ekrandan chiqib ketsa — sikl to'xtaydi (IntersectionObserver);
 *   * boshqa tabga o'tilsa — brauzer rAF ni o'zi to'xtatadi.
 */
export function StageField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;

    type Dot = { x: number; y: number; vx: number; vy: number };
    let dots: Dot[] = [];

    /* Nuqta soni maydonga qarab: telefonda 30 ta ham ko'p ko'rinadi,
       keng ekranda 30 ta siyrak bo'lib qoladi. */
    const seed = () => {
      const count = Math.round(Math.min(72, Math.max(24, (width * height) / 22000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Retina ekranda chiziqlar xira bo'lib qolmasligi uchun DPR bilan
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        // Chekkaga yetganda qaytadi — yangi nuqta "paydo bo'lishi" ko'zga tashlanardi
        if (dot.x < 0 || dot.x > width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > height) dot.vy *= -1;
      }

      // Chiziqlar: masofa qancha kichik bo'lsa, shuncha ko'rinadi
      for (let i = 0; i < dots.length; i += 1) {
        for (let j = i + 1; j < dots.length; j += 1) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const distance = Math.hypot(dx, dy);
          if (distance > 128) continue;
          ctx.globalAlpha = (1 - distance / 128) * 0.26;
          ctx.strokeStyle = "#6ba3fa";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#6ba3fa";
      for (const dot of dots) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      if (!running) return;
      draw();
      frame = window.requestAnimationFrame(loop);
    };

    resize();
    if (reduced) {
      draw(); // bir marta — statik naqsh bo'lib qoladi
    } else {
      loop();
    }

    const onResize = () => {
      resize();
      if (reduced) draw();
    };
    window.addEventListener("resize", onResize);

    // Ekrandan chiqsa — hisob-kitobni to'xtatamiz
    const observer =
      typeof IntersectionObserver === "undefined" || reduced
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting && !running) {
                running = true;
                loop();
              } else if (!entry.isIntersecting) {
                running = false;
                window.cancelAnimationFrame(frame);
              }
            },
            { threshold: 0 },
          );
    observer?.observe(canvas);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}

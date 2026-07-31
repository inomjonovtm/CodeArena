"use client";

import { useEffect, useRef } from "react";

/**
 * Aylanuvchi 3D kod kubigi — sichqoncha harakatiga qarab biroz og'adi.
 *
 * Aylanish CSS'da (`ca-cube-spin`), sichqoncha burchagi esa CSS
 * o'zgaruvchilari orqali: shu tufayli ikkalasi bir-birini bosmaydi va
 * `prefers-reduced-motion` aylanishni global blok orqali o'chirib qo'yadi.
 *
 * Hodisa `pointermove` — sichqoncha, qalam va barmoq uchun bitta yo'l.
 * Sensorli ekranda parallaks amalda ishlamaydi, lekin zarar ham qilmaydi.
 */

/** Har bir yoq — bitta til. Matn qisqa: kub aylanganda o'qilmaydi, faqat "his" beradi. */
const FACES = [
  { key: "front", lines: ["def solve(a, b):", "    return a + b"] },
  { key: "back", lines: ["int solve(int a,", "        int b) {", "  return a + b;", "}"] },
  { key: "right", lines: ["const solve =", "  (a, b) => a + b;"] },
  { key: "left", lines: ["# Accepted", "# 24 / 24 test", "# 41 ms"] },
  { key: "top", lines: ["O(n log n)", "O(1) xotira"] },
  { key: "bottom", lines: ["rating +23", "streak 12 kun"] },
] as const;

export function CodeCube() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Kub kichkina bo'lgani uchun butun oyna bo'ylab kuzatamiz — aks holda
    // parallaks faqat kub ustida turganda ishlardi va sezilmasdi.
    const onMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      scene.style.setProperty("--tilt-y", `${x * 18}deg`);
      scene.style.setProperty("--tilt-x", `${-y * 14}deg`);
    };

    const onLeave = () => {
      scene.style.setProperty("--tilt-y", "0deg");
      scene.style.setProperty("--tilt-x", "0deg");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={sceneRef} aria-hidden className="cube-scene">
      <div className="cube">
        <div className="cube-spin">
          {FACES.map((face) => (
            <div key={face.key} className={`cube-face cube-face-${face.key}`}>
              {face.lines.map((line) => (
                <span key={line} className="whitespace-pre">
                  {line}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

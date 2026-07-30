"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Element ekranga kirganda yumshoq paydo bo'ladi (Apple uslubidagi scroll
 * animatsiyasi). `delay` bilan ketma-ket "to'lqin" effekti olinadi.
 *
 * IntersectionObserver bo'lmasa yoki JS ishlamasa — kontent baribir
 * ko'rinadi, hech narsa yashirinib qolmaydi.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
  once = true,
}: {
  children: React.ReactNode;
  /** Millisekundda kechikish — ketma-ket elementlar uchun. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
  once?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  // Polimorf teg — `as` bo'yicha ref tiplari to'qnashmasligi uchun
  const Component = Tag as React.ElementType;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      // Element pastdan ~12% ko'ringanda boshlanadi
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Component
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={cn("reveal", className)}
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}

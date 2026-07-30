"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Oqim holati:
 * - `idle` — o'chirilgan (url `null`)
 * - `connecting` — ulanmoqda, hali birinchi xabar kelmadi
 * - `live` — ma'lumot kelib turibdi
 * - `closed` — server oqimni ataylab yopdi (masalan, musobaqa tugadi)
 * - `failed` — oqim ishlamadi; chaqiruvchi oddiy pollingga qaytishi kerak
 */
export type StreamStatus = "idle" | "connecting" | "live" | "closed" | "failed";

type Options<T> = {
  /** Qaysi `event:` turini tinglash (server yuboradigan nom) */
  event?: string;
  /** Har bir kadr kelganda chaqiriladi */
  onData: (payload: T) => void;
  /** Server `event: closed` yuborganda */
  onClosed?: () => void;
  /** Shu vaqt ichida birinchi xabar kelmasa — oqim ishlamayapti deb belgilanadi */
  firstMessageTimeout?: number;
};

/** Ketma-ket shuncha marta uzilgandan keyin oqimdan voz kechamiz */
const MAX_ERROR_STREAK = 3;

/**
 * Server-Sent Events'ga obuna bo'ladi va oqim holatini qaytaradi.
 *
 * `EventSource` cookie'larni same-origin so'rovda o'zi yuboradi — JWT
 * HttpOnly cookie'da bo'lgani uchun bu aynan kerakli xatti-harakat (EventSource
 * maxsus sarlavha qo'shishga ruxsat bermaydi).
 *
 * Oqim ishlamay qolsa `failed` qaytadi, lekin ulanish uzilmaydi: xabar keyinroq
 * kelsa holat yana `live` bo'ladi. Shu tufayli chaqiruvchi pollingni yoqib
 * turishi mumkin va hech qanday ma'lumot yo'qolmaydi.
 */
export function useEventSource<T>(url: string | null, options: Options<T>): StreamStatus {
  const { event = "message", firstMessageTimeout = 12_000 } = options;
  const [status, setStatus] = useState<StreamStatus>("idle");

  // Handlerlar har renderda yangilanadi, lekin effekt qayta ishga tushmaydi —
  // aks holda har render ulanishni uzib, qaytadan ochib turardi.
  const handlers = useRef(options);
  handlers.current = options;

  useEffect(() => {
    if (!url || typeof window === "undefined" || typeof EventSource === "undefined") {
      setStatus("idle");
      return;
    }

    let closedByServer = false;
    let errorStreak = 0;
    setStatus("connecting");

    const source = new EventSource(url);

    // Proksi oqimni buferlab qo'ygan bo'lishi mumkin — bunday holatda kutib
    // qolmasdan chaqiruvchiga "polling qil" deb ishora beramiz.
    const timer = window.setTimeout(() => {
      setStatus((previous) => (previous === "live" ? previous : "failed"));
    }, firstMessageTimeout);

    const handlePayload = (message: MessageEvent<string>) => {
      errorStreak = 0;
      window.clearTimeout(timer);
      setStatus("live");
      try {
        handlers.current.onData(JSON.parse(message.data) as T);
      } catch {
        // Buzilgan kadr — oqimni uzmaymiz, keyingisini kutamiz
      }
    };

    const handleClosed = () => {
      closedByServer = true;
      window.clearTimeout(timer);
      source.close();
      setStatus("closed");
      handlers.current.onClosed?.();
    };

    source.addEventListener(event, handlePayload as EventListener);
    source.addEventListener("closed", handleClosed);

    source.onerror = () => {
      if (closedByServer) return;
      errorStreak += 1;
      // `EventSource` o'zi qayta ulanadi (server `retry:` beradi). Ketma-ket
      // bir necha marta uddalay olmasa — voz kechamiz.
      if (errorStreak >= MAX_ERROR_STREAK) {
        window.clearTimeout(timer);
        source.close();
        setStatus("failed");
      }
    };

    return () => {
      window.clearTimeout(timer);
      source.removeEventListener(event, handlePayload as EventListener);
      source.removeEventListener("closed", handleClosed);
      source.close();
    };
  }, [url, event, firstMessageTimeout]);

  return status;
}

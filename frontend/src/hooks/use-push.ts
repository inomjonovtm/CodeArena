"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";

/** Brauzer bergan ruxsat holati; `unsupported` — Web Push umuman yo'q. */
export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export type PushState = {
  /** Brauzer Web Push'ni qo'llab-quvvatlaydimi */
  supported: boolean;
  /** Serverda VAPID kalitlari sozlanganmi */
  configured: boolean;
  /** Sozlamalar hali yuklanmoqda */
  loading: boolean;
  permission: PushPermission;
  /** Aynan shu brauzer obuna bo'lganmi */
  subscribed: boolean;
  /** Hisobdagi barcha obuna qurilmalar soni */
  devices: number;
  busy: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTest: () => Promise<string | null>;
};

/**
 * VAPID ochiq kaliti base64url'da keladi — brauzer bayt massivini kutadi.
 *
 * Bufer ataylab alohida yaratiladi: `new Uint8Array(uzunlik)` tipi
 * `ArrayBufferLike` bo'lib chiqadi va `applicationServerKey` kutadigan
 * `BufferSource` ga to'g'ri kelmaydi.
 */
function decodeKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Brauzer push obunasini boshqaradi.
 *
 * Uch shart bir vaqtda bajarilishi kerak: brauzer qo'llab-quvvatlashi,
 * serverda VAPID kalitlari bo'lishi va foydalanuvchi ruxsat berishi. Har
 * qaysisi alohida holat sifatida qaytariladi — interfeys nima yetishmayotganini
 * aniq ayta olishi uchun.
 *
 * `enabled=false` (masalan foydalanuvchi kirmagan) bo'lsa hech qanday so'rov
 * yubormaydi.
 */
export function usePush(enabled = true): PushState {
  const queryClient = useQueryClient();
  const supported = isSupported();

  const [permission, setPermission] = useState<PushPermission>(() =>
    isSupported() ? Notification.permission : "unsupported",
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["push-config"],
    queryFn: () => publicApi.push.config(),
    enabled: enabled && supported,
    staleTime: 5 * 60_000,
  });

  // Shu brauzerda obuna bormi — service worker'dan so'raymiz
  useEffect(() => {
    if (!enabled || !supported) return;
    let cancelled = false;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setSubscribed(Boolean(subscription));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [enabled, supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!supported) {
      setError("Bu brauzer push xabarlarini qo'llab-quvvatlamaydi.");
      return false;
    }
    if (!config?.enabled || !config.public_key) {
      setError("Push xabarlari serverda sozlanmagan.");
      return false;
    }

    setBusy(true);
    try {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") {
        setError(
          granted === "denied"
            ? "Bildirishnomalar bloklangan. Brauzer manzil qatoridagi qulf belgisidan ruxsat bering."
            : "Ruxsat berilmadi.",
        );
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      // Mavjud obuna bo'lsa qayta ishlatamiz — takroriy obuna kalitlarni
      // almashtirib, eski obunani jimgina yaroqsiz qilib qo'yardi
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          // Chrome majburiy qiladi: har bir push ko'rinadigan bildirishnoma bo'lishi shart
          userVisibleOnly: true,
          applicationServerKey: decodeKey(config.public_key),
        }));

      await publicApi.push.subscribe(
        subscription.toJSON() as unknown as Parameters<typeof publicApi.push.subscribe>[0],
      );

      setSubscribed(true);
      await queryClient.invalidateQueries({ queryKey: ["push-config"] });
      return true;
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Obuna bo'lishda xatolik yuz berdi.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [config, queryClient, supported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!supported) return false;

    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Avval serverdan o'chiramiz: brauzerdan o'chirib bo'lgach `endpoint`
        // qayta olinmaydi va serverda "o'lik" obuna qolib ketardi
        await publicApi.push.unsubscribe(subscription.endpoint).catch(() => undefined);
        await subscription.unsubscribe();
      }

      setSubscribed(false);
      await queryClient.invalidateQueries({ queryKey: ["push-config"] });
      return true;
    } catch {
      setError("Obunani bekor qilib bo'lmadi.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [queryClient, supported]);

  const sendTest = useCallback(async (): Promise<string | null> => {
    setError(null);
    setBusy(true);
    try {
      const result = await publicApi.push.test();
      return result.detail;
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : "Sinov xabarini yuborib bo'lmadi.";
      setError(message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    supported,
    configured: Boolean(config?.enabled),
    loading: enabled && supported && isLoading,
    permission,
    subscribed,
    devices: config?.devices ?? 0,
    busy,
    error,
    subscribe,
    unsubscribe,
    sendTest,
  };
}

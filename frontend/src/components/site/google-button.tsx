"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/providers";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/public-api";

const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, string | number | undefined>,
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gsi")));
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gsi"));
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

/**
 * Google orqali kirish tugmasi.
 *
 * Backend `GOOGLE_CLIENT_ID` sozlanmagan bo'lsa — hech narsa ko'rsatilmaydi,
 * shuning uchun sozlanmagan muhitda ishlamaydigan tugma chiqib qolmaydi.
 */
export function GoogleButton({
  onSuccess,
  text = "signin_with",
}: {
  onSuccess?: (created: boolean) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}) {
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["auth-config"],
    queryFn: () => authApi.config(),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const handleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      try {
        await loginWithGoogle(credential);
        onSuccess?.(true);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Google orqali kirishda xatolik yuz berdi.",
        );
      }
    },
    [loginWithGoogle, onSuccess],
  );

  useEffect(() => {
    if (!config?.google_enabled || !config.google_client_id) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: config.google_client_id,
          callback: (response) => {
            if (response.credential) void handleCredential(response.credential);
          },
          cancel_on_tap_outside: true,
        });
        containerRef.current.innerHTML = "";
        // Yorug' fonda rasmiy oq (outline) tugma ishlatiladi
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text,
          width: 320,
          logo_alignment: "center",
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Google xizmatini yuklab bo'lmadi.");
      });

    return () => {
      cancelled = true;
    };
  }, [config, handleCredential, text]);

  if (!config?.google_enabled) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--edge)]" />
        <span className="t-eyebrow">yoki</span>
        <span className="h-px flex-1 bg-[var(--edge)]" />
      </div>

      {/* Tugma yuklanguncha o'sha o'lchamdagi skelet turadi — sakrash bo'lmaydi */}
      <div className="relative mt-5 flex min-h-[2.75rem] justify-center">
        <div ref={containerRef} />
        {!ready ? (
          <div className="loading-block absolute inset-0 rounded-[var(--r-ctl)]" />
        ) : null}
      </div>

      {error ? (
        <p className="mt-2.5 text-center text-[12px] text-[var(--bad)]">{error}</p>
      ) : null}
    </div>
  );
}

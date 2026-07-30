"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api";

import { AuthProvider } from "./auth-provider";
import { ConfirmProvider } from "./confirm-provider";
import { I18nProvider } from "./i18n-provider";
import { ServiceWorkerRegistrar } from "./service-worker";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // `online` rejimida brauzerning noto'g'ri offline signali so'rovlarni
            // jimgina to'xtatib qo'yadi — admin panel uchun bu qabul qilinmaydi.
            networkMode: "always",
            retry: (failureCount, error) => {
              // 4xx xatolarni qayta urinmaymiz
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < 2;
            },
          },
          mutations: { networkMode: "always" },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <ServiceWorkerRegistrar />
                {children}
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export { useAuth, useCan, usePermissions } from "./auth-provider";
export { useConfirm } from "./confirm-provider";
export type { ConfirmOptions, PromptOptions } from "./confirm-provider";
export { useI18n, useLocalized } from "./i18n-provider";
export { useTheme } from "./theme-provider";
export { useToast } from "./toast-provider";

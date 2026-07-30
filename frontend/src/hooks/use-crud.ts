"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { useI18n, useToast } from "@/components/providers";
import { ApiError } from "@/lib/api";

/**
 * CRUD mutatsiyalari uchun umumiy wrapper: toast xabarlari + kesh yangilash.
 */
export function useCrudMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  options: {
    invalidate?: QueryKey[];
    successMessage?: string;
    onSuccess?: (result: TResult, variables: TVariables) => void;
  } = {},
) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();

  return useMutation({
    mutationFn,
    onSuccess: async (result, variables) => {
      for (const key of options.invalidate ?? []) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
      if (options.successMessage) toast.success(options.successMessage);
      options.onSuccess?.(result, variables);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        const fieldErrors = error.errors
          ? Object.entries(error.errors)
              .map(([field, messages]) =>
                `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`,
              )
              .slice(0, 3)
              .join(" · ")
          : undefined;
        toast.error(error.message, fieldErrors);
      } else {
        toast.error(t.common.error, String(error));
      }
    },
  });
}

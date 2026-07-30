/**
 * CodeArena API klienti.
 *
 * Barcha so'rovlar `/api/...` ga yuboriladi va Next.js rewrite orqali Django
 * backendga uzatiladi (`next.config.mjs`). Shu sababli JWT HttpOnly cookie
 * same-origin bo'lib qoladi. Access token muddati tugasa avtomatik `refresh`
 * qilinadi va so'rov bir marta qayta yuboriladi.
 */

import type { Paginated } from "./types";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[] | string>;
  code?: string;

  constructor(status: number, message: string, errors?: Record<string, string[] | string>, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.code = code;
  }

  /** Forma maydoni bo'yicha birinchi xatolik matni. */
  fieldError(field: string): string | undefined {
    const value = this.errors?.[field];
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : String(value);
  }
}

type QueryValue = string | number | boolean | null | undefined | (string | number)[];
export type Query = Record<string, QueryValue>;

export function buildQuery(params?: Query): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => (refreshPromise = null), 0);
      });
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Query;
  skipRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, skipRefresh, headers, ...rest } = options;

  const init: RequestInit = {
    credentials: "include",
    // API javoblari brauzer keshidan olinmasin. Keshlashni React Query
    // boshqaradi; bundan tashqari `no-store` bir marta keshlanib qolgan
    // qayta yo'naltirishni ham chetlab o'tadi — aks holda eskirgan 301
    // foydalanuvchining hisobiga kirishini butunlay buzib qo'yishi mumkin.
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(headers as Record<string, string>),
    },
    ...rest,
  };
  if (body instanceof FormData) {
    // Chegara (boundary) brauzer tomonidan qo'yiladi — Content-Type ni o'zimiz
    // yozsak, u yo'qoladi va Django faylni ko'rmaydi.
    delete (init.headers as Record<string, string>)["Content-Type"];
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  // Next rewrite (`next.config.mjs`) yo'l oxiriga slashni o'zi qo'shadi va
  // mos kelishdan oldin uni normallashtiradi — shuning uchun bu yerda qaysi
  // shaklda yuborilishi muhim emas. Bir xillik uchun slashsiz yuboramiz.
  const url = `/api${path.replace(/\/+$/, "")}${buildQuery(query)}`;
  let response = await fetch(url, init);

  // Access token eskirgan bo'lsa — bir marta yangilab, qayta urinib ko'ramiz
  if (response.status === 401 && !skipRefresh && !path.startsWith("/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) response = await fetch(url, init);
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const detail =
      (payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : null) ?? `So'rov bajarilmadi (${response.status})`;
    const errors =
      payload && typeof payload === "object" && "errors" in payload
        ? ((payload as { errors: Record<string, string[]> }).errors)
        : undefined;
    const code =
      payload && typeof payload === "object" && "code" in payload
        ? String((payload as { code: unknown }).code)
        : undefined;
    throw new ApiError(response.status, detail, errors, code);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>(path, { method: "POST", body, query }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** Fayl yuklash (multipart/form-data). */
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

/** Admin resurslari uchun standart CRUD yordamchisi. */
export function resource<TList, TDetail = TList>(base: string) {
  const root = `/admin/${base}`;
  return {
    list: (query?: Query) => api.get<Paginated<TList>>(`${root}/`, query),
    all: (query?: Query) => api.get<TList[]>(`${root}/`, query),
    retrieve: (id: string | number) => api.get<TDetail>(`${root}/${id}/`),
    create: (body: unknown) => api.post<TDetail>(`${root}/`, body),
    update: (id: string | number, body: unknown) => api.patch<TDetail>(`${root}/${id}/`, body),
    replace: (id: string | number, body: unknown) => api.put<TDetail>(`${root}/${id}/`, body),
    remove: (id: string | number) => api.delete<void>(`${root}/${id}/`),
    bulk: (ids: (string | number)[], action: string, payload?: Record<string, unknown>) =>
      api.post<{ detail: string; affected: number }>(`${root}/bulk/`, { ids, action, payload }),
    action: <T = unknown>(id: string | number, name: string, body?: unknown) =>
      api.post<T>(`${root}/${id}/${name}/`, body ?? {}),
    collectionAction: <T = unknown>(name: string, body?: unknown) =>
      api.post<T>(`${root}/${name}/`, body ?? {}),
    summary: <T = unknown>() => api.get<T>(`${root}/summary/`),
  };
}

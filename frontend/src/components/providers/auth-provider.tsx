"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  /** `totpCode` — 2FA yoqilgan hisoblarda talab qilinadi. */
  login: (login: string, password: string, totpCode?: string) => Promise<CurrentUser>;
  loginWithGoogle: (credential: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Serverdan qaytgan yangi profilni kontekstga yozadi (sozlamalar sahifasi uchun). */
  setUser: (user: CurrentUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<CurrentUser>("/auth/me/");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Admin marshrutlarini himoyalash (rol asosida)
  useEffect(() => {
    if (loading) return;
    const isAdminRoute = pathname?.startsWith("/admin");
    if (isAdminRoute && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? "/admin")}`);
    } else if (isAdminRoute && user && !user.permissions.can_access_admin) {
      router.replace("/login?error=forbidden");
    }
  }, [loading, user, pathname, router]);

  const login = useCallback(
    async (loginValue: string, password: string, totpCode?: string) => {
      const response = await api.post<{ user: CurrentUser }>("/auth/login/", {
        login: loginValue,
        password,
        ...(totpCode ? { totp_code: totpCode } : {}),
      });
      setUser(response.user);
      await queryClient.invalidateQueries();
      return response.user;
    },
    [queryClient],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const response = await api.post<{ user: CurrentUser }>("/auth/google/", { credential });
      setUser(response.user);
      await queryClient.invalidateQueries();
      return response.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
    setUser(null);
    queryClient.clear();
    // Admin paneldan chiqilsa — kirish sahifasiga, saytdan chiqilsa — bosh sahifaga
    router.replace(pathname?.startsWith("/admin") ? "/login" : "/");
  }, [queryClient, router, pathname]);

  const value = useMemo(
    () => ({ user, loading, login, loginWithGoogle, logout, refresh, setUser }),
    [user, loading, login, loginWithGoogle, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth AuthProvider ichida ishlatilishi kerak");
  return context;
}

/** Rol asosidagi ruxsatlarni tekshirish uchun qulay hook. */
export function usePermissions() {
  const { user } = useAuth();
  return (
    user?.permissions ?? {
      is_admin: false,
      is_moderator: false,
      can_access_admin: false,
      can_manage_users: false,
      can_manage_problems: false,
      can_manage_settings: false,
      can_moderate_content: false,
      codes: [],
    }
  );
}

/** Granular ruxsat kodini tekshiradi (`problems.delete` kabi). */
export function useCan() {
  const permissions = usePermissions();
  return (code: string) => permissions.codes.includes(code);
}

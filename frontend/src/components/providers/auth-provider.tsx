"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { CurrentUser, Permissions } from "@/lib/types";

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

  // Studio marshrutlarini himoyalash.
  //
  // `/admin` bu yerda TEKSHIRILMAYDI: u Django adminiga tegishli va Next
  // sahifasi emas (`next.config.mjs` dagi rewrite). Uni Django o'zi
  // himoyalaydi — o'z login sahifasi va `is_staff` tekshiruvi bilan.
  useEffect(() => {
    if (loading) return;
    const isStudioRoute = pathname?.startsWith("/studio");
    if (isStudioRoute && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? "/studio")}`);
    }
    // Kirgan, lekin huquqi yo'q foydalanuvchi BU YERDA yo'naltirilmaydi:
    // StudioShell unga «Studio yopiq» ekranini ko'rsatadi. Login sahifasiga
    // haydash chalg'itardi — u allaqachon tizimda, muammo hisobda emas,
    // rolda.
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
    router.replace(pathname?.startsWith("/studio") ? "/login" : "/");
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

/** Kirmagan foydalanuvchi uchun — hech narsaga ruxsat yo'q.
 *  Tip ATAYLAB e'lon qilingan: `Permissions` ga yangi maydon qo'shilsa,
 *  bu yerda ham to'ldirilmagani kompilyatsiyada ko'rinadi. */
const NO_PERMISSIONS: Permissions = {
  is_admin: false,
  is_moderator: false,
  is_setter: false,
  can_access_admin: false,
  can_access_studio: false,
  can_manage_users: false,
  can_manage_problems: false,
  can_manage_settings: false,
  can_moderate_content: false,
  codes: [],
};

/** Rol asosidagi ruxsatlarni tekshirish uchun qulay hook. */
export function usePermissions(): Permissions {
  const { user } = useAuth();
  return user?.permissions ?? NO_PERMISSIONS;
}

/** Granular ruxsat kodini tekshiradi (`problems.delete` kabi). */
export function useCan() {
  const permissions = usePermissions();
  return (code: string) => permissions.codes.includes(code);
}

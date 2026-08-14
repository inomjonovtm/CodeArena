"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "codearena-theme";

/* ==========================================================================
   Sukut bo'yicha rejim — YORUG'
   --------------------------------------------------------------------------
   Ilgari bu yerda `"system"` turardi: tizimida qorong'i rejim yoqilgan
   foydalanuvchi saytni birinchi marta ochganda TO'Q sahifani ko'rardi.

   Dizayn tizimi esa oq qog'oz ustiga qurilgan — yashil aksent aynan sof
   oq fonda ishlaydi. Qorong'i rejim tizimda bor va u to'liq ishlaydi,
   lekin u endi TANLOV: foydalanuvchi uni panel orqali ataylab yoqadi.
   Operatsion tizim sozlamasi mahsulotning ko'rinishini o'zi almashtirmaydi.

   Tanlov `localStorage` da saqlanadi, ya'ni bir marta tanlagan odam uni
   har safar qayta tanlamaydi. "Tizim bo'yicha" varianti ham qoladi —
   uni panelda o'zi tanlash mumkin.
   ========================================================================== */
const DEFAULT_MODE: ThemeMode = "light";

/** SSR paytida flash bo'lmasligi uchun `<head>` ichiga qo'yiladigan skript. */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}") || "${DEFAULT_MODE}";
    var isDark = stored === "dark" ||
      (stored === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch (e) {}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  const applyTheme = useCallback((next: ThemeMode) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = next === "dark" || (next === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    setResolved(isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? DEFAULT_MODE;
    setModeState(stored);
    applyTheme(stored);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if ((localStorage.getItem(STORAGE_KEY) as ThemeMode | null) === "system") applyTheme("system");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [applyTheme]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      localStorage.setItem(STORAGE_KEY, next);
      setModeState(next);
      applyTheme(next);
    },
    [applyTheme],
  );

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme ThemeProvider ichida ishlatilishi kerak");
  return context;
}

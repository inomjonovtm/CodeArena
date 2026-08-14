"use client";

import Editor, { type BeforeMount, loader } from "@monaco-editor/react";
import { Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useTheme } from "@/components/providers";
import { cn } from "@/lib/utils";

/**
 * Muharrir fayllarini O'Z SERVERIMIZDAN yuklaymiz.
 *
 * Sukut bo'yicha `@monaco-editor/react` ularni jsdelivr CDN'idan tortadi.
 * CDN bloklangan tarmoqda (mintaqaviy filtrlar, korxona proksisi) kod
 * muharriri umuman ochilmasdi — ya'ni saytning asosiy funksiyasi tashqi
 * xizmatga bog'lanib qolgan edi. Fayllar `scripts/copy-monaco.mjs` orqali
 * har build oldidan `public/monaco/vs` ga ko'chiriladi.
 */
loader.config({ paths: { vs: "/monaco/vs" } });

/**
 * Yuklashni MODUL darajasida boshlaymiz — komponent o'rnatilishini kutmasdan.
 *
 * Monaco ~2 MB. Yuklash `<Editor>` o'rnatilgandan KEYIN boshlansa, u masala
 * ma'lumotlari kelib, sahifa chizilib bo'lgandan so'nggina navbatga
 * turadi — foydalanuvchi tayyor sahifada spinnerga qarab o'tiradi. Modul
 * import qilinishi bilan boshlansa, yuklash sahifaning o'z so'rovlari bilan
 * PARALLEL ketadi. Modul faqat muharrir kerak bo'lgan sahifalarga
 * import qilinadi, ya'ni ortiqcha trafik yuzaga kelmaydi.
 *
 * `typeof window` tekshiruvi shart: bu "use client" moduli bo'lsa ham,
 * Next uni server tomonda ham baholaydi va u yerda `document` yo'q.
 */
if (typeof window !== "undefined") {
  // Xato yutiladi: yuklanmasa `<Editor>` o'z zaxira holatini ko'rsatadi.
  void loader.init().catch(() => {});
}

const MONACO_LANGUAGE: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  cpp: "cpp",
  markdown: "markdown",
  json: "json",
  plaintext: "plaintext",
};

const DARK = "codearena-dark";
const LIGHT = "codearena-light";

/**
 * Temalarni muharrir yaratilishidan OLDIN ro'yxatdan o'tkazadi.
 *
 * Ilgari bu `onMount` da bo'lgan — ya'ni Monaco temani allaqachon
 * qo'llagandan keyin. Nomi tanilmagani uchun standart yorug' `vs` ishlatilar
 * va muharrir goh oq, goh qora bo'lib chiqardi. `beforeMount` bu poygani
 * butunlay yo'q qiladi.
 *
 * Ranglar dizayn tokenlaridan ko'chirilgan (qiymatlar qat'iy: Monaco `var()` ni
 * tushunmaydi). Yorug' rejim — sof OQ maydon, faol qator zo'rg'a sezilarli
 * yashil nafas; to'q rejim esa `--code-bg` sirti, ya'ni chuqur zumrad-qora.
 */
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#04170f", // --code-bg
      "editor.foreground": "#e8f6ee", // --code-text
      "editor.lineHighlightBackground": "#0a2419", // --code-bg-2
      "editor.selectionBackground": "#17513a", // yashil tanlov
      "editorLineNumber.foreground": "#5f8a74",
      "editorLineNumber.activeForeground": "#9dc4b1", // --code-text-2
      "editorGutter.background": "#04170f",
      "editorIndentGuide.background1": "#17392a", // --code-line
      "editorCursor.foreground": "#4fe0a2", // --code-key
      "editorWidget.background": "#0a2419",
      "editorWidget.border": "#17392a",
    },
  });
  monaco.editor.defineTheme(LIGHT, {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff", // --surface
      "editor.foreground": "#0b221a", // --text
      "editor.lineHighlightBackground": "#f4faf7", // --surface-sunk
      "editor.selectionBackground": "#d3f2e3", // --green-wash-2
      "editorLineNumber.foreground": "#9dbaac",
      "editorLineNumber.activeForeground": "#5e7c6f", // --text-4
      "editorGutter.background": "#ffffff",
      "editorIndentGuide.background1": "#eff7f3", // --line-soft
      "editorCursor.foreground": "#00814e", // --green
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#e3efe8", // --line
    },
  });
};

/**
 * Kod muharriri — oq karta ramkasi ichida.
 * Tema `.dark` klassiga ergashadi; `forceTheme` bilan majburlash mumkin.
 */
export function CodeEditor({
  value,
  onChange,
  language = "python",
  height = "22rem",
  readOnly,
  className,
  forceTheme,
  expandable = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  className?: string;
  /** Temani majburlash — chaqiruvchi qat'iy ko'rinish talab qilsa. */
  forceTheme?: "dark" | "light";
  /** To'liq ekranga kengaytirish tugmasini ko'rsatadi. */
  expandable?: boolean;
}) {
  const { resolved } = useTheme();
  const theme = forceTheme ?? resolved;
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // To'liq ekranda sahifa aylanmasin va Escape bilan yopilsin
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  const renderEditor = useCallback(
    (editorHeight: string | number) => (
      <Editor
        height={editorHeight}
        language={MONACO_LANGUAGE[language] ?? language}
        theme={theme === "dark" ? DARK : LIGHT}
        value={value}
        onChange={(next) => onChange?.(next ?? "")}
        beforeMount={defineThemes}
        loading={
          <div className="flex h-full items-center justify-center bg-[var(--surface)]">
            <Loader2 className="size-5 animate-spin text-[var(--green)]" />
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          renderLineHighlight: "line",
          padding: { top: 12, bottom: 12 },
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          overviewRulerLanes: 0,
          wordWrap: "on",
        }}
      />
    ),
    [language, onChange, readOnly, theme, value],
  );

  const expandButton = expandable ? (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      title="Kattalashtirish"
      aria-label="Kattalashtirish"
      className={cn(
        "ring-focus absolute right-2.5 top-2.5 z-10 inline-flex size-8 items-center justify-center",
        "rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] text-[var(--text-3)]",
        "shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-1)]",
        "hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
      )}
    >
      <Maximize2 className="size-3.5" />
    </button>
  ) : null;

  return (
    <>
      <div
        className={cn(
          "card relative overflow-hidden rounded-[var(--radius-sm)]",
          className,
        )}
      >
        {expandButton}
        {renderEditor(height)}
      </div>

      {/*
        To'liq ekran ATAYLAB `document.body` ga portal qilinadi: `position: fixed`
        `transform` yoki `filter` qo'llangan ota-element ichida viewportga emas,
        o'sha elementga nisbatan hisoblanadi va oyna karta ichida qolib ketardi.
      */}
      {expanded && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[95] flex flex-col bg-[var(--bg)] p-3 sm:p-4">
              <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
                <span className="ts-label normal-case tracking-normal">
                  {MONACO_LANGUAGE[language] ?? language}
                </span>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  title="Kichraytirish (Esc)"
                  aria-label="Kichraytirish"
                  className={cn(
                    "ring-focus inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3",
                    "bg-[var(--surface-sunk)] text-[14px] font-medium text-[var(--text-2)]",
                    "transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
                  )}
                >
                  <Minimize2 className="size-3.5" />
                  Kichraytirish
                  <X className="size-3.5 text-[var(--text-4)]" />
                </button>
              </div>
              <div className="card min-h-0 flex-1 overflow-hidden rounded-[var(--radius-lg)]">
                {renderEditor("100%")}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

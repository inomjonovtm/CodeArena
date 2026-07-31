"use client";

import Editor, { type BeforeMount } from "@monaco-editor/react";
import { Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useTheme } from "@/components/providers";
import { cn } from "@/lib/utils";

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
 * tushunmaydi). Yorug' rejim — sof oq maydon, faol qator iliq kul.
 */
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#171717", // --pane (dark)
      "editor.foreground": "#fafafa", // --ink (dark)
      "editor.lineHighlightBackground": "#1f1f1f", // --pane-hover (dark)
      "editor.selectionBackground": "#172c56", // --brand-wash-strong (dark)
      "editorLineNumber.foreground": "#737373", // --ink-4 (dark)
      "editorLineNumber.activeForeground": "#a3a3a3", // --ink-3 (dark)
      "editorGutter.background": "#171717",
      "editorIndentGuide.background1": "#262626",
      "editorCursor.foreground": "#4c7fff", // --brand (dark)
      "editorWidget.background": "#1f1f1f",
      "editorWidget.border": "#262626",
    },
  });
  monaco.editor.defineTheme(LIGHT, {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff", // --pane
      "editor.foreground": "#0a0a0a", // --ink
      "editor.lineHighlightBackground": "#f5f5f5", // --pane-sunken
      "editor.selectionBackground": "#dce6ff", // --brand-wash-strong
      "editorLineNumber.foreground": "#a3a3a3", // --ink-4
      "editorLineNumber.activeForeground": "#737373", // --ink-3
      "editorGutter.background": "#ffffff",
      "editorIndentGuide.background1": "#efefef",
      "editorCursor.foreground": "#1e5eff", // --brand
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#e5e5e5",
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
          <div className="flex h-full items-center justify-center bg-[var(--pane-solid)]">
            <Loader2 className="size-5 animate-spin text-[var(--brand)]" />
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
        "focus-ring absolute right-2.5 top-2.5 z-10 inline-flex size-8 items-center justify-center",
        "rounded-[var(--r-ctl)] border border-[var(--edge)] bg-[var(--pane-solid)] text-[var(--ink-3)]",
        "shadow-[var(--lift-1)] transition-colors duration-[var(--t-fast)]",
        "hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
      )}
    >
      <Maximize2 className="size-3.5" />
    </button>
  ) : null;

  return (
    <>
      <div
        className={cn(
          "pane-solid relative overflow-hidden rounded-[var(--r-field)]",
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
            <div className="fixed inset-0 z-[95] flex flex-col bg-[var(--canvas)] p-3 sm:p-4">
              <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
                <span className="t-eyebrow font-mono normal-case tracking-normal">
                  {MONACO_LANGUAGE[language] ?? language}
                </span>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  title="Kichraytirish (Esc)"
                  aria-label="Kichraytirish"
                  className={cn(
                    "focus-ring inline-flex h-8 items-center gap-1.5 rounded-[var(--r-ctl)] px-3",
                    "bg-[var(--pane-sunken)] text-[13px] font-medium text-[var(--ink-2)]",
                    "transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
                  )}
                >
                  <Minimize2 className="size-3.5" />
                  Kichraytirish
                  <X className="size-3.5 text-[var(--ink-4)]" />
                </button>
              </div>
              <div className="pane-solid min-h-0 flex-1 overflow-hidden rounded-[var(--r-pane)]">
                {renderEditor("100%")}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

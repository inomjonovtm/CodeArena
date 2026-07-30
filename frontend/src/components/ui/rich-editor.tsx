"use client";

import {
  Bold,
  Code,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  PencilLine,
  Quote,
  SquareCode,
  Strikethrough,
  Table as TableIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import { Markdown } from "./markdown";

const TABLE_TEMPLATE =
  "| Ustun 1 | Ustun 2 | Ustun 3 |\n| --- | --- | --- |\n| qiymat | qiymat | qiymat |\n";

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}

/**
 * Word-uslubidagi Markdown muharriri: formatlash toolbar'i, jonli ko'rinish,
 * to'liq ekran rejimi va Ctrl+B / Ctrl+I / Ctrl+K yorliqlari.
 */
export function RichEditor({
  value,
  onChange,
  placeholder,
  minRows = 12,
  className,
}: RichEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* To'liq ekranda: sahifa aylanmaydi, Escape yopadi. */
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [fullscreen]);

  /** Tanlangan matnni `before`/`after` bilan o'raydi. */
  const wrap = useCallback(
    (before: string, after = before, sample = "matn") => {
      const el = ref.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selectedText = value.slice(start, end) || sample;
      const next = value.slice(0, start) + before + selectedText + after + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      });
    },
    [value, onChange],
  );

  /** Tanlangan qatorlar boshiga prefiks qo'yadi (ro'yxat, sarlavha, iqtibos). */
  const prefixLines = useCallback(
    (prefix: string, numbered = false) => {
      const el = ref.current;
      if (!el) return;
      const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
      const rawEnd = value.indexOf("\n", el.selectionEnd);
      const end = rawEnd === -1 ? value.length : rawEnd;
      const block = value.slice(start, end) || "matn";
      const updated = block
        .split("\n")
        .map((line, index) => (numbered ? `${index + 1}. ` : prefix) + line.replace(/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s)/, ""))
        .join("\n");
      onChange(value.slice(0, start) + updated + value.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start + updated.length);
      });
    },
    [value, onChange],
  );

  /** Kursor turgan joyga blok qo'shadi (jadval, kod blok, chiziq). */
  const insertBlock = useCallback(
    (block: string) => {
      const el = ref.current;
      if (!el) return;
      const start = el.selectionStart;
      const needsNewline = start > 0 && value[start - 1] !== "\n" ? "\n\n" : "";
      const next = value.slice(0, start) + needsNewline + block + value.slice(el.selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + needsNewline.length + block.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [value, onChange],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      wrap("**");
    } else if (key === "i") {
      event.preventDefault();
      wrap("*");
    } else if (key === "k") {
      event.preventDefault();
      wrap("[", "](https://)", "havola");
    }
  };

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  const ToolButton = ({
    title,
    onClick,
    children,
  }: {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "focus-ring flex size-8 shrink-0 items-center justify-center rounded-[var(--r-ctl)]",
        "text-[var(--ink-3)] transition-colors duration-[var(--t-fast)]",
        "hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
      )}
    >
      {children}
    </button>
  );

  const Divider = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-[var(--edge)]" />;

  const shell = (
    <div
      className={cn(
        // Oq karta: uzun matn shu sirtda eng yaxshi o'qiladi
        "pane-solid overflow-hidden rounded-[var(--r-pane)]",
        "transition-[border-color,box-shadow] duration-[var(--t-fast)]",
        "focus-within:border-[var(--brand-edge)] focus-within:shadow-[0_0_0_var(--focus-w)_var(--focus)]",
        fullscreen ? "flex h-full flex-col shadow-[var(--lift-pop)]" : className,
      )}
    >
      {/* ------------------------------------------------------- toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--edge)] bg-[var(--pane-sunken)] px-2 py-1.5">
        <ToolButton title="Qalin (Ctrl+B)" onClick={() => wrap("**")}>
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton title="Kursiv (Ctrl+I)" onClick={() => wrap("*")}>
          <Italic className="size-4" />
        </ToolButton>
        <ToolButton title="Ustiga chizilgan" onClick={() => wrap("~~")}>
          <Strikethrough className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton title="Sarlavha 1" onClick={() => prefixLines("# ")}>
          <Heading1 className="size-4" />
        </ToolButton>
        <ToolButton title="Sarlavha 2" onClick={() => prefixLines("## ")}>
          <Heading2 className="size-4" />
        </ToolButton>
        <ToolButton title="Sarlavha 3" onClick={() => prefixLines("### ")}>
          <Heading3 className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton title="Ro'yxat" onClick={() => prefixLines("- ")}>
          <List className="size-4" />
        </ToolButton>
        <ToolButton title="Raqamli ro'yxat" onClick={() => prefixLines("", true)}>
          <ListOrdered className="size-4" />
        </ToolButton>
        <ToolButton title="Iqtibos" onClick={() => prefixLines("> ")}>
          <Quote className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton title="Inline kod" onClick={() => wrap("`", "`", "kod")}>
          <Code className="size-4" />
        </ToolButton>
        <ToolButton title="Kod blok" onClick={() => insertBlock("```python\n# kod\n```\n")}>
          <SquareCode className="size-4" />
        </ToolButton>
        <ToolButton title="Havola (Ctrl+K)" onClick={() => wrap("[", "](https://)", "havola")}>
          <Link2 className="size-4" />
        </ToolButton>
        <ToolButton title="Rasm" onClick={() => insertBlock("![tavsif](https://rasm-manzili)\n")}>
          <ImageIcon className="size-4" />
        </ToolButton>
        <ToolButton title="Jadval" onClick={() => insertBlock(TABLE_TEMPLATE)}>
          <TableIcon className="size-4" />
        </ToolButton>
        <ToolButton title="Ajratuvchi chiziq" onClick={() => insertBlock("---\n")}>
          <Minus className="size-4" />
        </ToolButton>

        <div className="ml-auto flex items-center gap-2">
          <span className="t-num hidden whitespace-nowrap text-[11px] text-[var(--ink-4)] sm:block">
            {words} so&apos;z
          </span>
          {/* Yozish / Ko'rish — botiq trek ichida oq tugma */}
          <div className="flex items-center gap-0.5 rounded-[var(--r-ctl)] border border-[var(--edge)] bg-[var(--pane-sunken)] p-0.5">
            {(
              [
                { key: "write" as const, label: "Yozish", icon: PencilLine },
                { key: "preview" as const, label: "Ko'rish", icon: Eye },
              ]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                aria-pressed={mode === tab.key}
                className={cn(
                  "focus-ring flex items-center gap-1 rounded-[6px] px-2.5 py-1",
                  "text-[11.5px] font-medium transition-colors duration-[var(--t-fast)]",
                  mode === tab.key
                    ? "bg-[var(--pane-solid)] text-[var(--ink)] shadow-[var(--lift-1),0_0_0_1px_var(--edge-soft)]"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)]",
                )}
              >
                <tab.icon className="size-3" />
                {tab.label}
              </button>
            ))}
          </div>
          <ToolButton
            title={fullscreen ? "Kichraytirish (Esc)" : "To'liq ekran"}
            onClick={() => setFullscreen((state) => !state)}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </ToolButton>
        </div>
      </div>

      {/* ----------------------------------------------------------- tana */}
      {mode === "write" ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={fullscreen ? undefined : minRows}
          className={cn(
            "w-full resize-y bg-[var(--pane-solid)] px-4 py-3 font-mono text-[13px] leading-relaxed",
            "text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]",
            fullscreen && "flex-1 resize-none",
          )}
        />
      ) : (
        <div
          className={cn(
            "scrollbar-thin overflow-y-auto px-5 py-4",
            fullscreen ? "flex-1" : "max-h-[32rem]",
          )}
          style={fullscreen ? undefined : { minHeight: `${minRows * 1.4}rem` }}
        >
          {value.trim() ? (
            <Markdown source={value} />
          ) : (
            <p className="t-body text-[var(--ink-4)]">Ko&apos;rish uchun avval matn yozing...</p>
          )}
        </div>
      )}
    </div>
  );

  if (!fullscreen) return shell;

  /*
    To'liq ekran ATAYLAB `document.body` ga portal qilinadi.

    Ilgari muharrir joyida turib `position: fixed` olardi. `fixed` esa
    `transform`/`filter` qo'llangan ota-element ichida oynaga emas, O'SHA
    elementga nisbatan hisoblanadi — sahifadagi `.enter` animatsiyasi aynan
    `transform` beradi. Natijada "to'liq ekran" karta ichida qamalib qolar,
    yuqori qismi esa yopishqoq navigatsiya panelining ostiga kirib ketardi.

    Qatlam raqami — `--z-overlay` (95): navbar (50) va mobil tab-panel (60)
    dan yuqori, modal (100) dan past.
  */
  return (
    <>
      {/* Joyida bo'sh o'rin qoladi — forma "sakrab" qisqarib ketmaydi */}
      <div
        aria-hidden
        className={cn("pane-sunken rounded-[var(--r-pane)]", className)}
        style={{ minHeight: `${minRows * 1.5}rem` }}
      />
      {mounted
        ? createPortal(
            <div className="fixed inset-0 z-[95] flex flex-col bg-[var(--canvas)] p-3 sm:p-5">
              {shell}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

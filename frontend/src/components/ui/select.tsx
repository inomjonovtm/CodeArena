"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Popover } from "./popover";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

type ListboxVariant = "form" | "filter" | "compact";

interface ListboxProps {
  value: string;
  onSelect: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  variant?: ListboxVariant;
  clearable?: boolean;
  className?: string;
  align?: "left" | "right";
  /** Ekran o'quvchilar uchun nom (ko'rinadigan label bo'lmasa). */
  ariaLabel?: string;
}

/**
 * Dropdown: tanlangan qatorda brend checkmark, ichki qidiruv, pane-float
 * paneli. Klaviatura bilan to'liq boshqariladi (↑ ↓ Enter Esc Home End
 * va harf terib qidirish) va portal orqali chiziladi — jadval ichida
 * kesilib qolmaydi.
 */
export function Listbox({
  value,
  onSelect,
  options,
  placeholder = "Tanlang...",
  searchable,
  disabled,
  invalid,
  variant = "form",
  clearable,
  className,
  align = "left",
  ariaLabel,
}: ListboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const listId = useId();

  const selected = options.find((option) => option.value === value);
  const hasValue = value !== "" && value !== undefined && value !== null;
  const showSearch = searchable ?? options.length > 9;

  const filtered = useMemo(
    () =>
      query
        ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
        : options,
    [options, query],
  );

  // Ochilganda tanlangan variantdan boshlaymiz
  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const index = options.findIndex((option) => option.value === value);
    setHighlight(index >= 0 ? index : 0);
    if (showSearch) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, options, value, showSearch]);

  // Qidiruv o'zgarganda birinchi natijaga o'tamiz
  useEffect(() => setHighlight(0), [query]);

  // Belgilangan variantni ko'rinish maydoniga tortamiz
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const commit = (option?: SelectOption) => {
    if (!option || option.disabled) return;
    onSelect(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const move = (delta: number) => {
    if (!filtered.length) return;
    setHighlight((current) => {
      let next = current;
      // O'chirilgan variantlarni tashlab ketamiz
      for (let step = 0; step < filtered.length; step += 1) {
        next = (next + delta + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) break;
      }
      return next;
    });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        setHighlight(0);
        break;
      case "End":
        event.preventDefault();
        setHighlight(filtered.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        commit(filtered[highlight]);
        break;
      case "Tab":
        setOpen(false);
        break;
      default: {
        // Harf terib qidirish — qidiruv maydoni yo'q bo'lganda
        if (showSearch || event.key.length !== 1 || event.metaKey || event.ctrlKey) return;
        const now = Date.now();
        typeahead.current.text = now - typeahead.current.at > 800 ? event.key : typeahead.current.text + event.key;
        typeahead.current.at = now;
        const term = typeahead.current.text.toLowerCase();
        const index = filtered.findIndex((option) => option.label.toLowerCase().startsWith(term));
        if (index >= 0) setHighlight(index);
      }
    }
  };

  const triggerClass =
    variant === "filter"
      ? cn(
          "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[var(--r-ctl)] border px-3.5 text-[13px] font-medium focus-ring",
          "transition-[background-color,border-color,color] duration-[var(--t-fast)]",
          hasValue
            ? "border-[var(--brand-edge)] bg-[var(--brand-wash)] text-[var(--brand-ink)]"
            : "border-[var(--edge)] bg-[var(--pane-sunken)] text-[var(--ink-2)] hover:border-[var(--edge-strong)] hover:text-[var(--ink)]",
        )
      : variant === "compact"
        ? cn(
            "inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-[var(--r-ctl)] border border-[var(--edge)]",
            "bg-[var(--pane-sunken)] px-2.5 text-xs text-[var(--ink)] focus-ring",
            "transition-colors duration-[var(--t-fast)] hover:border-[var(--edge)]",
          )
        : cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-[var(--r-field)] border px-3.5 text-[13.5px] focus-ring",
            "bg-[var(--pane-sunken)] text-[var(--ink)]",
            "transition-[background-color,border-color,box-shadow] duration-[var(--t-fast)]",
            invalid ? "border-[var(--bad)]" : "border-[var(--edge)] hover:border-[var(--edge)]",
            open &&
              "border-[var(--brand-edge)] bg-[var(--pane-solid)] shadow-[0_0_0_var(--focus-w)_var(--focus)]",
          );

  return (
    <div className={cn(variant === "filter" ? "inline-block" : "w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((state) => !state)}
        onKeyDown={onKeyDown}
        className={cn(triggerClass, disabled && "cursor-not-allowed opacity-55")}
      >
        <span className={cn("truncate", !hasValue && variant !== "filter" && "text-[var(--ink-4)]")}>
          {selected?.label ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && hasValue ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Tozalash"
              onClick={(event) => {
                event.stopPropagation();
                onSelect("");
              }}
              className="rounded-[var(--r-chip)] p-0.5 opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="size-3.5" />
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-4 text-[var(--ink-4)] transition-transform duration-[var(--t-base)] ease-[var(--ease-snap)]",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      <Popover
        anchor={triggerRef.current}
        open={open}
        onClose={() => setOpen(false)}
        align={align === "right" ? "end" : "start"}
        matchWidth={variant !== "filter"}
        minWidth={variant === "filter" ? 200 : 0}
        role="presentation"
        className="max-w-[22rem]"
      >
        {showSearch ? (
          <div className="shrink-0 border-b border-[var(--edge)] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-4)]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Qidirish..."
                aria-label="Variantlar ichidan qidirish"
                className={cn(
                  "h-8 w-full rounded-[var(--r-ctl)] border border-[var(--edge)] bg-[var(--pane-sunken)] pl-8 pr-2",
                  "text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]",
                  "transition-colors duration-[var(--t-fast)] focus:border-[var(--brand-edge)] focus:bg-[var(--pane-solid)]",
                )}
              />
            </div>
          </div>
        ) : null}

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel ?? placeholder}
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[var(--ink-4)]">Natija topilmadi</p>
          ) : (
            filtered.map((option, index) => {
              const isActive = option.value === value;
              const isHighlighted = index === highlight;
              return (
                <button
                  key={option.value || "__all__"}
                  data-index={index}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  tabIndex={-1}
                  disabled={option.disabled}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => commit(option)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[var(--r-ctl)] px-2.5 py-2 text-left text-[13px]",
                    "transition-colors duration-[var(--t-fast)]",
                    isActive ? "font-medium text-[var(--brand-ink)]" : "text-[var(--ink-2)]",
                    isHighlighted && !option.disabled && "bg-[var(--pane-sunken)]",
                    isActive && "bg-[var(--brand-wash)]",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <Check className={cn("size-4 shrink-0 text-[var(--brand)]", !isActive && "invisible")} />
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? (
                      <span className="block truncate text-[11px] text-[var(--ink-4)]">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </Popover>
    </div>
  );
}

// ------------------------------------------------------------------ Select
// Eski `<select>` bilan mos API: `onChange(event.target.value)` ishlashda davom etadi.
export interface SelectProps {
  value: string | number | undefined;
  onChange?: (event: { target: { value: string } }) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  searchable?: boolean;
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

export function Select({
  value,
  onChange,
  options = [],
  placeholder,
  disabled,
  invalid,
  searchable,
  compact,
  className,
  ariaLabel,
}: SelectProps) {
  const merged = placeholder ? [{ value: "", label: placeholder }, ...options] : options;
  return (
    <Listbox
      variant={compact ? "compact" : "form"}
      value={String(value ?? "")}
      onSelect={(next) => onChange?.({ target: { value: next } })}
      options={merged}
      placeholder={placeholder}
      disabled={disabled}
      invalid={invalid}
      searchable={searchable}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

// ------------------------------------------------------------- FilterSelect
/** Jadval ustidagi filtr tugmasi — "Barcha rollar" kabi. */
export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  label,
  searchable,
  className,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  allLabel: string;
  /** Filtr panelidagi katakcha sarlavhasi (boshqaruv ustida). */
  label?: string;
  searchable?: boolean;
  className?: string;
}) {
  const control = (
    <Listbox
      variant="filter"
      value={value ?? ""}
      onSelect={onChange}
      options={[{ value: "", label: allLabel }, ...options]}
      placeholder={allLabel}
      searchable={searchable}
      clearable
      className={cn(label && "w-full [&>button]:w-full", className)}
      ariaLabel={label ?? allLabel}
    />
  );

  if (!label) return control;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="t-eyebrow">{label}</span>
      {control}
    </div>
  );
}

// ------------------------------------------------------------ PageSizeSelect
export function PageSizeSelect({
  value,
  onChange,
  sizes = [10, 25, 50, 100],
}: {
  value: number;
  onChange: (size: number) => void;
  sizes?: number[];
}) {
  return (
    <Listbox
      variant="compact"
      value={String(value)}
      onSelect={(next) => onChange(Number(next))}
      options={sizes.map((size) => ({ value: String(size), label: `${size} ta` }))}
      className="w-20"
      align="left"
      ariaLabel="Sahifadagi yozuvlar soni"
    />
  );
}

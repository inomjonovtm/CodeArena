"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  Columns3,
  Download,
  Inbox,
  Minus,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/providers";
import { cn, downloadCsv, formatNumber } from "@/lib/utils";

import { Button } from "./button";
import { EmptyState, Skeleton } from "./card";
import { Pagination } from "./pagination";
import { Popover } from "./popover";
import { PageSizeSelect } from "./select";

/**
 * Jadval katakchasi.
 *
 * Brauzerning tug'ma `accent-color` katakchasi platformadan platformaga
 * turlicha chiziladi va tanlangan holatda brend ko'ki xira chiqadi. Shuning
 * uchun kvadrat o'zimizniki: `appearance-none` input + ustidagi belgi.
 * Klaviatura, `indeterminate` va ekran o'qigichlar tug'ma xulqda qoladi.
 */
function TableCheck({
  checked,
  indeterminate,
  onChange,
  label,
  className,
  onClick,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}) {
  return (
    <span className={cn("relative inline-flex size-4 shrink-0 items-center justify-center", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        aria-label={label}
        ref={(node) => {
          if (node) node.indeterminate = Boolean(indeterminate);
        }}
        className={cn(
          "peer size-4 cursor-pointer appearance-none rounded-[5px] focus-ring",
          "border border-[var(--edge-strong)] bg-[var(--pane-solid)]",
          "transition-[background-color,border-color] duration-[var(--t-fast)]",
          "hover:border-[var(--brand)]",
          "checked:border-[var(--brand)] checked:bg-[var(--brand)]",
          "indeterminate:border-[var(--brand)] indeterminate:bg-[var(--brand)]",
        )}
      />
      <Check
        aria-hidden
        strokeWidth={3.2}
        className={cn(
          "pointer-events-none absolute size-3 text-[var(--ink-on-brand)] opacity-0",
          "peer-checked:opacity-100 peer-indeterminate:opacity-0",
        )}
      />
      <Minus
        aria-hidden
        strokeWidth={3.2}
        className="pointer-events-none absolute size-3 text-[var(--ink-on-brand)] opacity-0 peer-indeterminate:opacity-100"
      />
    </span>
  );
}

/**
 * Filtr panelidagi bitta katakcha — sarlavha ustida, boshqaruv ostida.
 *
 * Barcha filtrlar bir xil ko'rinishda bo'lishi uchun: ilgari har bir sahifa
 * o'zicha o'lcham berardi va panel ichida ular turlicha chiqib qolardi.
 */
export function FilterCell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="t-eyebrow">{label}</span>
      {children}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Backend `ordering=` uchun maydon nomi. Berilmasa ustun sortlanmaydi. */
  sortKey?: string;
  render: (row: T) => React.ReactNode;
  /** CSV eksport uchun tekst qiymati. */
  csv?: (row: T) => string | number | null | undefined;
  className?: string;
  headerClassName?: string;
  width?: string;
  hideable?: boolean;
  defaultHidden?: boolean;
  align?: "left" | "center" | "right";
  /** Gorizontal scrollda o'ng chetga yopishib turadi (amallar ustuni). */
  sticky?: boolean;
  /** Mobil kartada asosiy sarlavha sifatida ko'rsatiladi. */
  mobilePrimary?: boolean;
  /** Mobil kartada umuman ko'rsatilmaydi. */
  mobileHidden?: boolean;
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onRun: (ids: (string | number)[]) => unknown | Promise<unknown>;
}

type Density = "comfortable" | "compact";

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  ordering?: string;
  onOrderingChange?: (ordering: string) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  selectable?: boolean;
  bulkActions?: BulkAction[];
  /** Asboblar kartasining chap chekkasidagi blok sarlavhasi. */
  title?: React.ReactNode;
  /** Toolbar o'ng tomonidagi qo'shimcha tugmalar. */
  toolbar?: React.ReactNode;
  /**
   * Filtr maydonlari. Har bir bola alohida katakcha bo'lib, yig'iladigan
   * panel ichida to'rga (grid) joylashadi.
   */
  filtersSlot?: React.ReactNode;
  /** Panel ustunlari soni (keng filtrlar uchun kamaytirish mumkin). */
  filterColumns?: 2 | 3 | 4;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  exportName?: string;
  /** Berilsa - eksport backend orqali BARCHA yozuvlarni oladi. */
  serverExportUrl?: string;
  /** Joriy filtr parametrlari - server eksporti uchun. */
  exportParams?: Record<string, unknown>;
  /** Toolbar tagida ko'rinadigan saqlangan ko'rinishlar. */
  savedViewsSlot?: React.ReactNode;
  /** Ustun ko'rinishi va zichligini brauzerda saqlash uchun kalit. */
  tableId?: string;
  className?: string;
}

interface Prefs {
  hidden: string[];
  density: Density;
}

function readPrefs(key: string | undefined): Prefs | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`codearena-table-${key}`);
    return raw ? (JSON.parse(raw) as Prefs) : null;
  } catch {
    return null;
  }
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  loading,
  page = 1,
  pageSize = 10,
  totalCount = 0,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  ordering,
  onOrderingChange,
  search,
  onSearchChange,
  searchPlaceholder,
  selectable,
  bulkActions,
  title,
  toolbar,
  filtersSlot,
  filterColumns = 4,
  activeFilterCount = 0,
  onClearFilters,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyAction,
  exportName,
  serverExportUrl,
  exportParams,
  savedViewsSlot,
  tableId,
  className,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const prefsKey = tableId ?? exportName ?? serverExportUrl;

  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)),
  );
  const [density, setDensity] = useState<Density>("comfortable");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search ?? "");
  const columnsButtonRef = useRef<HTMLButtonElement>(null);
  const prefsLoaded = useRef(false);

  // Saqlangan sozlamalar — birinchi renderdan keyin bir marta
  useEffect(() => {
    const stored = readPrefs(prefsKey);
    if (stored) {
      setHidden(new Set(stored.hidden ?? []));
      if (stored.density) setDensity(stored.density);
    }
    prefsLoaded.current = true;
  }, [prefsKey]);

  useEffect(() => {
    if (!prefsKey || !prefsLoaded.current) return;
    localStorage.setItem(
      `codearena-table-${prefsKey}`,
      JSON.stringify({ hidden: [...hidden], density } satisfies Prefs),
    );
  }, [hidden, density, prefsKey]);

  useEffect(() => setSearchDraft(search ?? ""), [search]);

  // Qidiruvni debounce qilish
  useEffect(() => {
    if (!onSearchChange || searchDraft === (search ?? "")) return;
    const timer = setTimeout(() => onSearchChange(searchDraft), 350);
    return () => clearTimeout(timer);
  }, [searchDraft, search, onSearchChange]);

  useEffect(() => setSelected(new Set()), [page, pageSize, search]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hidden.has(column.key)),
    [columns, hidden],
  );

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(rowKey(row)));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(rowKey)));

  const toggleRow = (id: string | number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortState = (column: Column<T>): "asc" | "desc" | null => {
    if (!column.sortKey || !ordering) return null;
    if (ordering === column.sortKey) return "asc";
    if (ordering === `-${column.sortKey}`) return "desc";
    return null;
  };

  const toggleSort = (column: Column<T>) => {
    if (!column.sortKey || !onOrderingChange) return;
    onOrderingChange(sortState(column) === "asc" ? `-${column.sortKey}` : column.sortKey);
  };

  const handleExport = () => {
    // Server eksporti - filtrlarga mos BARCHA yozuvlar
    if (serverExportUrl) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(exportParams ?? {})) {
        if (value === undefined || value === null || value === "") continue;
        if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)));
        else params.append(key, String(value));
      }
      params.delete("page");
      params.delete("page_size");
      window.open(`/api${serverExportUrl}?${params.toString()}`, "_blank");
      return;
    }

    const data = rows.map((row) => {
      const record: Record<string, unknown> = {};
      for (const column of visibleColumns) {
        if (column.csv) record[column.key] = column.csv(row);
      }
      return record;
    });
    downloadCsv(exportName ?? "codearena-export", data);
  };

  // Filtr paneli ochiqmi. Aktiv filtr bo'lsa — o'zi ochiladi, aks holda
  // eslab qolingan holat ishlatiladi: filtr yopiq bo'lsa ham nima
  // qo'llanganini foydalanuvchi ko'rib turishi kerak.
  const filterKey = tableId ? `codearena-filters-open-${tableId}` : null;
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!filtersSlot) return;
    const stored = filterKey ? localStorage.getItem(filterKey) : null;
    setFiltersOpen(stored === null ? activeFilterCount > 0 : stored === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const toggleFilters = () => {
    setFiltersOpen((open) => {
      if (filterKey) localStorage.setItem(filterKey, open ? "0" : "1");
      return !open;
    });
  };

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const hasBulkBar = Boolean(selectable && selected.size > 0 && bulkActions?.length);

  // ~44px qator: 13px matn + py-3. Zich rejimda ~34px.
  const cellPad = density === "compact" ? "py-1.5" : "py-3";
  const headPad = density === "compact" ? "py-2" : "py-2.5";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* --------------------------------- asboblar bloki — o'z oq kartasi */}
      <div className="enter pane rounded-[var(--r-pane)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Blok sarlavhasi — kanvasda yalang'och turmasin, kartaning ichida */}
          {title ? (
            <h2 className="mr-1 min-w-0 truncate pl-1 text-[14px] font-semibold text-[var(--ink)]">
              {title}
            </h2>
          ) : null}
          {onSearchChange ? (
            <div className="relative min-w-[15rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-4)]" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder={searchPlaceholder ?? `${t.common.search}...`}
                aria-label={searchPlaceholder ?? t.common.search}
                className={cn(
                  "h-9 w-full rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)]",
                  "pl-9 pr-9 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)]",
                  "transition-[background-color,border-color,box-shadow] duration-[var(--t-fast)]",
                  "hover:border-[var(--edge)]",
                  "focus:border-[var(--brand)] focus:bg-[var(--pane-solid)] focus:shadow-[0_0_0_var(--focus-w)_var(--focus)]",
                )}
              />
              {searchDraft ? (
                <button
                  type="button"
                  onClick={() => setSearchDraft("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[var(--r-chip)] p-0.5 text-[var(--ink-4)] transition-colors hover:text-[var(--ink)] focus-ring"
                  aria-label={t.common.close}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}

          {filtersSlot ? (
            <button
              type="button"
              onClick={toggleFilters}
              aria-expanded={filtersOpen}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--r-ctl)] border px-3.5 text-[13px] font-medium focus-ring",
                "transition-[background-color,border-color,color] duration-[var(--t-fast)]",
                activeFilterCount > 0
                  ? "border-[var(--brand-edge)] bg-[var(--brand-wash)] text-[var(--brand-ink)]"
                  : "border-[var(--edge)] bg-[var(--pane)] text-[var(--ink-2)] hover:border-[var(--edge-strong)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              {t.common.filters}
              {activeFilterCount > 0 ? (
                <span className="t-num rounded-[var(--r-chip)] bg-[var(--brand)] px-1.5 text-[11px] font-semibold text-[var(--ink-on-brand)]">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {activeFilterCount > 0 && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--r-ctl)] px-3 text-[13px] font-medium text-[var(--bad)] transition-colors hover:bg-[var(--bad-wash)] focus-ring"
            >
              <X className="size-3.5" />
              {t.common.clearFilters}
            </button>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {onPageChange ? (
              <span className="t-meta hidden whitespace-nowrap text-[var(--ink-3)] lg:inline">
                Topildi:{" "}
                <strong className="t-num font-semibold text-[var(--ink)]">
                  {formatNumber(totalCount)}
                </strong>
              </span>
            ) : null}
            {toolbar}
            {exportName || serverExportUrl ? (
              <Button
                variant="outline"
                size="iconSm"
                onClick={handleExport}
                disabled={!serverExportUrl && !rows.length}
                aria-label={t.common.export}
                title={serverExportUrl ? "Barcha yozuvlarni CSV qilib yuklab olish" : t.common.export}
              >
                <Download className="size-4" />
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="iconSm"
              onClick={() => setDensity((value) => (value === "compact" ? "comfortable" : "compact"))}
              aria-label="Qatorlar zichligi"
              title={density === "compact" ? "Keng qatorlar" : "Zich qatorlar"}
            >
              {density === "compact" ? <Rows3 className="size-4" /> : <ChevronsUpDown className="size-4" />}
            </Button>

            {columns.some((column) => column.hideable) ? (
              <>
                <Button
                  ref={columnsButtonRef}
                  variant="outline"
                  size="iconSm"
                  onClick={() => setColumnsOpen((value) => !value)}
                  aria-label={t.common.columns}
                  aria-expanded={columnsOpen}
                  aria-haspopup="dialog"
                  title={t.common.columns}
                >
                  <Columns3 className="size-4" />
                </Button>
                <Popover
                  anchor={columnsButtonRef.current}
                  open={columnsOpen}
                  onClose={() => setColumnsOpen(false)}
                  align="end"
                  minWidth={224}
                >
                  <div className="scrollbar-thin overflow-y-auto p-1.5">
                    <p className="t-eyebrow px-2.5 py-1.5">{t.common.columns}</p>
                    {columns
                      .filter((column) => column.hideable)
                      .map((column) => (
                        <label
                          key={column.key}
                          className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[12.5px] text-[var(--ink-2)] transition-colors hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]"
                        >
                          <TableCheck
                            checked={!hidden.has(column.key)}
                            label={String(column.key)}
                            onChange={() =>
                              setHidden((prev) => {
                                const next = new Set(prev);
                                if (next.has(column.key)) next.delete(column.key);
                                else next.add(column.key);
                                return next;
                              })
                            }
                          />
                          <span className="truncate">{column.header}</span>
                        </label>
                      ))}
                    <div className="my-1 border-t border-[var(--edge)]" />
                    <button
                      type="button"
                      onClick={() => setHidden(new Set())}
                      className="w-full rounded-[var(--r-ctl)] px-2.5 py-1.5 text-left text-[12.5px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand-wash)]"
                    >
                      Hammasini ko&apos;rsatish
                    </button>
                  </div>
                </Popover>
              </>
            ) : null}
          </div>
        </div>

        {/* ------ filtr paneli — shu kartaning ichida, chiziq bilan ajraladi.
             Maydonlar o'zi botiq (`pane-sunken`), shuning uchun panelga
             qo'shimcha fon berilmaydi — aks holda ular ko'rinmay qoladi. */}
        {filtersSlot ? (
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-[var(--t-base)] ease-[var(--ease-snap)]",
              filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-3 border-t border-[var(--edge)] pt-3.5">
                <div
                  className={cn(
                    "grid gap-x-4 gap-y-3.5 sm:grid-cols-2",
                    filterColumns === 2
                      ? "lg:grid-cols-2"
                      : filterColumns === 3
                        ? "lg:grid-cols-3"
                        : "lg:grid-cols-3 xl:grid-cols-4",
                  )}
                >
                  {filtersSlot}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Saqlangan ko'rinishlar — shu asboblar kartasining ichida */}
        {savedViewsSlot ? (
          <div className="mt-3 border-t border-[var(--edge)] pt-3">{savedViewsSlot}</div>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- jadval */}
      <div className="enter pane-solid overflow-hidden rounded-[var(--r-pane)]">
        {/* ------------------------------- mobil: karta ko'rinishi */}
        <div className="divide-y divide-[var(--edge-soft)] md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-5" />}
              title={emptyTitle ?? t.common.noResults}
              description={emptyDescription}
              action={emptyAction}
            />
          ) : (
            rows.map((row) => {
              const id = rowKey(row);
              const isSelected = selected.has(id);
              const primary =
                visibleColumns.find((column) => column.mobilePrimary) ?? visibleColumns[0];
              const rest = visibleColumns.filter(
                (column) => column !== primary && !column.mobileHidden && column.key !== "actions",
              );
              const actionsColumn = visibleColumns.find((column) => column.key === "actions");

              return (
                <div
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "flex gap-3 p-4 transition-colors duration-[var(--t-fast)]",
                    onRowClick && "cursor-pointer",
                    isSelected
                      ? "bg-[var(--brand-wash)]"
                      : "bg-[var(--pane-solid)] active:bg-[var(--pane-sunken)]",
                  )}
                >
                  {selectable ? (
                    <TableCheck
                      className="mt-1"
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      onClick={(event) => event.stopPropagation()}
                      label={`${t.common.selected}: ${String(id)}`}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2">{primary?.render(row)}</div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {rest.slice(0, 6).map((column) => (
                        <div key={column.key} className="min-w-0">
                          <dt className="t-eyebrow text-[10px]">{column.header}</dt>
                          <dd className="truncate text-[12.5px] text-[var(--ink)]">
                            {column.render(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  {actionsColumn ? (
                    <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
                      {actionsColumn.render(row)}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* ------------------------------------ desktop: jadval */}
        {/*
          Jadval o'z ichida scroll qilmaydi — sahifaning o'zi aylanadi va
          qatorlar soni pagination bilan cheklanadi. Faqat gorizontal toshib
          ketish uchun `overflow-x-auto`. Sarlavha kataklari `sticky top-0`:
          konteynerga balandlik berilsa yopishib qoladi.
        */}
        <div className="scrollbar-thin hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-[13px]">
            <thead className="text-left">
              <tr>
                {selectable ? (
                  <th
                    className={cn(
                      "sticky top-0 z-10 w-11 bg-[var(--pane-solid)] px-4 shadow-[inset_0_-1px_0_var(--edge)]",
                      headPad,
                    )}
                  >
                    <TableCheck
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                      label={t.common.selectAll}
                    />
                  </th>
                ) : null}
                {visibleColumns.map((column) => {
                  const state = sortState(column);
                  const isSticky = column.sticky ?? column.key === "actions";
                  return (
                    <th
                      key={column.key}
                      style={column.width ? { width: column.width } : undefined}
                      aria-sort={
                        state === "asc" ? "ascending" : state === "desc" ? "descending" : undefined
                      }
                      className={cn(
                        // Chegara `border` emas, `inset shadow` bilan: `border-collapse`
                        // rejimida sticky katakning chegarasi yo'qolib qoladi.
                        "t-eyebrow group/th sticky top-0 z-10 whitespace-nowrap bg-[var(--pane-solid)] px-3",
                        "shadow-[inset_0_-1px_0_var(--edge)]",
                        headPad,
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        isSticky &&
                          "right-0 z-20 shadow-[inset_1px_0_0_var(--edge),inset_0_-1px_0_var(--edge)]",
                        column.headerClassName,
                      )}
                    >
                      {column.sortKey && onOrderingChange ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className={cn(
                            "inline-flex items-center gap-1 transition-colors duration-[var(--t-fast)] hover:text-[var(--ink)] focus-ring",
                            state && "text-[var(--brand)]",
                          )}
                        >
                          {column.header}
                          {state === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : state === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-0 transition-opacity group-hover/th:opacity-40" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-[var(--edge)] last:border-0">
                    {selectable ? (
                      <td className="px-4 py-3.5">
                        <Skeleton className="size-4" />
                      </td>
                    ) : null}
                    {visibleColumns.map((column) => (
                      <td key={column.key} className="px-3 py-3.5">
                        <Skeleton className="h-4 w-full max-w-[10rem]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (selectable ? 1 : 0)}>
                    <EmptyState
                      icon={<Inbox className="size-5" />}
                      title={emptyTitle ?? t.common.noResults}
                      description={emptyDescription}
                      action={emptyAction}
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = rowKey(row);
                  const isSelected = selected.has(id);
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        "group border-b border-[var(--edge)] transition-colors duration-[var(--t-fast)] last:border-0",
                        onRowClick && "cursor-pointer",
                        // Sticky ustun `background: inherit` orqali shu rangni oladi
                        isSelected
                          ? "bg-[var(--brand-wash)] hover:bg-[var(--brand-wash-strong)]"
                          : "bg-[var(--pane-solid)] hover:bg-[var(--pane-hover)]",
                      )}
                    >
                      {selectable ? (
                        <td
                          className={cn("px-4", cellPad)}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <TableCheck
                            checked={isSelected}
                            onChange={() => toggleRow(id)}
                            label={`${t.common.selected}: ${String(id)}`}
                          />
                        </td>
                      ) : null}
                      {visibleColumns.map((column) => {
                        const isSticky = column.sticky ?? column.key === "actions";
                        return (
                          <td
                            key={column.key}
                            className={cn(
                              "px-3 align-middle text-[var(--ink-2)]",
                              cellPad,
                              column.align === "right" && "text-right",
                              column.align === "center" && "text-center",
                              isSticky &&
                                "sticky right-0 z-10 bg-[inherit] shadow-[inset_1px_0_0_var(--edge)]",
                              column.className,
                            )}
                          >
                            {column.render(row)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------ paginate */}
        {onPageChange ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--edge)] px-4 py-2.5">
            <div className="flex items-center gap-3 text-xs text-[var(--ink-3)]">
              {onPageSizeChange ? (
                <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
              ) : null}
              <span className="t-num whitespace-nowrap">
                {from}–{to} <span className="text-[var(--ink-4)]">/</span> {formatNumber(totalCount)}
              </span>
            </div>
            <Pagination page={page} totalPages={Math.max(totalPages, 1)} onChange={onPageChange} />
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------- bulk action bar */}
      {/* Pastda yopishib turadi — uzun ro'yxatda ham qo'l yetadi */}
      {hasBulkBar ? (
        <div className="sticky bottom-3 z-20 mt-1">
          <div className="enter-pop mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-[var(--r-field)] pane-float px-3 py-2">
            <span className="whitespace-nowrap pl-2 text-[13px] font-semibold text-[var(--ink)]">
              {selected.size} {t.common.selected}
              <span className="ml-1 font-normal text-[var(--ink-4)]">(shu sahifada)</span>
            </span>
            <span className="h-5 w-px bg-[var(--edge)]" />
            {bulkActions?.map((action) => (
              <Button
                key={action.key}
                size="xs"
                variant={action.danger ? "dangerSoft" : "outline"}
                icon={action.icon}
                onClick={async () => {
                  await action.onRun([...selected]);
                  setSelected(new Set());
                }}
              >
                {action.label}
              </Button>
            ))}
            <Button
              size="iconSm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              aria-label={t.common.close}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

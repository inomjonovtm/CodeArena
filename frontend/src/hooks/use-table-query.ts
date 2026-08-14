"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Query } from "@/lib/api";

export interface TableQueryState {
  page: number;
  pageSize: number;
  search: string;
  ordering: string;
  filters: Record<string, string | string[] | undefined>;
}

/**
 * Jadval holati (sahifa, qidiruv, sortlash, filtrlar) uchun yagona hook.
 * `params` — backendga yuboriladigan tayyor query obyekti.
 */
export function useTableQuery(initial?: Partial<TableQueryState>) {
  const [state, setState] = useState<TableQueryState>({
    page: 1,
    pageSize: 10,
    search: "",
    ordering: "-created_at",
    filters: {},
    ...initial,
  });

  /* Qidiruv DEBOUNCE bilan serverga boradi: har bosilgan harf alohida
     so'rov yubormasin. Input qiymati (`search`) darhol yangilanadi,
     `params` esa 300 ms tinimdan keyingina o'zgaradi. */
  const [debouncedSearch, setDebouncedSearch] = useState(state.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(state.search), 300);
    return () => clearTimeout(timer);
  }, [state.search]);

  const setPage = useCallback((page: number) => setState((s) => ({ ...s, page })), []);

  const setPageSize = useCallback(
    (pageSize: number) => setState((s) => ({ ...s, pageSize, page: 1 })),
    [],
  );

  const setSearch = useCallback(
    (search: string) => setState((s) => ({ ...s, search, page: 1 })),
    [],
  );

  const setOrdering = useCallback(
    (ordering: string) => setState((s) => ({ ...s, ordering, page: 1 })),
    [],
  );

  const setFilter = useCallback(
    (key: string, value: string | string[] | undefined) =>
      setState((s) => {
        const filters = { ...s.filters };
        if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) {
          delete filters[key];
        } else {
          filters[key] = value;
        }
        return { ...s, filters, page: 1 };
      }),
    [],
  );

  const clearFilters = useCallback(
    () => setState((s) => ({ ...s, filters: {}, page: 1 })),
    [],
  );

  const activeFilterCount = useMemo(
    () => Object.keys(state.filters).length,
    [state.filters],
  );

  const params = useMemo<Query>(() => {
    const query: Query = {
      page: state.page,
      page_size: state.pageSize,
      ordering: state.ordering,
    };
    if (debouncedSearch) query.search = debouncedSearch;
    for (const [key, value] of Object.entries(state.filters)) {
      if (value !== undefined) query[key] = value as string | string[];
    }
    return query;
  }, [state, debouncedSearch]);

  return {
    ...state,
    params,
    activeFilterCount,
    setPage,
    setPageSize,
    setSearch,
    setOrdering,
    setFilter,
    clearFilters,
  };
}

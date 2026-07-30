"use client";

import { useCallback, useMemo, useState } from "react";

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
    if (state.search) query.search = state.search;
    for (const [key, value] of Object.entries(state.filters)) {
      if (value !== undefined) query[key] = value as string | string[];
    }
    return query;
  }, [state]);

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

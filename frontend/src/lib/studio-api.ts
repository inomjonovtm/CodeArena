/**
 * Studio API klienti.
 *
 * CRUD uchun mavjud `/api/admin/...` endpointlari ishlatiladi (muallif roli
 * ularga huquq kodlari orqali kiradi) — shuning uchun bu yerda faqat
 * `/api/studio/...` dagi MUALLIF ASBOBLARI bor.
 */

import { api, type Query } from "./api";
import type {
  AuthoringRun,
  ProblemHealth,
  ReferenceSolution,
  StudioOverview,
  StudioTemplates,
  TestGenerator,
} from "./studio-types";
import type { Paginated } from "./types";

const STUDIO = "/studio";

export const studio = {
  overview: () => api.get<StudioOverview>(`${STUDIO}/overview/`),
  templates: () => api.get<StudioTemplates>(`${STUDIO}/templates/`),

  /* --- etalon yechimlar */
  solutions: {
    list: (problem: string) =>
      api.get<Paginated<ReferenceSolution>>(`${STUDIO}/solutions/`, {
        problem,
        page_size: 50,
        ordering: "kind",
      }),
    create: (body: Partial<ReferenceSolution>) =>
      api.post<ReferenceSolution>(`${STUDIO}/solutions/`, body),
    update: (id: string, body: Partial<ReferenceSolution>) =>
      api.patch<ReferenceSolution>(`${STUDIO}/solutions/${id}/`, body),
    remove: (id: string) => api.delete<void>(`${STUDIO}/solutions/${id}/`),
  },

  /* --- generatorlar */
  generators: {
    list: (problem: string) =>
      api.get<Paginated<TestGenerator>>(`${STUDIO}/generators/`, {
        problem,
        page_size: 50,
        ordering: "order",
      }),
    create: (body: Partial<TestGenerator>) =>
      api.post<TestGenerator>(`${STUDIO}/generators/`, body),
    update: (id: string, body: Partial<TestGenerator>) =>
      api.patch<TestGenerator>(`${STUDIO}/generators/${id}/`, body),
    remove: (id: string) => api.delete<void>(`${STUDIO}/generators/${id}/`),
  },

  /* --- amal jurnali */
  runs: (problem: string, query?: Query) =>
    api.get<Paginated<AuthoringRun>>(`${STUDIO}/runs/`, {
      problem,
      page_size: 20,
      ...query,
    }),

  /* --- masala asboblari
     Hammasi SINXRON: javob qaytganda ish tugagan bo'ladi. Shuning uchun
     interfeys tugmani bloklab, «bajarilmoqda» holatini ko'rsatishi shart. */
  tools: {
    generateTests: (
      problem: string,
      body: { generator: string; count?: number; seed_start?: number; replace: boolean },
    ) => api.post<AuthoringRun>(`${STUDIO}/problems/${problem}/generate-tests/`, body),

    fillExpected: (problem: string, body: { only_empty: boolean }) =>
      api.post<AuthoringRun>(`${STUDIO}/problems/${problem}/fill-expected/`, body),

    validate: (problem: string, body?: { solutions?: string[] }) =>
      api.post<AuthoringRun>(`${STUDIO}/problems/${problem}/validate/`, body ?? {}),

    stress: (
      problem: string,
      body: {
        generator: string;
        model: string;
        brute: string;
        iterations?: number;
        seed_start?: number;
        save_counterexample: boolean;
      },
    ) => api.post<AuthoringRun>(`${STUDIO}/problems/${problem}/stress/`, body),

    checkerTest: (
      problem: string,
      body: {
        input: string;
        user_output: string;
        jury_output: string;
        // Formadagi (saqlanmagan) checker sozlamalari — sinov aynan
        // ekrandagi kodni tekshirsin
        checker_type?: string;
        checker_language?: string;
        checker_code?: string;
        float_epsilon?: number;
      },
    ) => api.post<AuthoringRun>(`${STUDIO}/problems/${problem}/checker-test/`, body),

    health: (problem: string) =>
      api.get<ProblemHealth>(`${STUDIO}/problems/${problem}/health/`),
  },
};


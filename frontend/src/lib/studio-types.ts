/**
 * Studio (muallif paneli) API tiplari.
 *
 * `lib/types.ts` sayt va admin panel uchun; bu yerda faqat muallif
 * asboblariga tegishlilari — etalon yechim, generator, checker, savollar
 * bankasi va olimpiada mas'ullari.
 */

export type CodeLanguage = "python" | "javascript" | "cpp";

export const LANGUAGE_LABEL: Record<CodeLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

/* ---------------------------------------------------------------- checker */

export type CheckerType = "exact" | "token" | "float" | "custom";

export interface CheckerOption {
  value: CheckerType;
  label: string;
  /** Qachon tanlanadi — muallif to'g'ri usulni bir o'qishda tanlasin. */
  hint: string;
}

export const CHECKER_OPTIONS: CheckerOption[] = [
  {
    value: "exact",
    label: "Aynan mos",
    hint: "Javob bitta va u belgima-belgi mos kelishi kerak. Qator oxiridagi bo'shliqlar kechiriladi.",
  },
  {
    value: "token",
    label: "So'zma-so'z",
    hint: "Bo'shliq va qator ko'chirish farqi ahamiyatsiz. Ko'pchilik masalaga shu to'g'ri keladi.",
  },
  {
    value: "float",
    label: "Haqiqiy son",
    hint: "Javob kasr son. Berilgan xatolik doirasidagi farq qabul qilinadi.",
  },
  {
    value: "custom",
    label: "Maxsus checker",
    hint: "«Istalgan to'g'ri javobni chiqaring» turidagi masalalar uchun — qarorni siz yozgan dastur qabul qiladi.",
  },
];

/* -------------------------------------------------------------- yechimlar */

export type SolutionKind = "model" | "brute" | "slow" | "wrong";

export const SOLUTION_KIND_LABEL: Record<SolutionKind, string> = {
  model: "Etalon yechim",
  brute: "Sodda yechim",
  slow: "Sekin yechim",
  wrong: "Ataylab noto'g'ri",
};

/** Har bir turdan KUTILADIGAN natija — tekshiruv shu bo'yicha xulosa qiladi. */
export const SOLUTION_KIND_HINT: Record<SolutionKind, string> = {
  model: "Barcha testlardan o'tadi. Kutilgan javoblarni shu yechim hisoblaydi.",
  brute: "To'g'ri, lekin sekin. Stress-testda etalonga qarshi qo'yiladi.",
  slow: "Vaqt limitiga urilishi kerak — limit to'g'ri tanlanganini isbotlaydi.",
  wrong: "Yiqilishi kerak — testlar to'plami kuchli ekanini isbotlaydi.",
};

export interface ReferenceSolution {
  id: string;
  problem: string;
  name: string;
  kind: SolutionKind;
  language: CodeLanguage;
  code: string;
  is_primary: boolean;
  note: string;
  last_verdict: string;
  last_checked_at: string | null;
  last_runtime_ms: number | null;
  last_message: string;
  author_username: string | null;
  code_length: number;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------- generator */

export interface TestGenerator {
  id: string;
  problem: string;
  name: string;
  language: CodeLanguage;
  code: string;
  count: number;
  seed_start: number;
  make_sample: boolean;
  is_active: boolean;
  order: number;
  last_run_at: string | null;
  last_message: string;
  generated_count: number;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------ amal jurnali */

export type AuthoringRunKind = "generate" | "validate" | "stress" | "checker";

export interface AuthoringRunSolutionReport {
  id: string;
  name: string;
  kind: SolutionKind;
  language: CodeLanguage;
  verdict: string;
  as_expected: boolean;
  expectation: string;
  passed: number;
  total: number;
  failed_test: number | null;
  max_runtime_ms: number;
  note: string;
}

export interface AuthoringRunDetail {
  generator?: string;
  solution?: string;
  model?: string;
  brute?: string;
  created?: number;
  changed?: number;
  checked?: number;
  replaced?: boolean;
  iterations?: number;
  seeds?: number[];
  seed_start?: number;
  max_runtime_ms?: number;
  tests?: number;
  solutions?: AuthoringRunSolutionReport[];
  preview?: { seed: number; input: string; output: string }[];
  counterexample?: {
    seed: number;
    input: string;
    model_output: string;
    brute_output: string;
    note: string;
  };
  saved_as_test?: boolean;
  /** checker sinovi */
  checker_type?: CheckerType;
  accepted?: boolean;
  system_error?: boolean;
  message?: string;
  input?: string;
  user_output?: string;
  jury_output?: string;
}

export interface AuthoringRun {
  id: string;
  problem: string;
  kind: AuthoringRunKind;
  status: "ok" | "failed";
  summary: string;
  detail: AuthoringRunDetail;
  duration_ms: number;
  created_by_username: string | null;
  created_at: string;
}

/* ------------------------------------------------------- tayyorlik ro'yxati */

export interface HealthCheck {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
  value?: number;
  optional?: boolean;
}

export interface ProblemHealth {
  problem: string;
  slug: string;
  status: string;
  ready: boolean;
  score: number;
  checks: HealthCheck[];
  counts: {
    tests: number;
    samples: number;
    hidden: number;
    solutions: number;
    generators: number;
  };
}

/* ------------------------------------------------------------- shablonlar */

export interface StudioTemplates {
  checker: Record<CodeLanguage, string>;
  generator: Record<CodeLanguage, string>;
  limits: { max_generate: number; max_stress: number; max_test_chars: number };
  checker_protocol: string;
  generator_protocol: string;
}

/* --------------------------------------------------------------- overview */

export interface StudioOverview {
  problems: { total: number; draft: number; published: number };
  contests: { total: number; upcoming: number; running: number };
  needs_work: {
    id: string;
    slug: string;
    title: string;
    status: string;
    difficulty: string;
    tests: number;
    solutions: number;
    reason: string;
  }[];
  recent_runs: AuthoringRun[];
  judge: {
    backend: string;
    available: boolean;
    languages: Record<string, boolean>;
  };
}

/* ------------------------------------------------------ olimpiada mas'ullari */

export type ContestStaffRole = "owner" | "judge" | "author" | "observer";

export const CONTEST_STAFF_ROLE_LABEL: Record<ContestStaffRole, string> = {
  owner: "Mas'ul",
  judge: "Hakam",
  author: "Muallif",
  observer: "Kuzatuvchi",
};

export const CONTEST_STAFF_ROLE_HINT: Record<ContestStaffRole, string> = {
  owner: "To'liq huquq: sozlama, masala, ishtirokchi.",
  judge: "Savollarga javob beradi, qoidabuzarlikni hal qiladi.",
  author: "Masala tayyorlaydi va tahrirlaydi.",
  observer: "Faqat ko'radi — hech narsani o'zgartira olmaydi.",
};

export interface ContestStaff {
  id: string;
  contest: string;
  user: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: ContestStaffRole;
  role_label: string;
  can_edit: boolean;
  note: string;
  added_by_username: string | null;
  created_at: string;
}


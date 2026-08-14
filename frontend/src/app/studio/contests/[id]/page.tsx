"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  ListChecks,
  Loader2,
  Puzzle,
  ScanSearch,
  Settings2,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/providers";
import { ContestAboutTab, type ContestDraft } from "@/components/studio/contest/about-tab";
import { ContestAdvancedTab } from "@/components/studio/contest/advanced-tab";
import {
  ContestParticipantsTab,
  ContestProblemsTab,
  ContestResultsTab,
  ContestSubmissionsTab,
  ContestViolationsTab,
} from "@/components/studio/contest/panels-tab";
import { ContestStaffTab } from "@/components/studio/contest/staff-tab";
import { StButton } from "@/components/studio/problem/shared";
import {
  Verdict,
  WorkActionBar,
  WorkBody,
  WorkError,
  WorkHeader,
  WorkTabs,
  type WorkTab,
} from "@/components/studio/workbench";
import { resource } from "@/lib/api";
import type { ContestDetail } from "@/lib/types";

const contests = resource<ContestDetail, ContestDetail>("contests");

/** Serverga yuboriladigan maydonlar. */
const SAVED_FIELDS = [
  "title_uz",
  "slug",
  "description_uz",
  "editorial_uz",
  "start_time",
  "end_time",
  "duration_minutes",
  "registration_ends_at",
  "status",
  "visibility",
  "access_password",
  "scoring",
  "participation",
  "team_mode",
  "allowed_languages",
  "is_rated",
  "is_virtual_allowed",
  "max_participants",
  "rating_k_new",
  "rating_k_experienced",
  "min_rating",
  "max_rating",
  "rules_url",
  "hide_authors",
  "hide_results",
  "hide_submissions",
  "public_scoreboard",
  "open_registration",
  "keep_problems_public",
] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: "qoralama",
  scheduled: "rejalashtirilgan",
  running: "davom etmoqda",
  finished: "tugagan",
  cancelled: "bekor qilingan",
};

function emptyContest(): ContestDraft {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  return {
    title_uz: "",
    slug: "",
    description_uz: "",
    editorial_uz: "",
    start_time: start.toISOString(),
    end_time: new Date(start.getTime() + 120 * 60_000).toISOString(),
    duration_minutes: 120,
    status: "draft",
    visibility: "public",
    access_password: "",
    scoring: "icpc",
    participation: "normal",
    team_mode: "solo",
    allowed_languages: [],
    is_rated: true,
    is_virtual_allowed: true,
    max_participants: null,
    rating_k_new: 40,
    rating_k_experienced: 20,
    min_rating: null,
    max_rating: null,
    rules_url: "",
    hide_authors: false,
    hide_results: false,
    hide_submissions: false,
    public_scoreboard: true,
    open_registration: true,
    keep_problems_public: true,
  };
}

export default function ContestWorkbench() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();

  const isNew = params.id === "new";
  const contestId = isNew ? null : params.id;

  const [draft, setDraft] = useState<ContestDraft>(emptyContest);
  const [dirty, setDirty] = useState(false);

  const tab = search.get("tab") ?? "about";
  const setTab = useCallback(
    (key: string) => {
      const next = new URLSearchParams(search.toString());
      next.set("tab", key);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, search],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["studio", "contest", contestId],
    queryFn: () => contests.retrieve(contestId as string),
    enabled: Boolean(contestId),
  });

  useEffect(() => {
    if (!data) return;
    setDraft({ ...data });
    setDirty(false);
  }, [data?.id, data?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = useCallback((changes: ContestDraft) => {
    setDraft((current) => ({ ...current, ...changes }));
    setDirty(true);
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      for (const field of SAVED_FIELDS) {
        if (draft[field] !== undefined) body[field] = draft[field];
      }
      return contestId ? contests.update(contestId, body) : contests.create(body);
    },
    onSuccess: async (saved) => {
      setDirty(false);
      toast.success("Olimpiada saqlandi");
      if (isNew) {
        router.replace(`/studio/contests/${saved.id}?tab=problems`);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["studio", "contest", contestId] });
    },
    onError: (error: unknown) =>
      toast.error("Saqlab bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const tabs = useMemo<WorkTab[]>(
    () => [
      { key: "about", label: "Olimpiada haqida", icon: <FileText className="size-3.5" /> },
      { key: "advanced", label: "Kengaytirilgan", icon: <Settings2 className="size-3.5" /> },
      { key: "problems", label: "Masalalar", icon: <Puzzle className="size-3.5" /> },
      { key: "staff", label: "Hakamlar", icon: <UsersRound className="size-3.5" /> },
      { key: "submissions", label: "Urinishlar", icon: <ListChecks className="size-3.5" /> },
      { key: "participants", label: "Qatnashuvchilar", icon: <Users className="size-3.5" /> },
      { key: "results", label: "Natijalar", icon: <Trophy className="size-3.5" /> },
      { key: "violations", label: "Qoidabuzarliklar", icon: <ScanSearch className="size-3.5" /> },
    ],
    [],
  );

  const joinUrl =
    !isNew && draft.slug && typeof window !== "undefined"
      ? `${window.location.origin}/contests/${draft.slug}`
      : undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[var(--green)]" />
      </div>
    );
  }

  /* Yuklab bo'lmagan olimpiadani bo'sh forma sifatida ko'rsatmaymiz —
     masala sahifasidagi kabi, xatolik alohida ekranda aytiladi. */
  if (isError) {
    return (
      <>
        <WorkHeader
          breadcrumbs={[
            { href: "/studio", label: "Studio" },
            { href: "/studio/contests", label: "Olimpiadalar" },
          ]}
          title="Olimpiada"
        />
        <WorkBody>
          <WorkError
            title="Olimpiadani yuklab bo'lmadi"
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        </WorkBody>
      </>
    );
  }

  return (
    <>
      <WorkHeader
        breadcrumbs={[
          { href: "/studio", label: "Studio" },
          { href: "/studio/contests", label: "Olimpiadalar" },
        ]}
        title={draft.title_uz || (isNew ? "Yangi olimpiada" : "Olimpiada")}
        meta={
          <Verdict
            tone={
              draft.computed_status === "running"
                ? "warn"
                : draft.computed_status === "finished"
                  ? "pass"
                  : "idle"
            }
          >
            {STATUS_LABEL[draft.computed_status ?? draft.status ?? "draft"] ?? "qoralama"}
          </Verdict>
        }
        actions={
          <StButton
            variant="brand"
            onClick={() => save.mutate()}
            disabled={save.isPending || !draft.title_uz}
          >
            {save.isPending ? "Saqlanmoqda…" : "Saqlash"}
          </StButton>
        }
      />

      <WorkTabs tabs={tabs} active={tab} onSelect={setTab} />

      <WorkBody wide>
        {tab === "about" ? (
          <ContestAboutTab value={draft} onChange={patch} joinUrl={joinUrl} />
        ) : null}
        {tab === "advanced" ? <ContestAdvancedTab value={draft} onChange={patch} /> : null}
        {tab === "problems" ? <ContestProblemsTab contestId={contestId} /> : null}
        {tab === "staff" ? <ContestStaffTab contestId={contestId} /> : null}
        {tab === "submissions" ? <ContestSubmissionsTab contestId={contestId} /> : null}
        {tab === "participants" ? <ContestParticipantsTab contestId={contestId} /> : null}
        {tab === "results" ? <ContestResultsTab contestId={contestId} /> : null}
        {tab === "violations" ? (
          <ContestViolationsTab
            contestId={contestId}
            checkedAt={draft.plagiarism_checked_at}
          />
        ) : null}
      </WorkBody>

      <WorkActionBar
        dirty={dirty}
        saving={save.isPending}
        onSave={() => save.mutate()}
        onReset={() => {
          setDraft(data ? { ...data } : emptyContest());
          setDirty(false);
        }}
      />
    </>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useConfirm, useToast } from "@/components/providers";
import { CheckerTab } from "@/components/studio/problem/checker-tab";
import { GeneratorTab } from "@/components/studio/problem/generator-tab";
import { StButton } from "@/components/studio/problem/shared";
import { SolutionsTab } from "@/components/studio/problem/solutions-tab";
import { StatementTab, type ProblemDraft } from "@/components/studio/problem/statement-tab";
import { ProblemSteps } from "@/components/studio/problem/steps";
import { TestsTab } from "@/components/studio/problem/tests-tab";
import { VerifyTab } from "@/components/studio/problem/verify-tab";
import {
  Verdict,
  WorkActionBar,
  WorkBody,
  WorkError,
  WorkHeader,
} from "@/components/studio/workbench";
import { api, resource } from "@/lib/api";
import { studio } from "@/lib/studio-api";
import type { ProblemDetail } from "@/lib/types";

const problems = resource<ProblemDetail, ProblemDetail>("problems");

/** Masalaning saqlanadigan maydonlari — serverga faqat shular yuboriladi. */
const SAVED_FIELDS = [
  "title_uz",
  "slug",
  "difficulty",
  "points",
  "status",
  "description_uz",
  "constraints_uz",
  "hint_uz",
  "editorial_uz",
  "time_limit_ms",
  "memory_limit_kb",
  "is_premium",
  "is_contest_only",
  "checker_type",
  "checker_language",
  "checker_code",
  "float_epsilon",
  "validator_language",
  "validator_code",
  "test_cases",
] as const;

const EMPTY: ProblemDraft = {
  title_uz: "",
  slug: "",
  difficulty: "easy",
  points: 10,
  status: "draft",
  description_uz: "",
  constraints_uz: "",
  hint_uz: "",
  editorial_uz: "",
  time_limit_ms: 2000,
  memory_limit_kb: 262144,
  is_premium: false,
  is_contest_only: false,
  checker_type: "exact",
  checker_language: "python",
  checker_code: "",
  float_epsilon: 0.000001,
  validator_language: "python",
  validator_code: "",
  test_cases: [],
  tag_ids: [],
};

export default function ProblemWorkbench() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm().confirm;
  const queryClient = useQueryClient();

  const isNew = params.id === "new";
  const problemId = isNew ? null : params.id;

  const [draft, setDraft] = useState<ProblemDraft>(EMPTY);
  const [dirty, setDirty] = useState(false);

  const tab = search.get("tab") ?? "statement";
  const setTab = useCallback(
    (key: string) => {
      const next = new URLSearchParams(search.toString());
      next.set("tab", key);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, search],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["studio", "problem", problemId],
    queryFn: () => problems.retrieve(problemId as string),
    enabled: Boolean(problemId),
  });

  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ["studio", "health", problemId],
    queryFn: () => studio.tools.health(problemId as string),
    enabled: Boolean(problemId),
  });

  // Serverdan kelgan ma'lumot tahrir nusxasiga faqat BIR MARTA ko'chiriladi:
  // keyingi `refetch` saqlanmagan o'zgarishlarni yuvib yubormasligi kerak.
  useEffect(() => {
    if (!data) return;
    setDraft({
      ...data,
      tag_ids: (data.tags ?? []).map((tag) => String(tag.id)),
    });
    setDirty(false);
  }, [data?.id, data?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = useCallback((changes: ProblemDraft) => {
    setDraft((current) => ({ ...current, ...changes }));
    setDirty(true);
  }, []);

  /* SAQLANMAGAN ISH YO'QOLMASIN.
     Masala sharti uzoq yoziladi va varaqni tasodifan yopish — bu yerdagi
     eng qimmat xato. Brauzerning o'z ogohlantirishi yagona ishonchli
     to'siq: u varaqni yopish, yangilash va manzilni almashtirishda ham
     ishlaydi. Matnni brauzer o'zi qo'yadi (uni almashtirib bo'lmaydi),
     shuning uchun bu yerda faqat "to'siq bor" deb belgilanadi. */
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      for (const field of SAVED_FIELDS) {
        if (draft[field] !== undefined) body[field] = draft[field];
      }
      body.tag_ids = draft.tag_ids ?? [];
      return problemId ? problems.update(problemId, body) : problems.create(body);
    },
    onSuccess: async (saved) => {
      setDirty(false);
      toast.success("Masala saqlandi");
      if (isNew) {
        router.replace(`/studio/problems/${saved.id}?tab=tests`);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["studio", "problem", problemId] });
      await refetchHealth();
    },
    onError: (error: unknown) =>
      toast.error("Saqlab bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const publish = useMutation({
    mutationFn: () => api.post(`/admin/problems/${problemId}/publish/`, {}),
    onSuccess: async () => {
      toast.success("Masala chop etildi");
      await queryClient.invalidateQueries({ queryKey: ["studio", "problem", problemId] });
      await refetchHealth();
    },
    onError: (error: unknown) =>
      toast.error("Chop etib bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  /* CHOP ETISH — qaytarib bo'lmaydigan amal emas, lekin OMMAVIY: masala
     shu zahoti katalogga chiqadi va foydalanuvchilar uni yecha boshlaydi.
     Shuning uchun bosishdan oldin oqibati aytiladi, tayyorlik to'liq
     bo'lmasa esa alohida ogohlantiriladi. */
  const askAndPublish = async () => {
    const ready = health?.ready ?? false;
    const ok = await confirm({
      title: "Masalani chop etamizmi?",
      confirmLabel: "Ha, chop etilsin",
      danger: !ready,
      message: ready
        ? "Masala shu zahoti ommaviy katalogga chiqadi va foydalanuvchilar uni yecha boshlaydi. Keyin ham tahrirlash mumkin, lekin o'zgarishlar darhol ko'rinadi."
        : `Tayyorlik to'liq emas (${health?.score ?? 0}%). Yetishmayotgan section bilan chop etilgan masala foydalanuvchida xato natija berishi mumkin. Baribir davom etasizmi?`,
    });
    if (ok) publish.mutate();
  };


  const fillExpected = useMutation({
    mutationFn: (onlyEmpty: boolean) =>
      studio.tools.fillExpected(problemId as string, { only_empty: onlyEmpty }),
    onSuccess: async (run) => {
      toast.success(run.summary);
      await queryClient.invalidateQueries({ queryKey: ["studio", "problem", problemId] });
      await refetchHealth();
    },
    onError: (error: unknown) =>
      toast.error("Bajarilmadi", error instanceof Error ? error.message : String(error)),
  });

  const validate = useMutation({
    mutationFn: () => studio.tools.validate(problemId as string),
    onSuccess: async (run) => {
      if (run.status === "ok") toast.success(run.summary);
      else toast.error("Kutilmagan natija", run.summary);
      await queryClient.invalidateQueries({ queryKey: ["studio", "solutions", problemId] });
      await refetchHealth();
      setTab("verify");
    },
    onError: (error: unknown) =>
      toast.error("Tekshiruv bajarilmadi", error instanceof Error ? error.message : String(error)),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[var(--green)]" />
      </div>
    );
  }

  /* Yuklab bo'lmagan masalani BO'SH FORMA qilib ko'rsatish mumkin emas:
     muallif «hamma maydon o'chib ketibdi» deb o'ylaydi yoki, battari,
     bo'sh holatni saqlab yuboradi. Xatolik — alohida ekran. */
  if (isError) {
    return (
      <>
        <WorkHeader
          breadcrumbs={[
            { href: "/studio", label: "Studio" },
            { href: "/studio/problems", label: "Masalalar" },
          ]}
          title="Masala"
        />
        <WorkBody>
          <WorkError
            title="Masalani yuklab bo'lmadi"
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
          { href: "/studio/problems", label: "Masalalar" },
        ]}
        title={draft.title_uz || (isNew ? "Yangi masala" : "Masala")}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Verdict tone={draft.status === "published" ? "pass" : "idle"}>
              {draft.status === "published"
                ? "chop etilgan"
                : draft.status === "archived"
                  ? "arxiv"
                  : "qoralama"}
            </Verdict>
            {/* Tayyorlik foizi bu yerdan OLIB TASHLANDI: u qadamlar
                yo'lida «N/M section bajarildi» ko'rinishida allaqachon bor
                edi va ikkita joyda turgan bir xil raqam panelni
                shovqinga to'ldirardi. */}
          </div>
        }
        actions={
          <>
            {problemId && draft.slug ? (
              <StButton
                variant="ghost"
                onClick={() => window.open(`/problems/${draft.slug}`, "_blank")}
                title="Masalani saytda ochish"
              >
                <ExternalLink className="size-3.5" />
                Ko&apos;rish
              </StButton>
            ) : null}
            <StButton
              variant="quiet"
              onClick={() => save.mutate()}
              disabled={save.isPending || !draft.title_uz}
            >
              {save.isPending ? "Saqlanmoqda…" : "Saqlash"}
            </StButton>
          </>
        }
      />

      {/* Bo'limlar bitta TAB QATORIDA, o'ng chetida esa asosiy amal —
          masala muharrirlarining odatiy tartibi (`problem/steps.tsx`).
          «Chop etish» aynan shu yerda turadi: u tabdan tabga o'tganda ham
          ko'z oldida qoladi va sarlavha panelini band qilmaydi. */}
      <ProblemSteps
        health={health}
        active={tab}
        onSelect={setTab}
        isNew={isNew}
        action={
          problemId && draft.status !== "published" ? (
            <StButton
              variant="brand"
              onClick={() => void askAndPublish()}
              disabled={publish.isPending || dirty}
              title={
                dirty ? "Avval o'zgarishlarni saqlang" : "Masalani ommaviy katalogga chiqarish"
              }
            >
              <Upload className="size-3.5" />
              Chop etish
            </StButton>
          ) : null
        }
      />

      {tab === "statement" ? (
        <StatementTab value={draft} onChange={patch} />
      ) : (
        <WorkBody wide>
          {tab === "tests" ? (
            <TestsTab
              value={draft}
              onChange={patch}
              onGenerate={() => setTab("generator")}
              onFillExpected={(onlyEmpty) => fillExpected.mutate(onlyEmpty)}
              busy={fillExpected.isPending}
            />
          ) : null}

          {tab === "checker" ? (
            <CheckerTab problemId={problemId} value={draft} onChange={patch} />
          ) : null}

          {tab === "solutions" ? (
            <SolutionsTab
              problemId={problemId}
              onValidate={() => validate.mutate()}
              validating={validate.isPending}
            />
          ) : null}

          {tab === "generator" ? (
            <GeneratorTab
              problemId={problemId}
              onGenerated={async () => {
                await queryClient.invalidateQueries({
                  queryKey: ["studio", "problem", problemId],
                });
                await refetchHealth();
              }}
            />
          ) : null}

          {tab === "verify" ? (
            <VerifyTab
              problemId={problemId}
              health={health}
              onRefresh={() => void refetchHealth()}
            />
          ) : null}
        </WorkBody>
      )}

      <WorkActionBar
        dirty={dirty}
        saving={save.isPending}
        onSave={() => save.mutate()}
        onReset={() => {
          if (data) {
            setDraft({ ...data, tag_ids: (data.tags ?? []).map((tag) => String(tag.id)) });
          } else {
            setDraft(EMPTY);
          }
          setDirty(false);
        }}
      />
    </>
  );
}

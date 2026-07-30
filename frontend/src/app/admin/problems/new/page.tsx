"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { ProblemForm, emptyProblem, type ProblemFormValue } from "@/components/admin/problem-form";
import { Button } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { useCrudMutation } from "@/hooks/use-crud";
import { resource } from "@/lib/api";
import type { ProblemDetail } from "@/lib/types";

const problems = resource<ProblemDetail>("problems");

export default function NewProblemPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState<ProblemFormValue>(emptyProblem);

  const createMutation = useCrudMutation(
    (payload: ProblemFormValue) => problems.create(payload),
    {
      invalidate: [["problems"]],
      successMessage: t.problems.createdSuccess,
      onSuccess: (created) => router.replace(`/admin/problems/${created.id}`),
    },
  );

  return (
    <>
      <PageHeader
        title={t.problems.newProblem}
        description={t.problems.subtitle}
        backHref="/admin/problems"
      />

      <ProblemForm value={value} onChange={setValue} />

      {/* Yopishqoq saqlash paneli — uzun formada tugma doim qo'l ostida */}
      <div className="sticky bottom-4 z-20 mt-6">
        <div className="pane-solid flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3 shadow-[var(--lift-3)]">
          <p className="t-meta min-w-0 truncate text-[var(--ink-4)]">
            {value.title_uz || t.problems.newProblem}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="quiet" size="sm" onClick={() => router.push("/admin/problems")}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="size-4" />}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(value)}
            >
              {t.common.save}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

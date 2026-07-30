"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ContestForm,
  contestToPayload,
  defaultContest,
  type ContestFormValue,
} from "@/components/admin/contest-form";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/kit";
import { useI18n } from "@/components/providers";
import { useCrudMutation } from "@/hooks/use-crud";
import { resource } from "@/lib/api";
import type { ContestDetail } from "@/lib/types";

const contests = resource<ContestDetail>("contests");

export default function NewContestPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState<ContestFormValue>(defaultContest);

  const createMutation = useCrudMutation(
    (payload: ContestFormValue) => contests.create(contestToPayload(payload)),
    {
      invalidate: [["contests"]],
      successMessage: "Contest yaratildi",
      onSuccess: (created) => router.replace(`/admin/contests/${created.id}`),
    },
  );

  return (
    <>
      <PageHeader
        title={t.contests.newContest}
        description={t.contests.subtitle}
        backHref="/admin/contests"
      />

      <ContestForm value={value} onChange={setValue} />

      {/* Yopishqoq saqlash paneli — forma uzun, tugma doim ko'rinadi */}
      <div className="sticky bottom-4 z-20 mt-6">
        <div className="pane-solid flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3 shadow-[var(--lift-3)]">
          <p className="t-meta min-w-0 truncate text-[var(--ink-4)]">
            {value.title_uz || t.contests.newContest}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="quiet" size="sm" onClick={() => router.push("/admin/contests")}>
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

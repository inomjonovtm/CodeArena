"use client";

import { useQuery } from "@tanstack/react-query";

import { Alert, PageHead, TextLines } from "@/components/kit";
import { LegalDocument, parseLegalMarkdown } from "@/components/site/legal";
import { publicApi } from "@/lib/public-api";
import { formatDate } from "@/lib/utils";

/* ==========================================================================
   Huquqiy sahifa qobig'i (maxfiylik, shartlar, qoidalar)
   --------------------------------------------------------------------------
   MATN KODDA EMAS. Ilgari har bir hujjat sahifa faylida TypeScript massiv
   ko'rinishida yozilgan edi: bitta jumlani tuzatish uchun ham dasturchi,
   commit va deploy kerak bo'lardi — natijada huquqiy matnlar eskirib
   qolardi. Endi ular admin panelda tahrirlanadi va shu yerda o'qiladi.

   Sahifa qobig'i (sarlavha, mundarija, tipografiya) o'zgarmadi: faqat
   matnning MANBASI ko'chdi.
   ========================================================================== */

export function LegalPage({ slug, intro }: { slug: string; intro: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["legal", slug],
    queryFn: () => publicApi.site.legal(slug),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const sections = data ? parseLegalMarkdown(data.body_md) : [];
  const updatedAt = data?.effective_from || data?.updated_at || "";

  return (
    <div className="mx-auto flex w-full max-w-[var(--container)] flex-col gap-7">
      <PageHead
        eyebrow="Huquqiy hujjat"
        title={data?.title ?? "Huquqiy hujjat"}
        lead={data?.summary || undefined}
        meta={
          data ? (
            <>
              <span className="ts-sm text-[var(--text-4)]">
                Oxirgi yangilanish:{" "}
                <span className="ts-num text-[var(--text-2)]">
                  {formatDate(updatedAt, false)}
                </span>
              </span>
              {data.version ? (
                <span className="ts-sm text-[var(--text-4)]">
                  <span className="ts-num text-[var(--text-2)]">{data.version}</span>-tahrir
                </span>
              ) : null}
              <span className="ts-sm text-[var(--text-4)]">
                <span className="ts-num text-[var(--text-2)]">{sections.length}</span> ta
                bo&apos;lim
              </span>
            </>
          ) : null
        }
      />

      {isLoading ? (
        <TextLines lines={12} />
      ) : isError || !data ? (
        <Alert tone="bad" title="Hujjatni yuklab bo'lmadi">
          Sahifani yangilab ko&apos;ring. Muammo takrorlansa, biz bilan
          bog&apos;laning.
        </Alert>
      ) : (
        <LegalDocument updatedAt={updatedAt} intro={intro} sections={sections} />
      )}
    </div>
  );
}

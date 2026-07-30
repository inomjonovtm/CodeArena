"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth, useToast } from "@/components/providers";
import {
  Alert,
  Block,
  Button,
  Chip,
  Empty,
  IconButton,
  LinkButton,
  PageHead,
  Pagination,
  Pane,
  SearchField,
  Segmented,
  Spinner,
  Textarea,
} from "@/components/kit";
import { publicApi } from "@/lib/public-api";
import type { PublicBookmark } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

const PAGE_SIZE = 10;

/* Izoh bo'yicha guruhlash chiplari */
type NoteFilter = "all" | "noted" | "plain";

const NOTE_FILTERS: { value: NoteFilter; label: string }[] = [
  { value: "all", label: "Hammasi" },
  { value: "noted", label: "Izohli" },
  { value: "plain", label: "Izohsiz" },
];

/** Ro'yxat skeleti — haqiqiy qator tartibini takrorlaydi. */
function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--edge-soft)]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start gap-3.5 px-4 py-4 sm:px-5">
          <Block className="size-9 shrink-0 rounded-[var(--r-ctl)]" />
          <div className="min-w-0 flex-1">
            <Block className="h-3.5 w-1/3" />
            <Block className="mt-2 h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bitta saqlangan masala qatori — masalalar ro'yxati bilan bir tilda. */
function BookmarkRow({
  row,
  editing,
  draft,
  saving,
  removing,
  onEdit,
  onDraft,
  onSave,
  onCancel,
  onRemove,
}: {
  row: PublicBookmark;
  editing: boolean;
  draft: string;
  saving: boolean;
  removing: boolean;
  onEdit: () => void;
  onDraft: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group px-4 py-4 transition-colors duration-[var(--t-fast)] hover:bg-[var(--pane-hover)] sm:px-5">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
          <BookmarkCheck className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <Link
            href={`/problems/${row.problem_slug}`}
            className="focus-ring rounded-[6px] text-[13.5px] font-medium text-[var(--ink)] transition-colors hover:text-[var(--brand)]"
          >
            {row.problem_title}
          </Link>
          <p className="t-meta mt-0.5 text-[var(--ink-4)]">
            {formatRelative(row.created_at)} saqlangan
          </p>

          {editing ? (
            <div className="enter-pop mt-3 flex flex-col gap-2">
              <Textarea
                rows={3}
                autoFocus
                placeholder="Nima uchun saqladingiz? Qaysi yondashuvni sinash kerak?"
                value={draft}
                onChange={(event) => onDraft(event.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="primary" loading={saving} onClick={onSave}>
                  Saqlash
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>
                  Bekor qilish
                </Button>
              </div>
            </div>
          ) : row.note ? (
            <p className="t-meta pane-sunken mt-2.5 rounded-[var(--r-field)] px-3.5 py-2.5 leading-relaxed text-[var(--ink-2)]">
              {row.note}
            </p>
          ) : null}
        </div>

        {/* Amallar hoverda ochiladi; sensor ekranda doim ko'rinadi */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-0.5 transition-opacity duration-[var(--t-fast)]",
            "opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100",
            editing && "opacity-100",
          )}
        >
          <IconButton size="sm" label="Izohni tahrirlash" onClick={onEdit}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton
            size="sm"
            label="Saqlanganlardan olib tashlash"
            disabled={removing}
            onClick={onRemove}
            className="hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["bookmarks", page],
    queryFn: () => publicApi.bookmarks.list({ page, page_size: PAGE_SIZE }),
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => publicApi.bookmarks.remove(id),
    onSuccess: () => {
      toast.success("Ro'yxatdan olib tashlandi");
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      void queryClient.invalidateQueries({ queryKey: ["public-problems"] });
    },
    onError: () => toast.error("O'chirib bo'lmadi"),
  });

  const noteMutation = useMutation({
    mutationFn: (payload: { id: string; note: string }) =>
      publicApi.bookmarks.update(payload.id, { note: payload.note }),
    onSuccess: () => {
      setEditing(null);
      toast.success("Izoh saqlandi");
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: () => toast.error("Izohni saqlab bo'lmadi"),
  });

  const rows = useMemo(() => {
    let list = data?.results ?? [];
    if (noteFilter !== "all") {
      list = list.filter((row) => (noteFilter === "noted" ? Boolean(row.note) : !row.note));
    }
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (row) =>
        row.problem_title.toLowerCase().includes(term) ||
        (row.note ?? "").toLowerCase().includes(term),
    );
  }, [data, search, noteFilter]);

  if (authLoading) {
    return (
      <Pane inset="lg">
        <Spinner label="Yuklanmoqda..." />
      </Pane>
    );
  }

  if (!user) {
    return (
      <Pane tone="solid" inset="none" className="overflow-hidden">
        <Empty
          icon={<Bookmark className="size-5" />}
          title="Saqlanganlar shaxsiy"
          description="Saqlangan masalalaringizni ko'rish uchun hisobingizga kiring."
          action={<LinkButton href="/login" variant="primary">Kirish</LinkButton>}
        />
      </Pane>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {/* --------------------------------------------- 1. sahifa sarlavhasi */}
      <PageHead
        eyebrow="Shaxsiy to'plam"
        title="Saqlanganlar"
        lead="Keyinroq qaytadigan masalalaringiz va ular uchun shaxsiy izohlaringiz."
        meta={
          <Chip tone="neutral" icon={<Bookmark className="size-3.5" />}>
            <span className="t-num font-semibold">{data?.count ?? 0}</span> ta masala
          </Chip>
        }
      />

      {/* ------------------------------------------------- 2. boshqaruv */}
      <Pane className="enter" inset="md">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchField
            value={search}
            onValueChange={setSearch}
            placeholder="Saqlanganlar ichidan qidirish..."
            className="min-w-56 flex-1 sm:max-w-sm"
          />
          <Segmented size="sm" value={noteFilter} items={NOTE_FILTERS} onChange={setNoteFilter} />
        </div>
      </Pane>

      {/* --------------------------------------------------- 3. ro'yxat */}
      {isLoading ? (
        <Pane tone="solid" inset="none">
          <RowsSkeleton rows={5} />
        </Pane>
      ) : isError ? (
        /* Xato holatini bo'sh ro'yxatdan ajratamiz: aks holda so'rov
           uzilganda foydalanuvchi saqlanganlarini yo'qotdim deb o'ylaydi. */
        <Alert
          tone="bad"
          title="Saqlanganlarni yuklab bo'lmadi"
          action={
            <Button size="sm" onClick={() => refetch()}>
              Qayta urinish
            </Button>
          }
        >
          Internet aloqasini tekshirib, qayta urinib ko&apos;ring.
        </Alert>
      ) : rows.length === 0 ? (
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            icon={<Bookmark className="size-5" />}
            title={search || noteFilter !== "all" ? "Hech narsa topilmadi" : "Hali saqlangan yo'q"}
            description={
              search || noteFilter !== "all"
                ? "Boshqa so'z yoki filtr bilan qidirib ko'ring."
                : "Masala sahifasidagi «Saqlash» tugmasi bilan qiziqarli masalalarni yig'ib boring."
            }
            action={
              !search && noteFilter === "all" ? (
                <LinkButton href="/problems" variant="primary">
                  Masalalarga o&apos;tish
                </LinkButton>
              ) : undefined
            }
          />
        </Pane>
      ) : (
        <Pane tone="solid" inset="none" className="enter">
          <div className="enter-stagger divide-y divide-[var(--edge-soft)]">
            {rows.map((row) => (
              <BookmarkRow
                key={row.id}
                row={row}
                editing={editing === row.id}
                draft={draft}
                saving={noteMutation.isPending}
                removing={removeMutation.isPending}
                onEdit={() => {
                  setEditing(editing === row.id ? null : row.id);
                  setDraft(row.note ?? "");
                }}
                onDraft={setDraft}
                onSave={() => noteMutation.mutate({ id: row.id, note: draft })}
                onCancel={() => setEditing(null)}
                onRemove={() => removeMutation.mutate(row.id)}
              />
            ))}
          </div>
        </Pane>
      )}

      {/* ------------------------------------------------- 4. sahifalash */}
      {data && data.total_pages > 1 ? (
        <Pagination
          page={page}
          pageCount={data.total_pages}
          total={data.count}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          className="px-1"
        />
      ) : null}
    </div>
  );
}

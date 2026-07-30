"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronUp,
  CornerDownRight,
  Flag,
  Lock,
  MessageSquare,
  Pencil,
  Pin,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Chip,
  ChoiceRow,
  Empty,
  Field,
  Input,
  LinkButton,
  ListSkeleton,
  Modal,
  Pagination,
  Pane,
  SearchField,
  Segmented,
  Textarea,
} from "@/components/kit";
import { useAuth, useToast } from "@/components/providers";
import { Markdown } from "@/components/ui/markdown";
import { RichEditor } from "@/components/ui/rich-editor";
import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";
import { ringStyle, ringWidth } from "@/lib/rank";
import type { PublicComment, PublicDiscussion, RankInfo, ReportReason } from "@/lib/types";
import { cn, formatRelative, initials } from "@/lib/utils";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam yoki reklama" },
  { value: "abuse", label: "Haqorat / xafa qiluvchi" },
  { value: "solution_leak", label: "Tayyor yechim tarqatilgan" },
  { value: "offtopic", label: "Mavzudan tashqari" },
  { value: "other", label: "Boshqa sabab" },
];

/* ------------------------------------------------------------------ avatar */

/** Rank ramkali profil rasmi — hamjamiyat sahifalari uchun. */
export function UserAvatar({
  src,
  name,
  size = 36,
  rank,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  rank?: RankInfo | null;
  className?: string;
}) {
  const ring = ringWidth(size);
  const inner = rank ? size - ring * 2 : size;

  const face = (
    <span
      style={{ width: inner, height: inner, fontSize: Math.max(9, inner * 0.36) }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-[var(--brand-wash)] font-semibold text-[var(--brand-ink)]",
        !rank && className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );

  if (!rank) return face;

  return (
    <span
      title={rank.name_uz}
      style={{ width: size, height: size, ...ringStyle(rank, size) }}
      className={cn("flex shrink-0 items-center justify-center rounded-full", className)}
    >
      {face}
    </span>
  );
}

/* ------------------------------------------------------------------- ovoz */

/** Kichik "foydali" tugmasi — izoh va ro'yxat uchun sokin ko'rinish. */
function VoteButton({
  count,
  myVote,
  onVote,
  disabled,
}: {
  count: number;
  myVote: number;
  onVote: (value: 1 | 0) => void;
  disabled?: boolean;
}) {
  const active = myVote > 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onVote(active ? 0 : 1)}
      aria-pressed={active}
      aria-label="Foydali"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--r-chip)] px-2.5 py-1 text-[12.5px] font-medium",
        "transition-colors duration-[var(--t-fast)] focus-ring",
        active
          ? "bg-[var(--brand-wash)] text-[var(--brand-ink)]"
          : "text-[var(--ink-4)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink-2)]",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <ChevronUp className="size-3.5" />
      <span className="t-num">{count}</span>
    </button>
  );
}

/** Izoh ostidagi sokin amal tugmasi (javob, tahrirlash, ...). */
const quietAction = cn(
  "inline-flex items-center gap-1.5 rounded-[var(--r-chip)] px-2 py-1 text-[12px] font-medium",
  "text-[var(--ink-4)] transition-colors duration-[var(--t-fast)] focus-ring",
  "hover:bg-[var(--pane-hover)] hover:text-[var(--ink-2)]",
);

/* --------------------------------------------------------------- shikoyat */

export function ReportButton({
  discussionId,
  commentId,
}: {
  discussionId?: string;
  commentId?: string;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      publicApi.report({
        discussion: discussionId ?? null,
        comment: commentId ?? null,
        reason,
        note,
      }),
    onSuccess: (response) => {
      toast.success("Xabaringiz yuborildi", response.detail);
      setOpen(false);
      setNote("");
    },
    onError: (error) => {
      toast.error(
        "Yuborilmadi",
        error instanceof ApiError ? error.message : "Keyinroq urinib ko'ring.",
      );
    },
  });

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(quietAction, "hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]")}
      >
        <Flag className="size-3" />
        Xabar berish
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Kontent haqida xabar berish"
        description="Moderatorlar ko'rib chiqadi. Bekorga xabar bermang."
        size="sm"
        footer={
          <>
            <Button size="sm" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
            >
              Yuborish
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Sabab">
            <ChoiceRow
              value={reason}
              onChange={setReason}
              options={REPORT_REASONS.map((item) => ({ value: item.value, label: item.label }))}
              className="sm:grid-cols-1"
            />
          </Field>

          <Field label="Izoh" hint="Ixtiyoriy — nima noto'g'ri ekanini yozing.">
            <Textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Qisqacha tushuntiring..."
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------- muhokama ro'yxati */

type SortKey = "new" | "top" | "active";

/** Yarim yozilgan mavzu sahifa yopilsa yo'qolmasin. */
const DRAFT_KEY = "codearena:discussion-draft";

/** Kompozitordagi talab qatori — bajarilgani yashil belgi oladi. */
function Requirement({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 text-[11.5px]",
        ok ? "text-[var(--good)]" : "text-[var(--ink-4)]",
      )}
    >
      <Check className={cn("size-3", !ok && "opacity-40")} />
      {label}
    </li>
  );
}

export function DiscussionList({ emptyHint }: { emptyHint?: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("new");

  /* Qoralamani tiklash — brauzer yopilib ketsa ham matn qolsin. Faqat
     birinchi renderda o'qiladi, keyin holat o'zi manba bo'ladi. */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { title?: string; body?: string };
      if (parsed.title || parsed.body) {
        setTitle(parsed.title ?? "");
        setBody(parsed.body ?? "");
        setComposerOpen(true);
      }
    } catch {
      // Buzilgan qoralama sahifani ishdan chiqarmasin
    }
  }, []);

  useEffect(() => {
    if (!title && !body) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body }));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [title, body]);

  // Muhokamalar ko'payib ketmasligi uchun 10 tadan sahifalanadi
  const queryKey = ["discussions", page];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => publicApi.discussions.list({ page, page_size: 10 }),
    placeholderData: (previous) => previous,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      publicApi.discussions.create({ title: title.trim(), body_md: body.trim() }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setComposerOpen(false);
      setError(null);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success("Mavzu qo'shildi");
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.fieldError("title") || err.fieldError("body_md") || err.message
          : "Mavzuni saqlab bo'lmadi.",
      );
    },
  });

  const rows = data?.results ?? [];

  // Qidiruv va tartiblash — joriy sahifa ichida, so'rovlar o'zgarmaydi.
  // Qadalgan mavzular har qanday tartibda tepada qoladi.
  const visible = useMemo(() => {
    let list = rows;
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (row) =>
          row.title.toLowerCase().includes(query) || row.body_md.toLowerCase().includes(query),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      const pinned = Number(b.is_pinned) - Number(a.is_pinned);
      if (pinned !== 0) return pinned;
      if (sort === "top") return b.upvotes - a.upvotes;
      if (sort === "active") return b.comment_count - a.comment_count;
      return 0; // "new" — server tartibi saqlanadi
    });
    return sorted;
  }, [rows, search, sort]);

  return (
    /* Har bir blok o'z kartasida: kompozitor, asboblar paneli, ro'yxat */
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------ kompozitor */}
      {user ? (
        composerOpen ? (
          <Pane inset="lg" className="enter flex flex-col gap-4">
            <Field label="Sarlavha" htmlFor="discussion-title" required>
              <Input
                id="discussion-title"
                autoFocus
                placeholder="Masalan: Bu masalani O(n) da yechish mumkinmi?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
              />
            </Field>
            <Field
              label="Matn"
              required
              hint="Formatlash, jonli ko'rinish va to'liq ekran mavjud. Tayyor yechim tashlash taqiqlanadi."
            >
              <RichEditor
                value={body}
                onChange={setBody}
                minRows={10}
                placeholder="Savolingizni yoki fikringizni yozing. Kod uchun ``` dan foydalaning..."
              />
            </Field>

            {error ? <Alert tone="bad">{error}</Alert> : null}

            {/* Talablar yozishdan oldin ko'rinsin — «Joylash» bosgandan keyin
                server xatosini o'qib, matnni qayta tuzatish noqulay. */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Requirement ok={title.trim().length >= 5} label="Sarlavha: 5+ belgi" />
                <Requirement ok={body.trim().length >= 10} label="Matn: 10+ belgi" />
              </ul>
              <span className="t-num text-[11.5px] text-[var(--ink-4)]">
                {body.length} belgi
              </span>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setComposerOpen(false);
                  setError(null);
                }}
              >
                Yopish
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!title && !body}
                onClick={() => {
                  setTitle("");
                  setBody("");
                  setError(null);
                }}
              >
                Tozalash
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Send className="size-4" />}
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={title.trim().length < 5 || body.trim().length < 10}
              >
                Joylash
              </Button>
            </div>
          </Pane>
        ) : (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className={cn(
              "pane pane-interactive flex w-full items-center gap-3 rounded-[var(--r-pane)]",
              "px-5 py-4 text-left focus-ring",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
              <Plus className="size-4" />
            </span>
            <span className="t-body text-[var(--ink-3)]">Yangi mavzu ochish...</span>
          </button>
        )
      ) : (
        <Pane inset="md" className="flex flex-wrap items-center gap-3">
          <p className="t-body min-w-0 flex-1 text-[var(--ink-3)]">
            Muhokamada qatnashish uchun hisobingizga kiring.
          </p>
          <LinkButton href="/login" size="sm">
            Kirish
          </LinkButton>
        </Pane>
      )}

      {/* --------------------------------------------------- asboblar paneli */}
      {rows.length > 0 || search ? (
        <Pane inset="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchField
              value={search}
              onValueChange={setSearch}
              placeholder="Mavzular ichidan qidirish..."
              className="sm:max-w-xs sm:flex-1"
            />
            <Segmented
              value={sort}
              onChange={setSort}
              size="sm"
              items={[
                { value: "new", label: "Yangi" },
                { value: "top", label: "Foydali" },
                { value: "active", label: "Faol" },
              ]}
            />
          </div>
        </Pane>
      ) : null}

      {/* ------------------------------------------------------------ ro'yxat */}
      {isLoading ? (
        <Pane inset="md">
          <ListSkeleton rows={5} />
        </Pane>
      ) : isError ? (
        /* Tarmoq xatosi "muhokama yo'q" ko'rinishida chiqmasin */
        <Alert
          tone="bad"
          title="Muhokamalarni yuklab bo'lmadi"
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
            icon={<MessageSquare className="size-5" />}
            title="Hozircha muhokama yo'q"
            description={emptyHint ?? "Birinchi bo'lib savol bering yoki fikringizni ulashing."}
            action={
              user ? (
                <Button
                  variant="primary"
                  icon={<Plus className="size-4" />}
                  onClick={() => setComposerOpen(true)}
                >
                  Mavzu ochish
                </Button>
              ) : (
                <LinkButton href="/login" variant="primary">
                  Kirish
                </LinkButton>
              )
            }
          />
        </Pane>
      ) : visible.length === 0 ? (
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            compact
            icon={<MessageSquare className="size-5" />}
            title="Hech narsa topilmadi"
            description="Qidiruv so'zini o'zgartirib ko'ring."
            action={<Button size="sm" onClick={() => setSearch("")}>Tozalash</Button>}
          />
        </Pane>
      ) : (
        <>
          <Pane inset="none" className="overflow-hidden">
            <ul className="enter-stagger divide-y divide-[var(--edge-soft)]">
              {visible.map((discussion) => (
                <li key={discussion.id}>
                  <DiscussionRow discussion={discussion} />
                </li>
              ))}
            </ul>
          </Pane>

          {data && data.total_pages > 1 ? (
            <Pane inset="sm">
              <Pagination
                page={page}
                pageCount={data.total_pages}
                total={data.count}
                pageSize={data.page_size}
                onPage={setPage}
              />
            </Pane>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Forum qatori: chapda sokin ovoz ustuni, o'rtada sarlavha va meta. */
function DiscussionRow({ discussion }: { discussion: PublicDiscussion }) {
  return (
    <Link
      href={`/discussions/${discussion.id}`}
      className={cn(
        "group relative flex items-start gap-4 px-5 py-4 transition-colors sm:px-6",
        "duration-[var(--t-fast)] hover:bg-[var(--pane-hover)] focus-ring",
        discussion.is_pinned && "edge-brand",
      )}
    >
      {/* Ovoz/izoh klasteri — jimgina raqamlar */}
      <div className="hidden w-12 shrink-0 flex-col items-center gap-2 pt-0.5 sm:flex">
        <div className="text-center">
          <p className="t-num text-[15px] font-semibold leading-none text-[var(--ink)]">
            {discussion.upvotes}
          </p>
          <p className="mt-1 text-[10.5px] text-[var(--ink-4)]">ovoz</p>
        </div>
        <div className="flex items-center gap-1 text-[var(--ink-4)]">
          <MessageSquare className="size-3" />
          <span className="t-num text-[11.5px]">{discussion.comment_count}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {discussion.is_pinned ? (
            <Chip tone="brand" icon={<Pin className="size-3" />}>
              Qadalgan
            </Chip>
          ) : null}
          {discussion.is_locked ? (
            <Chip icon={<Lock className="size-3" />}>Yopilgan</Chip>
          ) : null}
          <p className="min-w-0 truncate text-[14.5px] font-semibold text-[var(--ink)] transition-colors group-hover:text-[var(--brand-ink)]">
            {discussion.title}
          </p>
        </div>

        <p className="mt-1 line-clamp-1 text-[13px] leading-relaxed text-[var(--ink-3)]">
          {discussion.body_md.replace(/[#*`>]/g, "").slice(0, 180)}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--ink-4)]">
          <span className="inline-flex items-center gap-1.5">
            <UserAvatar
              src={discussion.author_avatar}
              name={discussion.author_username}
              size={20}
              rank={discussion.author_rank}
            />
            <span className="font-medium text-[var(--ink-3)]">
              {discussion.author_username ?? "o'chirilgan"}
            </span>
          </span>
          <span>{formatRelative(discussion.created_at)}</span>
          {/* Mobilda klaster o'rniga meta ichida ko'rsatiladi */}
          <span className="inline-flex items-center gap-1 sm:hidden">
            <ChevronUp className="size-3" />
            <span className="t-num">{discussion.upvotes}</span>
          </span>
          <span className="inline-flex items-center gap-1 sm:hidden">
            <MessageSquare className="size-3" />
            <span className="t-num">{discussion.comment_count}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------ izohlar oqimi */

interface CommentNode extends PublicComment {
  children: CommentNode[];
}

function buildTree(rows: PublicComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  rows.forEach((row) => map.set(row.id, { ...row, children: [] }));

  const roots: CommentNode[] = [];
  map.forEach((node) => {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/**
 * Izohlar oqimi — muhokama mavzusi uchun ham, masala uchun ham.
 *
 * Bitta komponent ikkalasiga xizmat qiladi: ovoz berish, javob, tahrirlash,
 * o'chirish va shikoyat mantiqi ikki joyda takrorlanmasin. Farq faqat manba
 * va yaratishdagi maydonda.
 */
export function CommentThread({
  discussionId,
  problemSlug,
  problemId,
  locked,
  emptyHint,
}: {
  discussionId?: string;
  problemSlug?: string;
  problemId?: string;
  locked?: boolean;
  emptyHint?: string;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = discussionId
    ? ["discussion-comments", discussionId]
    : ["problem-comments", problemSlug];

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [rootDraft, setRootDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      discussionId
        ? publicApi.discussions.comments(discussionId)
        : publicApi.problems.comments(problemSlug!),
    enabled: Boolean(discussionId || problemSlug),
  });

  const tree = useMemo(() => buildTree(data ?? []), [data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
    if (discussionId) {
      void queryClient.invalidateQueries({ queryKey: ["discussion", discussionId] });
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: { body: string; parent: string | null }) =>
      publicApi.comments.create({
        ...(discussionId ? { discussion: discussionId } : { problem: problemId }),
        body_md: payload.body,
        parent: payload.parent,
      }),
    onSuccess: () => {
      setReplyTo(null);
      setDraft("");
      setRootDraft("");
      invalidate();
    },
    onError: (error) =>
      toast.error(
        "Izoh yuborilmadi",
        error instanceof ApiError ? error.message : "Keyinroq urinib ko'ring.",
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; body: string }) =>
      publicApi.comments.update(payload.id, { body_md: payload.body }),
    onSuccess: () => {
      setEditing(null);
      setDraft("");
      invalidate();
    },
    onError: () => toast.error("Izohni saqlab bo'lmadi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => publicApi.comments.remove(id),
    onSuccess: () => {
      toast.success("Izoh o'chirildi");
      invalidate();
    },
    onError: () => toast.error("Izohni o'chirib bo'lmadi"),
  });

  const voteMutation = useMutation({
    mutationFn: (payload: { id: string; value: 1 | 0 }) =>
      publicApi.comments.vote(payload.id, payload.value),
    onSuccess: () => invalidate(),
  });

  const renderNode = (node: CommentNode, depth: number) => (
    <li
      key={node.id}
      className={cn(depth > 0 && "ml-4 border-l border-[var(--edge)] pl-4 sm:ml-6")}
    >
      <div className="py-3.5">
        <div className="flex items-start gap-3">
          <UserAvatar
            src={node.author_avatar}
            name={node.author_username}
            size={34}
            rank={node.author_rank}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {node.author_username ? (
                <Link
                  href={`/u/${node.author_username}`}
                  className="rounded-[6px] text-[13.5px] font-semibold text-[var(--ink)] transition-colors hover:text-[var(--brand)] focus-ring"
                >
                  {node.author_username}
                </Link>
              ) : (
                <span className="text-[13.5px] text-[var(--ink-4)]">o&apos;chirilgan</span>
              )}
              <span className="text-[12px] text-[var(--ink-4)]">
                {formatRelative(node.created_at)}
              </span>
              {node.updated_at !== node.created_at ? (
                <span className="text-[11px] text-[var(--ink-4)] opacity-75">tahrirlangan</span>
              ) : null}
            </div>

            {editing === node.id ? (
              <div className="mt-2 flex flex-col gap-2">
                <RichEditor value={draft} onChange={setDraft} minRows={3} />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: node.id, body: draft })}
                    loading={updateMutation.isPending}
                    disabled={!draft.trim()}
                  >
                    Saqlash
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Bekor qilish
                  </Button>
                </div>
              </div>
            ) : (
              <div className="t-body mt-1.5 text-[var(--ink-2)]">
                <Markdown source={node.body_md} />
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1">
              <VoteButton
                count={node.upvotes}
                myVote={node.my_vote}
                disabled={!user || voteMutation.isPending}
                onVote={(value) => voteMutation.mutate({ id: node.id, value })}
              />
              {user && !locked ? (
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(replyTo === node.id ? null : node.id);
                    setDraft("");
                  }}
                  className={quietAction}
                >
                  <CornerDownRight className="size-3" />
                  Javob berish
                </button>
              ) : null}
              {node.is_mine ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(node.id);
                      setDraft(node.body_md);
                    }}
                    className={quietAction}
                  >
                    <Pencil className="size-3" />
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(node.id)}
                    className={cn(quietAction, "hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]")}
                  >
                    <Trash2 className="size-3" />
                    O&apos;chirish
                  </button>
                </>
              ) : (
                <ReportButton commentId={node.id} />
              )}
            </div>

            {replyTo === node.id ? (
              <div className="enter mt-3 flex flex-col gap-2">
                <RichEditor
                  value={draft}
                  onChange={setDraft}
                  minRows={3}
                  placeholder={`${node.author_username ?? "foydalanuvchi"}ga javob...`}
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send className="size-4" />}
                    onClick={() => createMutation.mutate({ body: draft, parent: node.id })}
                    loading={createMutation.isPending}
                    disabled={!draft.trim()}
                  >
                    Yuborish
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                    Bekor qilish
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {node.children.length ? (
        <ul className="flex flex-col">{node.children.map((child) => renderNode(child, depth + 1))}</ul>
      ) : null}
    </li>
  );

  /* Oqim o'zi karta emas — chaqiruvchi sahifa uni bitta kartaga soladi,
     shuning uchun bu yerda faqat bo'limlar va ajratgichlar. */
  return (
    <div className="flex flex-col gap-5">
      {user && !locked ? (
        <div className="flex flex-col gap-2.5">
          <RichEditor
            value={rootDraft}
            onChange={setRootDraft}
            minRows={3}
            placeholder="Izohingizni yozing..."
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] text-[var(--ink-4)]">
              Formatlash paneli va jonli ko&apos;rinish mavjud
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="size-4" />}
              onClick={() => createMutation.mutate({ body: rootDraft, parent: null })}
              loading={createMutation.isPending}
              disabled={!rootDraft.trim()}
            >
              Izoh qoldirish
            </Button>
          </div>
        </div>
      ) : null}

      {locked ? (
        <Alert tone="warn" title="Mavzu yopilgan">
          Bu mavzuga yangi izoh qo&apos;shib bo&apos;lmaydi.
        </Alert>
      ) : null}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : tree.length === 0 ? (
        <Empty
          compact
          icon={<MessageSquare className="size-5" />}
          title="Hali izoh yo'q"
          description={emptyHint ?? "Birinchi bo'lib fikringizni yozing."}
        />
      ) : (
        <ul className="enter-stagger flex flex-col divide-y divide-[var(--edge-soft)] border-t border-[var(--edge)]">
          {tree.map((node) => renderNode(node, 0))}
        </ul>
      )}
    </div>
  );
}

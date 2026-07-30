"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronUp,
  Eye,
  Lock,
  MessageSquare,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  Block,
  Button,
  Chip,
  Count,
  Empty,
  Field,
  Input,
  LinkButton,
  Pane,
  PaneHead,
  TextLines,
} from "@/components/kit";
import { useAuth, useToast } from "@/components/providers";
import { CommentThread, ReportButton, UserAvatar } from "@/components/site/discussions";
import { Markdown } from "@/components/ui/markdown";
import { RichEditor } from "@/components/ui/rich-editor";
import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";
import { cn, formatRelative } from "@/lib/utils";

export default function DiscussionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["discussion", id],
    queryFn: () => publicApi.discussions.retrieve(id),
    enabled: Boolean(id),
  });

  const voteMutation = useMutation({
    mutationFn: (value: 1 | 0) => publicApi.discussions.vote(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discussion", id] }),
  });

  const updateMutation = useMutation({
    mutationFn: () => publicApi.discussions.update(id, { title, body_md: body }),
    onSuccess: () => {
      setEditing(false);
      toast.success("Mavzu yangilandi");
      void queryClient.invalidateQueries({ queryKey: ["discussion", id] });
    },
    onError: (error) =>
      toast.error(
        "Saqlab bo'lmadi",
        error instanceof ApiError ? error.message : "Keyinroq urinib ko'ring.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: () => publicApi.discussions.remove(id),
    onSuccess: () => {
      toast.success("Mavzu o'chirildi");
      void queryClient.invalidateQueries({ queryKey: ["discussions"] });
      router.replace("/discussions");
    },
    onError: () => toast.error("O'chirib bo'lmadi"),
  });

  if (isLoading) {
    // Skelet haqiqiy tartibni takrorlaydi: post kartasi va izohlar kartasi
    return (
      <div className="mx-auto flex max-w-[var(--page-tight)] flex-col gap-5">
        <Pane inset="lg">
          <Block className="h-3.5 w-32" />
          <Block className="mt-5 h-7 w-2/3" />
          <TextLines lines={4} className="mt-5" />
        </Pane>
        <Pane inset="lg">
          <Block className="h-4 w-28" />
          <TextLines lines={3} className="mt-5" />
        </Pane>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[var(--page-tight)]">
        <Pane tone="solid" inset="none" className="overflow-hidden">
          <Empty
            icon={<MessageSquare className="size-5" />}
            title="Mavzu topilmadi"
            description="U o'chirilgan yoki moderator tomonidan yashirilgan bo'lishi mumkin."
            action={<LinkButton href="/discussions">Muhokamalarga qaytish</LinkButton>}
          />
        </Pane>
      </div>
    );
  }

  const voteActive = data.my_vote > 0;

  return (
    /* Ikki karta: mavzu va izohlar. Ular orasida bir tekis bo'shliq. */
    <div className="mx-auto flex max-w-[var(--page-tight)] flex-col gap-5">
      <Pane inset="lg" className="enter">
        {/* Orqaga qaytish — karta ichida, sahifada yalang'och qolmasin */}
        <Link
          href="/discussions"
          className={cn(
            "mb-5 inline-flex items-center gap-1.5 rounded-[var(--r-ctl)] px-1 py-0.5 text-[13.5px]",
            "text-[var(--ink-3)] transition-colors hover:text-[var(--ink)] focus-ring",
          )}
        >
          <ArrowLeft className="size-4" />
          Muhokamalar
        </Link>

        {editing ? (
          <div className="flex flex-col gap-4">
            <Field label="Sarlavha" htmlFor="edit-title">
              <Input
                id="edit-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label="Matn">
              <RichEditor value={body} onChange={setBody} minRows={10} />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => updateMutation.mutate()}
                loading={updateMutation.isPending}
                disabled={!title.trim() || !body.trim()}
              >
                Saqlash
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Bekor qilish
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-5">
            {/* Vertikal ovoz ustuni — sokin, lekin doim qo'l ostida */}
            <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
              <button
                type="button"
                disabled={!user || voteMutation.isPending}
                onClick={() => voteMutation.mutate(voteActive ? 0 : 1)}
                aria-pressed={voteActive}
                aria-label="Foydali"
                className={cn(
                  "flex size-9 items-center justify-center rounded-[var(--r-ctl)] border focus-ring",
                  "transition-colors duration-[var(--t-fast)]",
                  voteActive
                    ? "border-[var(--brand-edge)] bg-[var(--brand-wash)] text-[var(--brand)]"
                    : "border-[var(--edge)] bg-[var(--pane-sunken)] text-[var(--ink-3)] hover:border-[var(--edge-strong)] hover:text-[var(--ink)]",
                  !user && "cursor-not-allowed opacity-55",
                )}
              >
                <ChevronUp className="size-4" />
              </button>
              <span
                className={cn(
                  "t-num text-[13.5px] font-semibold",
                  voteActive ? "text-[var(--brand-ink)]" : "text-[var(--ink-2)]",
                )}
              >
                {data.upvotes}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {data.is_pinned || data.is_locked ? (
                <div className="flex flex-wrap items-center gap-2">
                  {data.is_pinned ? (
                    <Chip tone="brand" icon={<Pin className="size-3" />}>
                      Qadalgan
                    </Chip>
                  ) : null}
                  {data.is_locked ? (
                    <Chip icon={<Lock className="size-3" />}>Yopilgan</Chip>
                  ) : null}
                </div>
              ) : null}

              <h1 className="t-title mt-3 text-[var(--ink)]">{data.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="inline-flex items-center gap-2.5">
                  <UserAvatar
                    src={data.author_avatar}
                    name={data.author_username}
                    size={30}
                    rank={data.author_rank}
                  />
                  {data.author_username ? (
                    <Link
                      href={`/u/${data.author_username}`}
                      className="rounded-[6px] text-[13.5px] font-medium text-[var(--ink-2)] transition-colors hover:text-[var(--brand)] focus-ring"
                    >
                      {data.author_username}
                    </Link>
                  ) : (
                    <span className="text-[13.5px] text-[var(--ink-4)]">o&apos;chirilgan</span>
                  )}
                </span>
                <span className="text-[12.5px] text-[var(--ink-4)]">
                  {formatRelative(data.created_at)}
                </span>
                <span className="inline-flex items-center gap-1 text-[12.5px] text-[var(--ink-4)]">
                  <Eye className="size-3.5" />
                  <span className="t-num">{data.views}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[12.5px] text-[var(--ink-4)]">
                  <MessageSquare className="size-3.5" />
                  <span className="t-num">{data.comment_count}</span>
                </span>
              </div>

              <div className="mt-5">
                <Markdown source={data.body_md} />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--edge)] pt-4">
                {data.is_mine ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Pencil className="size-3.5" />}
                      onClick={() => {
                        setEditing(true);
                        setTitle(data.title);
                        setBody(data.body_md);
                      }}
                    >
                      Tahrirlash
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 className="size-3.5" />}
                      onClick={() => deleteMutation.mutate()}
                      loading={deleteMutation.isPending}
                      className="text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
                    >
                      O&apos;chirish
                    </Button>
                  </>
                ) : (
                  <ReportButton discussionId={data.id} />
                )}
              </div>
            </div>
          </div>
        )}
      </Pane>

      {/* ------------------------------------------------------ izohlar kartasi */}
      <Pane inset="lg">
        <PaneHead
          title={
            <span className="inline-flex items-center gap-2">
              Izohlar
              <Count value={data.comment_count} />
            </span>
          }
        />
        <div className="mt-5">
          <CommentThread discussionId={id} locked={data.is_locked} />
        </div>
      </Pane>
    </div>
  );
}

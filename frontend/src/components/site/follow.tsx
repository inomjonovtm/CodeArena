"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, Empty, LinkButton, ListSkeleton, Modal, Pagination } from "@/components/kit";
import { useAuth, useI18n, useToast } from "@/components/providers";
import { RankAvatar } from "@/components/site/rank";
import { publicApi } from "@/lib/public-api";
import type { UserCard } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const FOLLOW_PAGE_SIZE = 10;

/**
 * Obuna tugmasi.
 *
 * Optimistik yangilanmaydi — javob kelgach profil so'rovi yangilanadi,
 * shuning uchun obunachilar soni har doim server bilan mos.
 */
export function FollowButton({
  username,
  isFollowing,
  size = "md",
  onChange,
  className,
}: {
  username: string;
  isFollowing: boolean;
  size?: "sm" | "md";
  onChange?: (state: { is_following: boolean; followers_count: number }) => void;
  className?: string;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [hovering, setHovering] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      isFollowing ? publicApi.follows.unfollow(username) : publicApi.follows.follow(username),
    onSuccess: (state) => {
      onChange?.(state);
      void queryClient.invalidateQueries({ queryKey: ["public-profile", username] });
      void queryClient.invalidateQueries({ queryKey: ["suggested-users"] });
      void queryClient.invalidateQueries({ queryKey: ["follow-list"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (user?.username === username) return null;

  if (!user) {
    return (
      <LinkButton
        href="/login"
        variant="primary"
        size={size}
        icon={<UserPlus className="size-4" />}
        title={t.site.profile.loginToFollow}
        className={className}
      >
        {t.site.profile.follow}
      </LinkButton>
    );
  }

  const label = isFollowing
    ? hovering
      ? t.site.profile.unfollow
      : t.site.profile.following
    : t.site.profile.follow;

  return (
    <Button
      variant={isFollowing ? "quiet" : "primary"}
      size={size}
      loading={mutation.isPending}
      icon={isFollowing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      onClick={() => mutation.mutate()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      aria-pressed={isFollowing}
      className={cn(
        // Obunani bekor qilish niyati hoverda qizil tus bilan ogohlantiriladi
        // (to'ldirma qat'iy — shaffof chegara oq va ko'kni qorishtiradi)
        isFollowing &&
          hovering &&
          "border-[var(--bad)] bg-[var(--bad-wash)] text-[var(--bad)] hover:bg-[var(--bad-wash)]",
        className,
      )}
    >
      {label}
    </Button>
  );
}

/** Obunachilar / obunalar ro'yxati modal oynada. */
export function FollowListModal({
  username,
  kind,
  open,
  onClose,
}: {
  username: string;
  kind: "followers" | "following";
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);

  // Obunachilar soni ko'p bo'lishi mumkin — 10 tadan sahifalaymiz
  const query = { page, page_size: FOLLOW_PAGE_SIZE };
  const { data, isLoading } = useQuery({
    queryKey: ["follow-list", username, kind, page],
    queryFn: () =>
      kind === "followers"
        ? publicApi.follows.followers(username, query)
        : publicApi.follows.following(username, query),
    enabled: open,
    placeholderData: (previous) => previous,
  });

  const rows = data?.results ?? [];
  const title =
    kind === "followers" ? t.site.profile.followers : t.site.profile.followingCount;

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <Empty
          compact
          icon={<Users className="size-5" />}
          title={kind === "followers" ? t.site.profile.noFollowers : t.site.profile.noFollowing}
        />
      ) : (
        <>
          <ul className="enter-stagger flex max-h-[26rem] flex-col gap-0.5 overflow-y-auto">
            {rows.map((row) => (
              <li key={row.username}>
                <UserRow row={row} onNavigate={onClose} />
              </li>
            ))}
          </ul>
          {data && data.total_pages > 1 ? (
            <Pagination
              page={page}
              pageCount={data.total_pages}
              total={data.count}
              pageSize={FOLLOW_PAGE_SIZE}
              onPage={setPage}
              className="mt-4"
            />
          ) : null}
        </>
      )}
    </Modal>
  );
}

export function UserRow({ row, onNavigate }: { row: UserCard; onNavigate?: () => void }) {
  const { t } = useI18n();
  const [following, setFollowing] = useState(row.is_following);

  return (
    <div className="flex items-center gap-3 rounded-[var(--r-field)] px-2 py-2 transition-colors hover:bg-[var(--pane-hover)]">
      <Link
        href={`/u/${row.username}`}
        onClick={onNavigate}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--r-ctl)]"
      >
        <RankAvatar src={row.avatar_url} name={row.full_name || row.username} size={40} rank={row.rank} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-[var(--ink)]">
            {row.username}
          </span>
          <span className="t-meta block truncate text-[var(--ink-3)]">
            <span className="t-num">{formatNumber(row.total_points)}</span> {t.site.nav.points} ·{" "}
            {t.site.nav.rating} <span className="t-num">{row.rating}</span>
          </span>
        </span>
      </Link>
      <FollowButton
        username={row.username}
        isFollowing={following}
        size="sm"
        onChange={(state) => setFollowing(state.is_following)}
      />
    </div>
  );
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button, Modal } from "@/components/kit";
import { useAuth, useI18n, useToast } from "@/components/providers";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/public-api";
import { ringStyle } from "@/lib/rank";
import type { RankInfo } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Rank ramkali avatar yuzi — dizayn tokenlari bilan. */
function AvatarFace({
  src,
  name,
  size,
  rank,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size: number;
  rank?: RankInfo | null;
  className?: string;
}) {
  const face = (
    <span
      style={{ width: rank ? "100%" : size, height: rank ? "100%" : size, fontSize: Math.max(11, size * 0.32) }}
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

/**
 * Profil rasmini yuklash.
 *
 * Fayl serverga `POST /api/auth/me/avatar/` orqali ketadi va `MediaFile`
 * sifatida saqlanadi; `avatar_url` esa `/media/...` yo'liga o'rnatiladi.
 * Yuklashdan oldin brauzerda ham hajm/format tekshiriladi — foydalanuvchi
 * javobni kutmasdan xatoni ko'radi.
 *
 * Boshqaruv muzlatilgan modal ichida: katta ko'rib chiqish, yuklash va
 * o'chirish amallari bir joyda.
 */
export function AvatarPicker({
  src,
  name,
  onChanged,
}: {
  src?: string | null;
  name?: string | null;
  onChanged: (avatarUrl: string) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const upload = useMutation({
    mutationFn: (file: File) => authApi.avatar.upload(file),
    onSuccess: async (user) => {
      setPreview(null);
      setOpen(false);
      toast.success(t.site.avatar.uploaded);
      await onChanged(user.avatar_url);
    },
    onError: (error) => {
      setPreview(null);
      toast.error(error instanceof ApiError ? error.message : t.common.error);
    },
  });

  const remove = useMutation({
    mutationFn: () => authApi.avatar.remove(),
    onSuccess: async (user) => {
      setOpen(false);
      toast.success(t.site.avatar.removed);
      await onChanged(user.avatar_url);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t.common.error),
  });

  const busy = upload.isPending || remove.isPending;

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error(t.site.avatar.wrongType);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t.site.avatar.tooLarge);
      return;
    }
    setPreview(URL.createObjectURL(file));
    upload.mutate(file);
  };

  const shown = preview ?? src;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Trigger — avatar ustiga bosilganda modal ochiladi */}
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(true)}
        aria-label={t.site.avatar.change}
        className="group relative shrink-0 rounded-full focus-ring disabled:opacity-60"
      >
        <AvatarFace src={shown} name={name} size={76} rank={user?.rank} />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-[rgb(26_25_23/0.5)] text-white",
            "opacity-0 transition-opacity duration-[var(--t-fast)]",
            "group-hover:opacity-100 group-focus-visible:opacity-100",
            busy && "opacity-100",
          )}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </span>
      </button>

      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-[var(--ink)]">{t.site.avatar.title}</p>
        <p className="t-meta mt-0.5 text-[var(--ink-4)]">{t.site.avatar.hint}</p>

        <div className="mt-2.5">
          <Button
            variant="quiet"
            size="sm"
            icon={<Camera className="size-3.5" />}
            disabled={busy}
            onClick={() => setOpen(true)}
          >
            {src ? t.site.avatar.change : t.site.avatar.upload}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {/* --- muzlatilgan modal: katta ko'rib chiqish + amallar --- */}
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title={t.site.avatar.title}
        description={t.site.avatar.hint}
        size="sm"
        footer={
          <>
            {src ? (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="size-4" />}
                loading={remove.isPending}
                disabled={upload.isPending}
                className="mr-auto text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
                onClick={() => remove.mutate()}
              >
                {t.site.avatar.remove}
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              icon={<Upload className="size-4" />}
              loading={upload.isPending}
              disabled={remove.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {src ? t.site.avatar.change : t.site.avatar.upload}
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Tanlangan holat halqasi — brend chegara bilan */}
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-label={t.site.avatar.upload}
            className={cn(
              "group relative rounded-full p-1.5 focus-ring",
              "ring-2 ring-[var(--brand-edge)] ring-offset-2 ring-offset-[var(--pane-solid)]",
              "transition-shadow disabled:opacity-70",
            )}
          >
            <AvatarFace src={shown} name={name} size={120} rank={user?.rank} />
            <span
              className={cn(
                "absolute inset-1.5 flex items-center justify-center rounded-full bg-[rgb(26_25_23/0.5)] text-white",
                "opacity-0 transition-opacity duration-[var(--t-fast)] group-hover:opacity-100",
                busy && "opacity-100",
              )}
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
            </span>
          </button>

          <p className="t-meta text-center text-[var(--ink-4)]">{t.site.avatar.hint}</p>
        </div>
      </Modal>
    </div>
  );
}

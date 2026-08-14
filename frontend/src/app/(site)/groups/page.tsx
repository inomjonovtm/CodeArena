"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, LogIn, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Alert,
  Button,
  Count,
  Empty,
  Field,
  Input,
  inputClass,
  LinkButton,
  ListSkeleton,
  Modal,
  PageHead,
  Pane,
  PaneHead,
  Spinner,
  Textarea,
  Select,
} from "@/components/kit";
import { useAuth, useToast } from "@/components/providers";
import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";
import type { GroupPrivacy } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

/** Guruh belgisi — kvadratsimon avatar, rasm bo'lmasa bosh harflar. */
function GroupMark({
  src,
  name,
  size = 44,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)]",
        "border border-[var(--line)] bg-[var(--green-wash)] font-semibold text-[var(--green-text)]",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; description: string; privacy: GroupPrivacy }>({
    name: "",
    description: "",
    privacy: "private",
  });
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: () => publicApi.groups.list(),
    enabled: Boolean(user),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      publicApi.groups.create({
        name: form.name.trim(),
        description: form.description.trim(),
        privacy: form.privacy,
      }),
    onSuccess: (group) => {
      setCreateOpen(false);
      setForm({ name: "", description: "", privacy: "private" });
      setError(null);
      toast.success("Guruh yaratildi", `Taklif kodi: ${group.invite_code}`);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Guruhni yaratib bo'lmadi."),
  });

  const joinMutation = useMutation({
    mutationFn: () => publicApi.groups.join(inviteCode.trim().toUpperCase()),
    onSuccess: (group) => {
      setJoinOpen(false);
      setInviteCode("");
      setError(null);
      toast.success(group.joined ? "Guruhga qo'shildingiz" : "Siz allaqachon a'zosiz", group.name);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Kod bo'yicha guruh topilmadi."),
  });

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
          icon={<Users className="size-5" />}
          title="Guruhlar faqat a'zolar uchun"
          description="Do'stlaringiz bilan ichki reyting yuritish uchun hisobingizga kiring."
          action={<LinkButton href="/login" variant="primary">Kirish</LinkButton>}
        />
      </Pane>
    );
  }

  const rows = data?.results ?? [];

  return (
    /* Har bir blok alohida kartada, orasi bir tekis 20px */
    <div className="flex flex-col gap-7">
      {/* ------------------------------------------------- sarlavha kartasi */}
      <PageHead
        eyebrow="Hamjamiyat"
        title="Guruhlar"
        lead="Guruh yarating yoki taklif kodi bilan qo'shiling — o'z ichki reytingingizni yuriting."
        actions={
          <>
            <Button icon={<LogIn className="size-4" />} onClick={() => setJoinOpen(true)}>
              Kod bilan qo&apos;shilish
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="size-4" />}
              onClick={() => setCreateOpen(true)}
            >
              Guruh yaratish
            </Button>
          </>
        }
      />

      {/* --------------------------------------------------- ro'yxat kartasi */}
      <Pane inset="none" className="overflow-hidden">
        <div className="px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
          <PaneHead title="Mening guruhlarim" hint="Siz a'zo bo'lgan barcha guruhlar." />
        </div>

        {isLoading ? (
          <div className="border-t border-[var(--line)] p-5 sm:p-6">
            <ListSkeleton rows={4} />
          </div>
        ) : isError ? (
          /* So'rov uzilganda "guruhingiz yo'q" deyish noto'g'ri bo'lardi */
          <div className="border-t border-[var(--line)] p-5 sm:p-6">
            <Alert
              tone="bad"
              title="Guruhlarni yuklab bo'lmadi"
              action={
                <Button size="sm" onClick={() => refetch()}>
                  Qayta urinish
                </Button>
              }
            >
              Internet aloqasini tekshirib, qayta urinib ko&apos;ring.
            </Alert>
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t border-[var(--line)]">
            <Empty
              icon={<Users className="size-5" />}
              title="Hali guruhingiz yo'q"
              description="Guruh yarating va taklif kodini do'stlaringizga yuboring."
              action={
                <Button
                  variant="primary"
                  icon={<Plus className="size-4" />}
                  onClick={() => setCreateOpen(true)}
                >
                  Guruh yaratish
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line-soft)] border-t border-[var(--line)]">
            {rows.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.slug}`}
                  className={cn(
                    "group flex items-center gap-4 px-5 py-4 transition-colors sm:px-7",
                    "duration-[var(--dur-1)] hover:bg-[var(--surface-hover)] ring-focus",
                  )}
                >
                  <GroupMark src={group.avatar_url} name={group.name} />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[15.5px] font-semibold text-[var(--text)]">
                      <span className="truncate transition-colors group-hover:text-[var(--green-text)]">
                        {group.name}
                      </span>
                      {group.is_verified ? (
                        <BadgeCheck className="size-4 shrink-0 text-[var(--green)]" />
                      ) : null}
                    </p>
                    <p className="ts-sm mt-0.5 truncate text-[var(--text-4)]">
                      {group.owner_username ? `@${group.owner_username}` : "—"}
                      {" · "}
                      {group.privacy_label?.split(" —")[0] ?? ""}
                      {group.description ? ` · ${group.description}` : ""}
                    </p>
                  </div>

                  <span className="hidden items-center gap-1.5 text-[13px] text-[var(--text-3)] sm:flex">
                    <Users className="size-3.5 text-[var(--text-4)]" />
                    <Count value={group.live_member_count || group.member_count} />
                    a&apos;zo
                  </span>

                  {/* Taklif kodi ro'yxatda KO'RSATILMAYDI: u guruh sahifasida,
                      nusxalash tugmasi bilan turadi. Ilgari kod har bir
                      qatorda ochiq yozilgan edi va ekranga tushgan rasm bilan
                      ham tarqalib ketishi mumkin edi. */}

                  <ChevronRight className="size-4 shrink-0 text-[var(--text-4)] transition-transform duration-[var(--dur-1)] group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Pane>

      {/* ------------------------------------------------------ guruh yaratish */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yangi guruh"
        description="Guruh yaratganingizdan so'ng taklif kodi hosil bo'ladi."
        footer={
          <>
            <Button size="sm" onClick={() => setCreateOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={form.name.trim().length < 2}
            >
              Yaratish
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nomi" htmlFor="group-name" required error={error ?? undefined}>
            <Input
              id="group-name"
              autoFocus
              maxLength={80}
              placeholder="Masalan: TATU 2-kurs"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>

          <Field label="Tavsif" htmlFor="group-description">
            <Textarea
              id="group-description"
              rows={3}
              maxLength={500}
              placeholder="Guruh haqida qisqacha..."
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </Field>

          <Field label="Kim qo'shila oladi" htmlFor="group-privacy">
            <Select
              value={form.privacy}
              ariaLabel="Kim qo'shila oladi"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, privacy: event.target.value as GroupPrivacy }))
              }
              options={[
                { value: "private", label: "Yopiq — faqat taklif kodi bilan" },
                { value: "request", label: "So'rov bilan — men tasdiqlayman" },
                { value: "open", label: "Ochiq — hamma qo'shila oladi" },
              ]}
            />
          </Field>
        </div>
      </Modal>

      {/* -------------------------------------------------------- kod bilan */}
      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Guruhga qo'shilish"
        description="Do'stingizdan olgan 8 xonali taklif kodini kiriting."
        size="sm"
        footer={
          <>
            <Button size="sm" onClick={() => setJoinOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => joinMutation.mutate()}
              loading={joinMutation.isPending}
              disabled={inviteCode.trim().length < 4}
            >
              Qo&apos;shilish
            </Button>
          </>
        }
      >
        <Field label="Taklif kodi" htmlFor="invite-code" error={error ?? undefined}>
          <input
            id="invite-code"
            autoFocus
            maxLength={16}
            className={cn(inputClass, "text-center font-mono text-[19px] uppercase tracking-[0.3em]")}
            placeholder="ABCD1234"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
          />
        </Field>
      </Modal>
    </div>
  );
}

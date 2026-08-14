"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";

import { useConfirm, useToast } from "@/components/providers";
import { StButton, StField, StInput, StSelect } from "@/components/studio/problem/shared";
import { Verdict, WorkEmpty, WorkPanel } from "@/components/studio/workbench";
import { Avatar } from "@/components/ui/misc";
import { api } from "@/lib/api";
import {
  CONTEST_STAFF_ROLE_HINT,
  CONTEST_STAFF_ROLE_LABEL,
  type ContestStaff,
  type ContestStaffRole,
} from "@/lib/studio-types";
import type { Paginated } from "@/lib/types";

const ROLES: ContestStaffRole[] = ["owner", "judge", "author", "observer"];

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

/**
 * «Hakamlar» tabi — olimpiada mas'ullari.
 *
 * Rol muhim: mas'ul sozlamani ham o'zgartira oladi, kuzatuvchi esa faqat
 * ko'radi. Bitta «admin/admin emas» bayrog'i o'rniga to'rt bosqich —
 * chunki musobaqada eng ko'p uchraydigan xato tasodifiy tahrir.
 */
export function ContestStaffTab({ contestId }: { contestId: string | null }) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<ContestStaffRole>("judge");
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<UserRow | null>(null);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["studio", "contest-staff", contestId],
    queryFn: () => api.get<ContestStaff[]>("/admin/contest-staff/", { contest: contestId }),
    enabled: Boolean(contestId),
  });

  // Foydalanuvchi qidiruvi — kamida 2 belgi yozilgach ishga tushadi,
  // aks holda har bosishda butun ro'yxat tortilardi.
  const { data: users } = useQuery({
    queryKey: ["studio", "user-search", search],
    queryFn: () =>
      api.get<Paginated<UserRow>>("/admin/users/", { search, page_size: 8 }),
    enabled: search.trim().length >= 2,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["studio", "contest-staff", contestId] });

  const add = useMutation({
    mutationFn: (body: { user: string; role: ContestStaffRole; note: string }) =>
      api.post<ContestStaff>("/admin/contest-staff/", { ...body, contest: contestId }),
    onSuccess: async () => {
      await invalidate();
      setPicked(null);
      setSearch("");
      setNote("");
      toast.success("Mas'ul biriktirildi");
    },
    onError: (error: unknown) =>
      toast.error("Biriktirib bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, value }: { id: string; value: ContestStaffRole }) =>
      api.patch<ContestStaff>(`/admin/contest-staff/${id}/`, { role: value }),
    onSuccess: invalidate,
    onError: (error: unknown) =>
      toast.error("O'zgartirib bo'lmadi", error instanceof Error ? error.message : String(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/contest-staff/${id}/`),
    onSuccess: async () => {
      await invalidate();
      toast.success("Mas'ul olib tashlandi");
    },
  });

  if (!contestId) {
    return (
      <WorkPanel>
        <p className="text-[15px] text-[var(--text-4)]">
          Mas&apos;ul biriktirish uchun avval olimpiadani saqlang.
        </p>
      </WorkPanel>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <WorkPanel
        title="Mas'ullar"
        hint={`${staff?.length ?? 0} ta`}
        bodyClassName={staff?.length ? "p-0" : "p-4"}
      >
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded bg-[var(--surface-hover)]" />
            ))}
          </div>
        ) : staff?.length ? (
          <ul className="divide-y divide-[var(--st-edge-soft)]">
            {staff.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar
                  src={member.avatar_url}
                  name={member.full_name || member.username}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.5px] font-medium text-[var(--text)]">
                    {member.full_name || member.username}
                  </p>
                  <p className="truncate text-[13px] text-[var(--text-4)]">
                    @{member.username}
                    {member.note ? ` · ${member.note}` : ""}
                  </p>
                </div>

                <Verdict tone={member.can_edit ? "pass" : "idle"}>
                  {member.can_edit ? "tahrir qila oladi" : "faqat ko'radi"}
                </Verdict>

                <StSelect
                  value={member.role}
                  onChange={(event) =>
                    changeRole.mutate({
                      id: member.id,
                      value: event.target.value as ContestStaffRole,
                    })
                  }
                  className="w-36"
                >
                  {ROLES.map((key) => (
                    <option key={key} value={key}>
                      {CONTEST_STAFF_ROLE_LABEL[key]}
                    </option>
                  ))}
                </StSelect>

                <button
                  type="button"
                  aria-label="Olib tashlash"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Mas'ul olib tashlansinmi?",
                      message: `@${member.username} olimpiadaga kira olmaydi.`,
                      confirmLabel: "Olib tashlash",
                      danger: true,
                    });
                    if (ok) remove.mutate(member.id);
                  }}
                  className="grid size-8 place-items-center rounded-lg text-[var(--text-4)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <WorkEmpty
            icon={<Users className="size-6" />}
            title="Mas'ul biriktirilmagan"
            hint="Olimpiadani yolg'iz o'tkazish qiyin — hakam va mualliflarni qo'shing."
          />
        )}
      </WorkPanel>

      <WorkPanel title="Yangi mas'ul" hint="Username bo'yicha qidiring">
        <div className="space-y-3">
          <StField label="Foydalanuvchi">
            <StInput
              value={picked ? `@${picked.username}` : search}
              onChange={(event) => {
                setPicked(null);
                setSearch(event.target.value);
              }}
              placeholder="username yoki ism"
            />
          </StField>

          {!picked && search.trim().length >= 2 ? (
            users?.results.length ? (
              <ul className="st-sunken max-h-56 divide-y divide-[var(--st-edge-soft)] overflow-y-auto">
                {users.results.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(row)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <Avatar src={row.avatar_url} name={row.full_name || row.username} size="xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] text-[var(--text)]">
                          {row.full_name || row.username}
                        </span>
                        <span className="block truncate text-[13px] text-[var(--text-4)]">
                          @{row.username}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-[var(--text-4)]">Foydalanuvchi topilmadi.</p>
            )
          ) : null}

          <StField label="Roli" hint={CONTEST_STAFF_ROLE_HINT[role]}>
            <StSelect
              value={role}
              onChange={(event) => setRole(event.target.value as ContestStaffRole)}
            >
              {ROLES.map((key) => (
                <option key={key} value={key}>
                  {CONTEST_STAFF_ROLE_LABEL[key]}
                </option>
              ))}
            </StSelect>
          </StField>

          <StField label="Izoh" hint="ixtiyoriy">
            <StInput
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Masalan: A va B masalalari"
            />
          </StField>

          <StButton
            variant="brand"
            className="w-full justify-center"
            disabled={!picked || add.isPending}
            onClick={() => picked && add.mutate({ user: picked.id, role, note })}
          >
            <UserPlus className="size-3.5" />
            {add.isPending ? "Qo'shilmoqda…" : "Biriktirish"}
          </StButton>

          <div className="st-sunken flex gap-2.5 p-3">
            <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--text-4)]" />
            <p className="text-[13.5px] leading-relaxed text-[var(--text-4)]">
              Mas&apos;ul va muallif olimpiadani tahrirlay oladi. Hakam savollarga javob
              beradi va qoidabuzarlik bo&apos;yicha qaror qabul qiladi. Kuzatuvchi hech
              narsani o&apos;zgartira olmaydi.
            </p>
          </div>
        </div>
      </WorkPanel>
    </div>
  );
}

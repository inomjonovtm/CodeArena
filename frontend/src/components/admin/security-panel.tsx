"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, KeyRound, ShieldOff, Smartphone } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/kit";
import { useAuth, useI18n, useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { CopyButton } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useCrudMutation } from "@/hooks/use-crud";
import { api } from "@/lib/api";
import type { PermissionCatalog, TotpSetup } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Profil sozlamalaridagi 2FA bo'limi. */
export function TwoFactorPanel() {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [password, setPassword] = useState("");

  const setupMutation = useCrudMutation(
    () => api.post<TotpSetup>("/admin/security/2fa/setup/"),
    { onSuccess: (result) => setSetup(result) },
  );

  const enableMutation = useCrudMutation(
    (value: string) =>
      api.post<{ detail: string; recovery_codes: string[] }>("/admin/security/2fa/enable/", {
        code: value,
      }),
    {
      successMessage: "2FA yoqildi",
      onSuccess: (result) => {
        setRecovery(result.recovery_codes);
        setSetup(null);
        setCode("");
        void refresh();
      },
    },
  );

  const disableMutation = useCrudMutation(
    (value: string) => api.post("/admin/security/2fa/disable/", { password: value }),
    {
      successMessage: "2FA o'chirildi",
      onSuccess: () => {
        setDisableOpen(false);
        setPassword("");
        void refresh();
      },
    },
  );

  return (
    <>
      <Card>
        <CardHeader
          title="Ikki bosqichli tasdiqlash (2FA)"
          description="Kirishda authenticator ilovasidan olingan kod so'raladi"
          action={
            user?.is_2fa_enabled ? (
              <Badge tone="success" dot>
                Yoqilgan
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                O&apos;chiq
              </Badge>
            )
          }
        />
        <CardBody className="flex flex-col gap-4">
          {user?.is_2fa_enabled ? (
            <>
              <Alert tone="ok">
                Hisobingiz himoyalangan. Har safar kirishda 6 xonali kod talab qilinadi.
              </Alert>
              <div className="flex justify-end">
                <Button
                  variant="dangerSoft"
                  size="sm"
                  className="focus-ring"
                  icon={<ShieldOff className="size-4" />}
                  onClick={() => setDisableOpen(true)}
                >
                  2FA ni o&apos;chirish
                </Button>
              </div>
            </>
          ) : setup ? (
            <>
              {/* Sirni ko'chirish maydoni botiq — oq kartadan aniq ajraladi */}
              <div className="rounded-[var(--r-pane)] bg-[var(--pane-sunken)] p-4">
                <p className="mb-2 text-[13px] font-semibold text-[var(--ink)]">
                  1. Authenticator ilovasiga qo&apos;shing
                </p>
                <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                  Google Authenticator, Authy yoki 1Password oching va quyidagi sirni qo&apos;lda
                  kiriting:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-[var(--r-ctl)] border border-[var(--edge)] bg-[var(--pane-solid)] px-3 py-2 font-mono text-[13px] tracking-wider text-[var(--ink)]">
                    {setup.secret}
                  </code>
                  <CopyButton value={setup.secret} />
                </div>
                <details className="mt-3">
                  <summary className="focus-ring cursor-pointer rounded-[6px] text-[11.5px] text-[var(--ink-4)] transition-colors hover:text-[var(--brand)]">
                    yoki otpauth:// havolasini ko&apos;rish
                  </summary>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-[var(--r-ctl)] bg-[var(--pane-solid)] px-2.5 py-1.5 font-mono text-[10.5px] text-[var(--ink-3)]">
                      {setup.otpauth_url}
                    </code>
                    <CopyButton value={setup.otpauth_url} />
                  </div>
                </details>
              </div>

              <Field label="2. Ilovadagi 6 xonali kodni kiriting" required>
                <Input
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="t-num text-center font-mono text-lg tracking-[0.4em]"
                />
              </Field>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className="focus-ring" onClick={() => setSetup(null)}>
                  {t.common.cancel}
                </Button>
                <Button
                  size="sm"
                  className="focus-ring"
                  disabled={code.length !== 6}
                  loading={enableMutation.isPending}
                  onClick={() => enableMutation.mutate(code)}
                >
                  Yoqish
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5 rounded-[var(--r-field)] bg-[var(--pane-sunken)] px-3.5 py-3">
                <Smartphone className="mt-0.5 size-4 shrink-0 text-[var(--ink-4)]" />
                <p className="text-[13px] leading-relaxed text-[var(--ink-3)]">
                  Administrator hisoblari uchun 2FA tavsiya etiladi. Parol o&apos;g&apos;irlansa
                  ham hisobga kirib bo&apos;lmaydi.
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="focus-ring"
                  icon={<KeyRound className="size-4" />}
                  loading={setupMutation.isPending}
                  onClick={() => setupMutation.mutate(undefined as never)}
                >
                  2FA ni sozlash
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Zaxira kodlar */}
      <Modal
        open={Boolean(recovery)}
        onClose={() => setRecovery(null)}
        title="Zaxira kodlarni saqlang"
        description="Telefoningizni yo'qotsangiz — shu kodlar bilan kirasiz"
        size="sm"
        footer={
          <Button
            size="sm"
            className="focus-ring"
            onClick={() => {
              void navigator.clipboard.writeText((recovery ?? []).join("\n"));
              toast.success("Nusxalandi");
              setRecovery(null);
            }}
          >
            Nusxalab yopish
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          {(recovery ?? []).map((item) => (
            <code
              key={item}
              className="rounded-[var(--r-ctl)] bg-[var(--pane-sunken)] px-2.5 py-2 text-center font-mono text-[13px] tracking-wider text-[var(--ink)]"
            >
              {item}
            </code>
          ))}
        </div>
        <Alert tone="warn" className="mt-3">
          Bu kodlar faqat bir marta ko&apos;rsatiladi. Xavfsiz joyda saqlang.
        </Alert>
      </Modal>

      {/* O'chirish */}
      <Modal
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="2FA ni o'chirish"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" className="focus-ring" onClick={() => setDisableOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="focus-ring"
              disabled={!password}
              loading={disableMutation.isPending}
              onClick={() => disableMutation.mutate(password)}
            >
              O&apos;chirish
            </Button>
          </>
        }
      >
        <Field label="Tasdiqlash uchun parolingizni kiriting" required>
          <Input
            autoFocus
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}

/** Ruxsat holatining rangi — belgi doim shakl (chek/chizib tashlash) bilan ham beriladi. */
const PERM_TONE = {
  inherited: "border-[var(--brand-edge)] bg-[var(--brand-wash)] text-[var(--brand-ink)]",
  granted: "border-[var(--note)] bg-[var(--note-wash)] text-[var(--note)]",
  denied: "border-[var(--bad)] bg-[var(--bad-wash)] text-[var(--bad)] line-through",
  none: "border-[var(--edge-strong)] text-[var(--ink-4)] hover:border-[var(--edge-strong)] hover:text-[var(--ink)]",
} as const;

/** Foydalanuvchi sahifasidagi granular ruxsatlar bo'limi. */
export function PermissionsPanel({
  userId,
  role,
  extra,
  denied,
  effective,
  onSaved,
}: {
  userId: string;
  role: string;
  extra: string[];
  denied: string[];
  effective?: string[];
  onSaved: () => void;
}) {
  const [extraSet, setExtraSet] = useState<string[]>(extra);
  const [deniedSet, setDeniedSet] = useState<string[]>(denied);

  const { data: catalog } = useQuery({
    queryKey: ["permission-catalog"],
    queryFn: () => api.get<PermissionCatalog>("/admin/security/permissions/"),
  });

  const saveMutation = useCrudMutation(
    () =>
      api.post(`/admin/users/${userId}/permissions/`, {
        extra: extraSet,
        denied: deniedSet,
      }),
    { successMessage: "Ruxsatlar yangilandi", onSuccess: onSaved },
  );

  const roleDefaults = new Set(catalog?.roles[role as keyof typeof catalog.roles] ?? []);
  const dirty =
    JSON.stringify([...extraSet].sort()) !== JSON.stringify([...extra].sort()) ||
    JSON.stringify([...deniedSet].sort()) !== JSON.stringify([...denied].sort());

  const stateOf = (code: string) => {
    if (deniedSet.includes(code)) return "denied" as const;
    if (extraSet.includes(code)) return "granted" as const;
    return roleDefaults.has(code) ? ("inherited" as const) : ("none" as const);
  };

  /**
   * Bitta bosishda holat aylanadi: roldagi holat → berilgan → olib tashlangan.
   *
   * Rolda bor ruxsat uchun «berish» ma'nosiz, shuning uchun u to'g'ridan-to'g'ri
   * «olib tashlangan» ga o'tadi — aks holda foydalanuvchi hech narsa
   * o'zgarmagandek his qilardi.
   */
  const cycle = (code: string) => {
    const state = stateOf(code);
    if (state === "denied") {
      setDeniedSet(deniedSet.filter((item) => item !== code));
      return;
    }
    if (state === "granted") {
      setExtraSet(extraSet.filter((item) => item !== code));
      setDeniedSet([...deniedSet, code]);
      return;
    }
    if (state === "inherited") {
      setDeniedSet([...deniedSet, code]);
      return;
    }
    setExtraSet([...extraSet, code]);
  };

  /** Guruhdagi hamma ruxsatni berish yoki roldagi holatga qaytarish. */
  const toggleGroup = (codes: string[], grant: boolean) => {
    if (grant) {
      setDeniedSet(deniedSet.filter((item) => !codes.includes(item)));
      setExtraSet([...new Set([...extraSet, ...codes.filter((c) => !roleDefaults.has(c))])]);
    } else {
      setExtraSet(extraSet.filter((item) => !codes.includes(item)));
      setDeniedSet([...new Set([...deniedSet, ...codes.filter((c) => roleDefaults.has(c))])]);
    }
  };

  const effectiveCount =
    (catalog?.all ?? []).filter((code) => stateOf(code) !== "denied" && stateOf(code) !== "none")
      .length;

  return (
    <Card>
      <CardHeader
        title="Ruxsatlar"
        description={`Rol bergan ruxsatlar ustidan alohida qo'shish yoki olib tashlash · hozir ${effectiveCount} / ${catalog?.all.length ?? 0}`}
      />
      <CardBody className="space-y-5">
        {/* Izoh qatori — rang yagona signal emas, shakl ham farqlaydi */}
        <div className="flex flex-wrap gap-3 text-[11.5px] text-[var(--ink-3)]">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] border border-[var(--brand-edge)] bg-[var(--brand)]" />{" "}
            roldan meros
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] border border-[var(--note)] bg-[var(--note)]" />{" "}
            qo&apos;shimcha berilgan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] border border-[var(--bad)] bg-[var(--bad)]" />{" "}
            olib tashlangan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] border border-[var(--edge-strong)]" /> berilmagan
          </span>
        </div>

        {/* Guruh — botiq maydon; oq karta ichida karta ochilmaydi */}
        {catalog?.groups.map((group) => {
          const codes = group.permissions.map((row) => row.code);
          const allOn = codes.every((code) => stateOf(code) !== "denied" && stateOf(code) !== "none");
          return (
            <div key={group.key} className="rounded-[var(--r-pane)] bg-[var(--pane-sunken)] p-4">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="t-eyebrow">{group.label}</p>
                <button
                  type="button"
                  onClick={() => toggleGroup(codes, !allOn)}
                  className="focus-ring rounded-[var(--r-ctl)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand-wash)]"
                >
                  {allOn ? "Hammasini olib tashlash" : "Hammasini berish"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.permissions.map((row) => {
                  const state = stateOf(row.code);
                  return (
                    <button
                      key={row.code}
                      type="button"
                      aria-pressed={state !== "denied" && state !== "none"}
                      onClick={() => cycle(row.code)}
                      title={`${row.code} — bosing: berish / olib tashlash`}
                      className={cn(
                        "focus-ring inline-flex items-center gap-1.5 rounded-[var(--r-chip)] border px-2.5 py-1",
                        "text-[12px] transition-colors duration-[var(--t-fast)]",
                        PERM_TONE[state],
                      )}
                    >
                      {state === "inherited" || state === "granted" ? (
                        <Check className="size-3" />
                      ) : null}
                      {row.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {effective?.length ? (
          <details className="rounded-[var(--r-pane)] bg-[var(--pane-sunken)] p-4">
            <summary className="focus-ring cursor-pointer rounded-[6px] text-[12.5px] font-medium text-[var(--ink-3)]">
              Hozirgi amaldagi kodlar (<span className="t-num">{effective.length}</span>)
            </summary>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-[var(--ink-4)]">
              {effective.join(", ")}
            </p>
          </details>
        ) : null}

        {/* Yopishqoq saqlash paneli — o'zgarish bo'lgandagina chiqadi */}
        {dirty ? (
          <div className="pane-solid enter-pop sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-pane)] px-4 py-3 shadow-[var(--lift-3)]">
            <p className="t-meta text-[var(--ink-2)]">Ruxsatlar o&apos;zgardi — saqlanmagan</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="focus-ring"
                onClick={() => {
                  setExtraSet(extra);
                  setDeniedSet(denied);
                }}
              >
                Bekor qilish
              </Button>
              <Button
                size="sm"
                className="focus-ring"
                disabled={!dirty}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(undefined as never)}
              >
                Saqlash
              </Button>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

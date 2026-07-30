"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  LogOut,
  Mail,
  MailCheck,
  Monitor,
  Moon,
  Save,
  Send,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Block,
  Button,
  Chip,
  Divider,
  Empty,
  Field,
  Input,
  LinkButton,
  ListSkeleton,
  Modal,
  PageHead,
  Pane,
  Spinner,
  Toggle,
  inputClass,
  textareaClass,
} from "@/components/kit";
import { useAuth, useI18n, useTheme, useToast } from "@/components/providers";
import type { ThemeMode } from "@/components/providers/theme-provider";
import { usePush } from "@/hooks/use-push";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { AvatarPicker } from "@/components/site/avatar-picker";
import { ApiError } from "@/lib/api";
import { authApi, publicApi } from "@/lib/public-api";
import { cn, formatDate, formatRelative } from "@/lib/utils";

const COUNTRIES = [
  { code: "", label: "Ko'rsatilmagan" },
  { code: "UZ", label: "O'zbekiston" },
  { code: "KZ", label: "Qozog'iston" },
  { code: "KG", label: "Qirg'iziston" },
  { code: "TJ", label: "Tojikiston" },
  { code: "TM", label: "Turkmaniston" },
  { code: "RU", label: "Rossiya" },
  { code: "TR", label: "Turkiya" },
  { code: "US", label: "AQSH" },
  { code: "DE", label: "Germaniya" },
  { code: "GB", label: "Buyuk Britaniya" },
];

/* ------------------------------------------------------------- yon nav */

const NAV = [
  { id: "profil", label: "Profil", icon: <UserIcon className="size-4" /> },
  { id: "korinish", label: "Ko'rinish", icon: <Monitor className="size-4" /> },
  { id: "hisob", label: "Hisob", icon: <Mail className="size-4" /> },
  { id: "xavfsizlik", label: "Xavfsizlik", icon: <Shield className="size-4" /> },
  { id: "bildirishnoma", label: "Bildirishnomalar", icon: <Bell className="size-4" /> },
] as const;

type SectionId = (typeof NAV)[number]["id"];

// Effekt har renderda qayta qurilmasligi uchun barqaror ro'yxat
const NAV_IDS = NAV.map((item) => item.id);

/**
 * Chapdagi yopishqoq bo'lim navigatsiyasi. Faol bo'lim scroll bo'yicha
 * kuzatiladi (IntersectionObserver) — tab emas, hamma bo'lim bitta sahifada.
 */
function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  // Havola bosilganda observer bir zum boshqa bo'limni ko'rsatib yubormasligi uchun
  const lockRef = useRef<number>(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px" },
    );
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [ids]);

  const jump = (id: string) => {
    setActive(id);
    lockRef.current = Date.now() + 700;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return { active, jump };
}

/* --------------------------------------------------------- kichik yordamchilar */

/** Kit uslubidagi native select — chevron bilan. */
function SelectBox({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, "appearance-none pr-9", !value && "text-[var(--ink-4)]")}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--ink-4)]" />
    </div>
  );
}

/** Nusxalash tugmasi — bosilganda qisqa "check" tasdig'i. */
function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="quiet"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      icon={copied ? <Check className="size-3.5 text-[var(--ok)]" /> : <Copy className="size-3.5" />}
    >
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------------ sahifa */

export default function SettingsPage() {
  const { user, loading, refresh, logout } = useAuth();
  const { active, jump } = useScrollSpy(NAV_IDS);

  if (loading) return <Spinner label="Yuklanmoqda..." />;

  if (!user) {
    return (
      <Empty
        icon={<UserIcon className="size-5" />}
        title="Sozlamalar shaxsiy"
        description="Hisobingiz sozlamalarini ko'rish uchun kiring."
        action={<LinkButton href="/login" variant="primary">Kirish</LinkButton>}
      />
    );
  }

  return (
    <>
      <PageHead
        eyebrow="Hisob"
        title="Sozlamalar"
        lead="Profil, xavfsizlik va bildirishnomalarni bir joydan boshqaring."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* --- chap: yopishqoq bo'lim navigatsiyasi --- */}
        <nav
          aria-label="Sozlamalar bo'limlari"
          className="hidden lg:block"
        >
          <div className="sticky top-[calc(var(--bar)+24px)] flex flex-col gap-0.5">
            {NAV.map((item) => {
              const current = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => jump(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--r-ctl)] px-3 py-2 text-left text-[13.5px] font-medium focus-ring",
                    "transition-colors duration-[var(--t-fast)]",
                    current
                      ? "edge-brand bg-[var(--brand-wash)] text-[var(--brand-ink)]"
                      : "text-[var(--ink-3)] hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
                  )}
                >
                  <span className={current ? "text-[var(--brand)]" : "text-[var(--ink-4)]"}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* --- o'ng: barcha bo'limlar bitta oqimda --- */}
        <div className="flex min-w-0 flex-col gap-10">
          <ProfileSection onSaved={refresh} />
          <AppearanceSection />
          <AccountSection onLoggedOut={logout} />
          <SecuritySection />
          <NotificationsSection onSaved={refresh} />
        </div>
      </div>
    </>
  );
}

/** Bo'lim qobig'i — anchor id + sarlavha + kontent. */
function SettingsSection({
  id,
  title,
  hint,
  children,
}: {
  id: SectionId;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--bar)+24px)]">
      <h2 className="t-section text-[var(--ink)]">{title}</h2>
      {hint ? <p className="t-meta mt-1 text-[var(--ink-3)]">{hint}</p> : null}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ profil */

function ProfileSection({ onSaved }: { onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const toast = useToast();

  const initial = {
    full_name: user?.full_name ?? "",
    bio: user?.bio ?? "",
    avatar_url: user?.avatar_url ?? "",
    country: user?.country ?? "",
    region: user?.region ?? "",
    district: user?.district ?? "",
    education_place: user?.education_place ?? "",
    github_url: user?.github_url ?? "",
    website_url: user?.website_url ?? "",
  };

  const [form, setForm] = useState(initial);
  // "Iflos" holatni aniqlash uchun oxirgi saqlangan nusxa
  const [baseline, setBaseline] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const mutation = useMutation({
    mutationFn: () => authApi.updateProfile(form),
    onSuccess: async () => {
      setErrors({});
      setBaseline(form);
      toast.success("Profil saqlandi");
      await onSaved();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const next: Record<string, string> = {};
        for (const key of Object.keys(form)) {
          const message = error.fieldError(key);
          if (message) next[key] = message;
        }
        setErrors(next);
        if (!Object.keys(next).length) toast.error("Saqlanmadi", error.message);
      } else {
        toast.error("Saqlanmadi");
      }
    },
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Google orqali kirganlarda viloyat/tuman bo'sh qoladi — shu yerdan to'ldiriladi
  const { data: geo } = useQuery({
    queryKey: ["geo-regions"],
    queryFn: () => publicApi.regions(),
    staleTime: 60 * 60 * 1000,
  });
  const regions = geo?.regions ?? [];
  const districts = regions.find((row) => row.name === form.region)?.districts ?? [];

  return (
    <SettingsSection
      id="profil"
      title="Ommaviy profil"
      hint="Bu ma'lumotlar profilingizda va reytinglarda ko'rinadi."
    >
      <Pane className="enter">
        <AvatarPicker
          src={form.avatar_url}
          name={form.full_name || user?.username}
          onChanged={async (avatarUrl) => {
            // Formani ham yangilaymiz — "Saqlash" bosilganda eski havola
            // qaytadan yuborilib, yangi rasmni bosib ketmasligi kerak.
            setForm((prev) => ({ ...prev, avatar_url: avatarUrl }));
            setBaseline((prev) => ({ ...prev, avatar_url: avatarUrl }));
            await onSaved();
          }}
        />

        <Divider className="my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="To'liq ism" htmlFor="full_name" error={errors.full_name}>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(event) => set("full_name", event.target.value)}
              maxLength={120}
            />
          </Field>

          <Field label="Mamlakat" htmlFor="country" error={errors.country}>
            <SelectBox
              id="country"
              value={form.country}
              onChange={(next) => set("country", next)}
              options={COUNTRIES.map((item) => ({ value: item.code, label: item.label }))}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="O'zingiz haqingizda" htmlFor="bio" hint="500 belgigacha" error={errors.bio}>
            <textarea
              id="bio"
              rows={3}
              maxLength={500}
              className={textareaClass}
              placeholder="Nima bilan shug'ullanasiz, qaysi mavzular qiziq..."
              value={form.bio}
              onChange={(event) => set("bio", event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Viloyat" htmlFor="region" error={errors.region}>
            <SelectBox
              id="region"
              value={form.region}
              placeholder="Tanlanmagan"
              onChange={(next) => setForm((prev) => ({ ...prev, region: next, district: "" }))}
              options={regions.map((row) => ({ value: row.name, label: row.name }))}
            />
          </Field>

          <Field label="Tuman / shahar" htmlFor="district" error={errors.district}>
            <SelectBox
              id="district"
              value={form.district}
              disabled={!form.region}
              placeholder={form.region ? "Tanlanmagan" : "Avval viloyat"}
              onChange={(next) => set("district", next)}
              options={districts.map((name) => ({ value: name, label: name }))}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field
            label="Ta'lim maskani"
            htmlFor="education_place"
            hint="Maktab, litsey, kollej yoki universitet nomi"
            error={errors.education_place}
          >
            <Input
              id="education_place"
              placeholder="masalan: 42-son umumta'lim maktabi"
              value={form.education_place}
              onChange={(event) => set("education_place", event.target.value)}
              maxLength={160}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="GitHub" htmlFor="github_url" error={errors.github_url}>
            <Input
              id="github_url"
              placeholder="https://github.com/username"
              value={form.github_url}
              onChange={(event) => set("github_url", event.target.value)}
            />
          </Field>
          <Field label="Veb-sayt" htmlFor="website_url" error={errors.website_url}>
            <Input
              id="website_url"
              placeholder="https://sizning-saytingiz.uz"
              value={form.website_url}
              onChange={(event) => set("website_url", event.target.value)}
            />
          </Field>
        </div>

        {/* Saqlash paneli: iflos holat aniq ko'rsatiladi */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {dirty ? (
            <Chip tone="warn" dot>
              Saqlanmagan o&apos;zgarishlar
            </Chip>
          ) : null}
          <Button
            variant="primary"
            icon={<Save className="size-4" />}
            loading={mutation.isPending}
            disabled={!dirty}
            onClick={() => mutation.mutate()}
          >
            Saqlash
          </Button>
        </div>
      </Pane>
    </SettingsSection>
  );
}

/* ---------------------------------------------------------------- ko'rinish */

function AppearanceSection() {
  const { mode, setMode } = useTheme();

  /* Uch holat: yorug', qorong'i va tizim. "Tizim" alohida qiymat — uni
     ikki holatli almashtirgichga sig'dirib bo'lmaydi. */
  const themes: { value: ThemeMode; label: string; hint: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Yorug'", hint: "iliq qog'oz", icon: <Sun className="size-4" /> },
    { value: "dark", label: "Qorong'i", hint: "kechki ish uchun", icon: <Moon className="size-4" /> },
    {
      value: "system",
      label: "Tizim",
      hint: "qurilma sozlamasi",
      icon: <Monitor className="size-4" />,
    },
  ];

  return (
    <SettingsSection
      id="korinish"
      title="Ko'rinish"
      hint="Mavzu shu qurilmada saqlanadi. Sayt o'zbek tilida ishlaydi."
    >
      <Pane>
        <p className="t-eyebrow mb-3">Mavzu</p>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Mavzu">
          {themes.map((item) => {
            const selected = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(item.value)}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--r-field)] border p-3.5 text-left focus-ring",
                  "transition-[background-color,border-color] duration-[var(--t-fast)]",
                  selected
                    ? "border-[var(--brand-edge)] bg-[var(--brand-wash)]"
                    : "border-[var(--edge)] bg-[var(--pane)] hover:border-[var(--edge-strong)]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0",
                    selected ? "text-[var(--brand)]" : "text-[var(--ink-4)]",
                  )}
                >
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[13.5px] font-medium",
                      selected ? "text-[var(--brand-ink)]" : "text-[var(--ink)]",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-[var(--ink-4)]">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Pane>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------- hisob */

function AccountSection({ onLoggedOut }: { onLoggedOut: () => Promise<void> }) {
  const { user } = useAuth();
  const toast = useToast();
  const { siteEmail } = useSiteSettings();

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const resendMutation = useMutation({
    mutationFn: () => authApi.resendVerification(),
    onSuccess: (data) => toast.success("Xat yuborildi", data.detail),
    onError: (error) =>
      toast.error(
        "Yuborilmadi",
        error instanceof ApiError ? error.message : "Keyinroq urinib ko'ring.",
      ),
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(passwords.current, passwords.next),
    onSuccess: () => {
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordError(null);
      toast.success("Parol yangilandi");
    },
    onError: (error) =>
      setPasswordError(
        error instanceof ApiError
          ? error.fieldError("current_password") ||
            error.fieldError("new_password") ||
            error.message
          : "Parolni o'zgartirib bo'lmadi.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: () => authApi.deactivate(deletePassword),
    onSuccess: async () => {
      toast.success("Hisob faolsizlantirildi");
      await onLoggedOut();
    },
    onError: (error) =>
      setDeleteError(
        error instanceof ApiError ? error.message : "Hisobni faolsizlantirib bo'lmadi.",
      ),
  });

  const submitPassword = () => {
    if (passwords.next !== passwords.confirm) {
      setPasswordError("Yangi parollar mos kelmadi.");
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordError("Parol kamida 8 ta belgidan iborat bo'lsin.");
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <SettingsSection id="hisob" title="Hisob" hint="Email manzil, parol va hisob holati.">
      {/* --------------------------------------------------------- email */}
      <Pane>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
            <Mail className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-medium text-[var(--ink)]">{user?.email}</p>
            <div className="mt-1.5">
              {user?.is_email_verified ? (
                <Chip tone="ok" icon={<MailCheck className="size-3.5" />}>
                  Tasdiqlangan
                </Chip>
              ) : (
                <Chip tone="warn" icon={<AlertTriangle className="size-3.5" />}>
                  Tasdiqlanmagan
                </Chip>
              )}
            </div>
          </div>
          {!user?.is_email_verified ? (
            <Button
              variant="quiet"
              size="sm"
              icon={<Mail className="size-4" />}
              loading={resendMutation.isPending}
              onClick={() => resendMutation.mutate()}
            >
              Tasdiqlash xatini yuborish
            </Button>
          ) : null}
        </div>

        {!user?.is_email_verified ? (
          <Alert tone="warn" className="mt-4">
            Emailingiz tasdiqlanmagan — parolni tiklash va muhim bildirishnomalar ishlamasligi
            mumkin.
          </Alert>
        ) : null}
      </Pane>

      {/* --------------------------------------------------------- parol */}
      <Pane>
        <div className="flex items-center gap-2.5">
          <KeyRound className="size-4 text-[var(--ink-4)]" />
          <h3 className="text-[14.5px] font-semibold text-[var(--ink)]">
            Parolni o&apos;zgartirish
          </h3>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Joriy parol" htmlFor="current-password">
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, current: event.target.value }))
              }
            />
          </Field>
          <Field label="Yangi parol" htmlFor="new-password">
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={passwords.next}
              onChange={(event) => setPasswords((prev) => ({ ...prev, next: event.target.value }))}
            />
          </Field>
          <Field label="Tasdiqlash" htmlFor="confirm-password">
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, confirm: event.target.value }))
              }
            />
          </Field>
        </div>

        {passwordError ? (
          <Alert tone="bad" className="mt-4">
            {passwordError}
          </Alert>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Button
            variant="quiet"
            loading={passwordMutation.isPending}
            disabled={!passwords.current || !passwords.next || !passwords.confirm}
            onClick={submitPassword}
          >
            Parolni yangilash
          </Button>
        </div>
      </Pane>

      {/* ------------------------------------------------------ xavfli zona */}
      <div
        className="rounded-[var(--r-pane)] border bg-[var(--pane-solid)] p-5"
        style={{ borderColor: "color-mix(in oklab, var(--bad) 28%, transparent)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-[var(--r-ctl)] bg-[var(--bad-wash)] text-[var(--bad)]">
            <Trash2 className="size-4" />
          </span>
          <h3 className="text-[14.5px] font-semibold text-[var(--bad)]">
            Hisobni faolsizlantirish
          </h3>
        </div>
        <p className="t-meta mt-2.5 max-w-2xl text-[var(--ink-3)]">
          Profilingiz ommadan yopiladi va tizimga kira olmaysiz. Yechimlaringiz musobaqa
          natijalari uchun arxivda qoladi. To&apos;liq o&apos;chirishni so&apos;rash uchun{" "}
          {siteEmail} manziliga yozing.
        </p>
        <div className="mt-4">
          <Button
            variant="ghost"
            icon={<LogOut className="size-4" />}
            className="text-[var(--bad)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
            onClick={() => setDeleteOpen(true)}
          >
            Hisobni faolsizlantirish
          </Button>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hisobni faolsizlantirish"
        description="Tasdiqlash uchun parolingizni kiriting. Bu amalni bekor qilish uchun qo'llab-quvvatlashga murojaat qilish kerak bo'ladi."
        size="sm"
        footer={
          <>
            <Button variant="quiet" size="sm" onClick={() => setDeleteOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleteMutation.isPending}
              disabled={!deletePassword}
              onClick={() => deleteMutation.mutate()}
            >
              Faolsizlantirish
            </Button>
          </>
        }
      >
        <Field label="Parol" htmlFor="deactivate-password" error={deleteError ?? undefined}>
          <Input
            id="deactivate-password"
            type="password"
            autoFocus
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
          />
        </Field>
      </Modal>
    </SettingsSection>
  );
}

/* -------------------------------------------------------------- xavfsizlik */

function SecuritySection() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [setupOpen, setSetupOpen] = useState(false);
  const [code, setCode] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => authApi.sessions.list(),
  });

  const setupMutation = useMutation({
    mutationFn: () => authApi.twoFactor.setup(),
    onError: (error) =>
      toast.error(
        "Sozlashni boshlab bo'lmadi",
        error instanceof ApiError ? error.message : undefined,
      ),
  });

  const enableMutation = useMutation({
    mutationFn: () => authApi.twoFactor.enable(code),
    onSuccess: async (data) => {
      setRecoveryCodes(data.recovery_codes);
      setCode("");
      setSetupError(null);
      toast.success("2FA yoqildi");
      await refresh();
    },
    onError: (error) =>
      setSetupError(error instanceof ApiError ? error.message : "Kodni tasdiqlab bo'lmadi."),
  });

  const disableMutation = useMutation({
    mutationFn: () => authApi.twoFactor.disable(disablePassword),
    onSuccess: async () => {
      setDisableOpen(false);
      setDisablePassword("");
      setDisableError(null);
      toast.success("2FA o'chirildi");
      await refresh();
    },
    onError: (error) =>
      setDisableError(error instanceof ApiError ? error.message : "Amal bajarilmadi."),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => authApi.sessions.revoke(id),
    onSuccess: () => {
      toast.success("Sessiya yopildi");
      void queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: () => toast.error("Sessiyani yopib bo'lmadi"),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: () => authApi.sessions.revokeOthers(),
    onSuccess: (data) => {
      toast.success(data.detail);
      void queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: () => toast.error("Sessiyalarni yopib bo'lmadi"),
  });

  const openSetup = async () => {
    setSetupError(null);
    setRecoveryCodes(null);
    setSetupOpen(true);
    await setupMutation.mutateAsync().catch(() => undefined);
  };

  const activeSessions = (sessions ?? []).filter((row) => row.is_active);

  return (
    <SettingsSection
      id="xavfsizlik"
      title="Xavfsizlik"
      hint="Ikki bosqichli tasdiqlash va faol sessiyalar."
    >
      {/* ----------------------------------------------------------- 2FA */}
      <Pane>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-[var(--r-ctl)]",
                  user?.is_2fa_enabled
                    ? "bg-[var(--ok-wash)] text-[var(--ok)]"
                    : "bg-[var(--pane-sunken)] text-[var(--ink-4)]",
                )}
              >
                <ShieldCheck className="size-4" />
              </span>
              <h3 className="text-[14.5px] font-semibold text-[var(--ink)]">
                Ikki bosqichli tasdiqlash (2FA)
              </h3>
            </div>
            <p className="t-meta mt-2.5 max-w-2xl text-[var(--ink-3)]">
              Parolingiz o&apos;g&apos;irlansa ham hisobingiz himoyalangan bo&apos;ladi: kirishda
              Authenticator ilovasidagi 6 xonali kod so&apos;raladi.
            </p>
          </div>

          {user?.is_2fa_enabled ? (
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Chip tone="ok" icon={<ShieldCheck className="size-3.5" />}>
                Yoqilgan
              </Chip>
              <button
                type="button"
                onClick={() => setDisableOpen(true)}
                className="rounded-[6px] text-[12.5px] text-[var(--ink-4)] transition-colors hover:text-[var(--bad)] focus-ring"
              >
                O&apos;chirish
              </button>
            </div>
          ) : (
            <Button variant="brand-soft" onClick={openSetup}>
              2FA ni yoqish
            </Button>
          )}
        </div>
      </Pane>

      {/* ------------------------------------------------------ sessiyalar */}
      <Pane tone="solid" inset="none">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
          <div>
            <h3 className="text-[14.5px] font-semibold text-[var(--ink)]">Faol sessiyalar</h3>
            <p className="t-meta mt-0.5 text-[var(--ink-3)]">
              Hisobingizga qaysi qurilmalardan kirilgan.
            </p>
          </div>
          {activeSessions.length > 1 ? (
            <Button
              variant="quiet"
              size="sm"
              icon={<LogOut className="size-4" />}
              loading={revokeOthersMutation.isPending}
              onClick={() => revokeOthersMutation.mutate()}
            >
              Boshqa hammasini yopish
            </Button>
          ) : null}
        </div>

        {sessionsLoading ? (
          <div className="px-5 pb-5">
            <ListSkeleton rows={3} />
          </div>
        ) : activeSessions.length === 0 ? (
          <p className="t-meta px-5 pb-5 text-[var(--ink-4)]">Faol sessiya topilmadi.</p>
        ) : (
          <ul className="divide-y divide-[var(--edge-soft)] border-t border-[var(--edge)]">
            {activeSessions.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "flex flex-wrap items-center gap-3.5 px-5 py-3.5",
                  row.is_current && "bg-[var(--brand-wash)]",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-ctl)] bg-[var(--pane-sunken)] text-[var(--ink-3)]">
                  {row.device === "Android" || row.device === "iOS" || row.device === "Mobil" ? (
                    <Smartphone className="size-4" />
                  ) : (
                    <Monitor className="size-4" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium text-[var(--ink)]">
                    {row.browser} · {row.device}
                    {row.is_current ? (
                      <Chip tone="brand" className="px-2 py-0.5 text-[11px]">
                        joriy
                      </Chip>
                    ) : null}
                  </p>
                  <p className="t-meta mt-0.5 text-[var(--ink-4)]">
                    {row.ip_address ?? "IP noma'lum"} · {formatRelative(row.last_seen_at)} faol ·{" "}
                    {formatDate(row.created_at, false)} dan
                  </p>
                </div>

                {!row.is_current ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--ink-3)] hover:bg-[var(--bad-wash)] hover:text-[var(--bad)]"
                    onClick={() => revokeMutation.mutate(row.id)}
                  >
                    Yopish
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Pane>

      {/* --------------------------------------------------- 2FA sozlash */}
      <Modal
        open={setupOpen}
        onClose={() => {
          setSetupOpen(false);
          setRecoveryCodes(null);
        }}
        title={recoveryCodes ? "Zaxira kodlarni saqlang" : "2FA ni sozlash"}
        description={
          recoveryCodes
            ? "Telefoningizni yo'qotsangiz shu kodlar bilan kirasiz. Ular boshqa ko'rsatilmaydi."
            : "Authenticator ilovasiga sirni yoki otpauth havolasini qo'shing."
        }
        footer={
          recoveryCodes ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSetupOpen(false);
                setRecoveryCodes(null);
              }}
            >
              Saqladim, yopish
            </Button>
          ) : (
            <>
              <Button variant="quiet" size="sm" onClick={() => setSetupOpen(false)}>
                Bekor qilish
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={enableMutation.isPending}
                disabled={code.length !== 6}
                onClick={() => enableMutation.mutate()}
              >
                Tasdiqlash
              </Button>
            </>
          )
        }
      >
        {recoveryCodes ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((item) => (
                <span
                  key={item}
                  className="rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] px-3 py-2 text-center font-mono text-[13.5px] tracking-wider text-[var(--ink)]"
                >
                  {item}
                </span>
              ))}
            </div>
            <CopyBtn value={recoveryCodes.join("\n")} label="Hammasini nusxalash" />
          </div>
        ) : setupMutation.isPending ? (
          <Block className="h-48 rounded-[var(--r-pane)]" />
        ) : setupMutation.data ? (
          <div className="flex flex-col items-center gap-4">
            <OtpAuthLink value={setupMutation.data.otpauth_url} />

            <div className="w-full">
              <p className="t-meta mb-1.5 text-center text-[var(--ink-4)]">
                Yoki sirni qo&apos;lda kiriting
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] px-3 py-2 font-mono text-[13px] tracking-wider text-[var(--ink)]">
                  {setupMutation.data.secret}
                </code>
                <CopyBtn value={setupMutation.data.secret} />
              </div>
            </div>

            <Field
              label="Ilovadagi 6 xonali kod"
              htmlFor="totp-code"
              error={setupError ?? undefined}
              className="w-full"
            >
              <Input
                id="totp-code"
                inputMode="numeric"
                maxLength={6}
                className="text-center font-mono text-[18px] tracking-[0.4em]"
                placeholder="000000"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </div>
        ) : (
          <Alert tone="bad">
            Sozlashni boshlab bo&apos;lmadi. Oynani yopib, qaytadan urinib ko&apos;ring.
          </Alert>
        )}
      </Modal>

      {/* --------------------------------------------------- 2FA o'chirish */}
      <Modal
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="2FA ni o'chirish"
        description="Tasdiqlash uchun parolingizni kiriting."
        size="sm"
        footer={
          <>
            <Button variant="quiet" size="sm" onClick={() => setDisableOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={disableMutation.isPending}
              disabled={!disablePassword}
              onClick={() => disableMutation.mutate()}
            >
              O&apos;chirish
            </Button>
          </>
        }
      >
        <Field label="Parol" htmlFor="disable-2fa" error={disableError ?? undefined}>
          <Input
            id="disable-2fa"
            type="password"
            autoFocus
            value={disablePassword}
            onChange={(event) => setDisablePassword(event.target.value)}
          />
        </Field>
      </Modal>
    </SettingsSection>
  );
}

/**
 * `otpauth://` havolasi.
 *
 * QR rasm chizish uchun tashqi xizmatga so'rov yubormaymiz — sir shu havola
 * ichida bo'lgani uchun uni uchinchi tomonga uzatish xavfsiz emas. Foydalanuvchi
 * havolani yoki sirni nusxalab, Authenticator ilovasiga qo'lda qo'shadi.
 */
function OtpAuthLink({ value }: { value: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-[var(--r-pane)] border border-[var(--edge)] bg-[var(--pane-sunken)] p-4">
      <p className="t-meta text-center text-[var(--ink-3)]">
        Authenticator ilovangizda «havola orqali qo&apos;shish» ni tanlang yoki quyidagi sirni
        qo&apos;lda kiriting.
      </p>
      <code className="w-full overflow-x-auto rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-solid)] px-3 py-2 font-mono text-[11.5px] whitespace-nowrap text-[var(--ink-2)]">
        {value}
      </code>
      <CopyBtn value={value} label="Havolani nusxalash" />
    </div>
  );
}

/* ---------------------------------------------------------- bildirishnoma */

function NotificationsSection({ onSaved }: { onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const toast = useToast();

  const [notifyEmail, setNotifyEmail] = useState(user?.notify_email ?? true);
  const [notifyContest, setNotifyContest] = useState(user?.notify_contest ?? true);
  const [notifyFollower, setNotifyFollower] = useState(user?.notify_follower ?? true);

  useEffect(() => {
    setNotifyEmail(user?.notify_email ?? true);
    setNotifyContest(user?.notify_contest ?? true);
    setNotifyFollower(user?.notify_follower ?? true);
  }, [user]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<{
      notify_email: boolean;
      notify_contest: boolean;
      notify_follower: boolean;
    }>) => authApi.updateProfile(payload),
    onSuccess: async () => {
      toast.success("Sozlama saqlandi");
      await onSaved();
    },
    onError: () => toast.error("Saqlanmadi"),
  });

  return (
    <SettingsSection
      id="bildirishnoma"
      title="Bildirishnomalar"
      hint="Sayt ichidagi qo'ng'iroq har doim ishlaydi — bu yerda email xabarlarini boshqarasiz."
    >
      <Pane>
        <div className="flex flex-col divide-y divide-[var(--edge-soft)]">
          <Toggle
            className="py-3.5 first:pt-0"
            label="Email xabarlar"
            hint="Hisob, xavfsizlik va muhim e'lonlar haqida xat"
            checked={notifyEmail}
            onChange={(value) => {
              setNotifyEmail(value);
              mutation.mutate({ notify_email: value });
            }}
          />
          <Toggle
            className="py-3.5"
            label="Musobaqa eslatmalari"
            hint="Yozilgan musobaqangiz boshlanishidan oldin eslatma"
            checked={notifyContest}
            onChange={(value) => {
              setNotifyContest(value);
              mutation.mutate({ notify_contest: value });
            }}
          />
          <Toggle
            className="py-3.5 last:pb-0"
            label="Yangi obunachilar"
            hint="Kimdir sizga obuna bo'lganda bildirishnoma"
            checked={notifyFollower}
            onChange={(value) => {
              setNotifyFollower(value);
              mutation.mutate({ notify_follower: value });
            }}
          />
        </div>

        <BrowserPushCard />

        <p className="t-meta mt-4 text-[var(--ink-4)]">
          Bildirishnomalar tarixini{" "}
          <a
            href="/notifications"
            className="rounded-[4px] font-medium text-[var(--brand)] hover:underline focus-ring"
          >
            alohida sahifada
          </a>{" "}
          ko&apos;rishingiz mumkin.
        </p>
      </Pane>
    </SettingsSection>
  );
}

/**
 * Brauzer push xabarlari — sayt yopiq bo'lganda ham keladigan bildirishnomalar.
 *
 * Serverda VAPID kalitlari sozlanmagan bo'lsa blok umuman ko'rsatilmaydi:
 * ishlamaydigan tugmani ko'rsatgandan ko'ra, uni yashirgan ma'qul.
 */
function BrowserPushCard() {
  const toast = useToast();
  const push = usePush();

  if (push.loading || (!push.configured && push.supported)) return null;

  const blocked = push.permission === "denied";

  return (
    <div className="mt-5 rounded-[var(--r-field)] border border-[var(--edge)] bg-[var(--pane-sunken)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-[8px]",
                push.subscribed
                  ? "bg-[var(--ok-wash)] text-[var(--ok)]"
                  : "bg-[var(--pane-solid)] text-[var(--ink-4)]",
              )}
            >
              <BellRing className="size-3.5" />
            </span>
            <h4 className="text-[13.5px] font-semibold text-[var(--ink)]">
              Brauzer bildirishnomalari
            </h4>
            {push.subscribed ? (
              <Chip tone="ok" className="px-2 py-0.5 text-[11px]">
                yoqilgan
              </Chip>
            ) : null}
          </div>
          <p className="t-meta mt-1.5 max-w-xl text-[var(--ink-3)]">
            {push.supported
              ? "Musobaqa boshlanishi va yechim natijasi haqida sayt yopiq bo'lganda ham xabar keladi."
              : "Bu brauzer push xabarlarini qo'llab-quvvatlamaydi. Chrome, Edge yoki Firefox'ning yangi versiyasida ishlaydi."}
          </p>
          {push.devices > 1 && push.subscribed ? (
            <p className="t-meta mt-1 text-[var(--ink-4)]">
              Hisobingizda <span className="t-num">{push.devices}</span> ta qurilma obuna
              bo&apos;lgan.
            </p>
          ) : null}
        </div>

        {push.supported ? (
          <div className="flex shrink-0 items-center gap-2">
            {push.subscribed ? (
              <>
                <Button
                  variant="quiet"
                  size="sm"
                  icon={<Send className="size-4" />}
                  disabled={push.busy}
                  onClick={async () => {
                    const detail = await push.sendTest();
                    if (detail) toast.success("Sinov xabari yuborildi", detail);
                  }}
                >
                  Sinov
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  loading={push.busy}
                  onClick={async () => {
                    if (await push.unsubscribe()) toast.success("Obuna bekor qilindi");
                  }}
                >
                  O&apos;chirish
                </Button>
              </>
            ) : (
              <Button
                variant="brand-soft"
                size="sm"
                loading={push.busy}
                disabled={blocked}
                onClick={async () => {
                  if (await push.subscribe()) toast.success("Bu qurilma obuna bo'ldi");
                }}
              >
                Yoqish
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {push.error ? (
        <p className="mt-3 text-[12.5px] text-[var(--bad)]">{push.error}</p>
      ) : blocked && !push.error ? (
        <p className="t-meta mt-3 text-[var(--ink-4)]">
          Bildirishnomalar shu sayt uchun bloklangan. Manzil qatoridagi qulf belgisini bosib
          ruxsat bering, so&apos;ng sahifani yangilang.
        </p>
      ) : null}
    </div>
  );
}

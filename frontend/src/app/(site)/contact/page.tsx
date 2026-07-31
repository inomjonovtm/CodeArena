"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Bug,
  Clock,
  Handshake,
  HelpCircle,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Send,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Alert,
  ChoiceRow,
  Button,
  Divider,
  Field,
  Input,
  PageHead,
  Pane,
  SplitLayout,
  Textarea,
} from "@/components/kit";
import { useAuth, useI18n, useToast } from "@/components/providers";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { ApiError } from "@/lib/api";
import { publicApi } from "@/lib/public-api";
import type { ContactTopic } from "@/lib/types";

/** Mavzu → ikonka. Tanlov kartalarini bir qarashda farqlaydi. */
const TOPIC_ICON: Record<ContactTopic, React.ReactNode> = {
  general: <HelpCircle className="size-4" />,
  bug: <Bug className="size-4" />,
  problem: <Terminal className="size-4" />,
  partnership: <Handshake className="size-4" />,
  other: <MoreHorizontal className="size-4" />,
};

export default function ContactPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const { siteEmail } = useSiteSettings();

  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "general" as ContactTopic,
    subject: "",
    body: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  // Tizimga kirgan bo'lsa ism va emailni oldindan to'ldiramiz
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || user.full_name || user.username,
      email: prev.email || user.email,
    }));
  }, [user]);

  const TOPICS: { value: ContactTopic; label: string }[] = [
    { value: "general", label: t.site.contact.topicGeneral },
    { value: "bug", label: t.site.contact.topicBug },
    { value: "problem", label: t.site.contact.topicProblem },
    { value: "partnership", label: t.site.contact.topicPartnership },
    { value: "other", label: t.site.contact.topicOther },
  ];

  const mutation = useMutation({
    mutationFn: () => publicApi.contact(form),
    onSuccess: (response) => {
      setErrors({});
      setSent(true);
      setForm((prev) => ({ ...prev, subject: "", body: "" }));
      toast.success(response.detail);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const next: Record<string, string> = {};
        for (const key of Object.keys(form)) {
          const message = error.fieldError(key);
          if (message) next[key] = message;
        }
        setErrors(next);
        if (!Object.keys(next).length) toast.error(error.message);
      } else {
        toast.error(t.common.error);
      }
    },
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Maydonlarga bog'lanmagan umumiy xato — forma tepasida ko'rsatiladi
  const generalError =
    mutation.isError && !Object.keys(errors).length
      ? mutation.error instanceof ApiError
        ? mutation.error.message
        : t.common.error
      : null;

  return (
    /* Sarlavha kanvasda, forma va yordamchi ustun kartada. Bloklar orasi
       keng — forma "havodor" bo'lsa to'ldirish osonroq seziladi. */
    <div className="flex flex-col gap-12">
      {/* ------------------------------------------------- sarlavha kartasi */}
      <PageHead
        eyebrow="Aloqa"
        title={t.site.nav.contact}
        lead={t.site.contact.subtitle}
        meta={
          <a
            href={`mailto:${siteEmail}`}
            className="focus-ring flex items-center gap-2 rounded-[6px] text-[14px] font-medium text-[var(--ink-2)] transition-colors hover:text-[var(--brand)]"
          >
            <Mail className="size-4" />
            {siteEmail}
          </a>
        }
      />

      <SplitLayout
        aside={
          /* ---------------------------------------------- ma'lumot kartasi */
          <Pane inset="lg" className="enter">
            <div className="flex flex-col gap-5">
              <div>
                <span className="flex size-9 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
                  <Mail className="size-4" />
                </span>
                <p className="mt-3 text-[13.5px] font-semibold text-[var(--ink)]">
                  {t.site.contact.emailUsTitle}
                </p>
                <p className="t-meta mt-1 text-[var(--ink-3)]">{t.site.contact.emailUsBody}</p>
              </div>

              <Divider />

              <div>
                <span className="flex size-9 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
                  <MessageSquare className="size-4" />
                </span>
                <p className="mt-3 text-[13.5px] font-semibold text-[var(--ink)]">
                  {t.site.contact.communityTitle}
                </p>
                <p className="t-meta mt-1 text-[var(--ink-3)]">{t.site.contact.communityBody}</p>
                <Link
                  href="/discussions"
                  className="focus-ring mt-2.5 inline-flex items-center gap-1.5 rounded-[6px] text-[13px] font-medium text-[var(--brand-ink)] transition-colors hover:text-[var(--brand)]"
                >
                  {t.site.nav.discussions}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              <Divider />

              <div>
                <span className="flex size-9 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
                  <Clock className="size-4" />
                </span>
                <p className="mt-3 text-[13.5px] font-semibold text-[var(--ink)]">
                  {t.site.contact.responseTitle}
                </p>
                <p className="t-meta mt-1 text-[var(--ink-3)]">{t.site.contact.responseBody}</p>
              </div>
            </div>
          </Pane>
        }
      >
        {/* ---------------------------------------------------- forma kartasi */}
        <Pane inset="lg" className="enter">
          {sent ? (
            <Alert tone="ok" title={t.site.contact.sentTitle} className="mb-6">
              {t.site.contact.sentBody}
            </Alert>
          ) : null}

          {generalError ? (
            <Alert tone="bad" title={t.common.error} className="mb-6">
              {generalError}
            </Alert>
          ) : null}

          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t.site.contact.name} htmlFor="name" required error={errors.name}>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  maxLength={120}
                  required
                />
              </Field>

              <Field label="Email" htmlFor="email" required error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                  required
                />
              </Field>
            </div>

            <Field label={t.site.contact.topic} error={errors.topic}>
              <ChoiceRow
                value={form.topic}
                onChange={(next) => set("topic", next)}
                options={TOPICS.map((item) => ({
                  value: item.value,
                  label: item.label,
                  icon: TOPIC_ICON[item.value],
                }))}
              />
            </Field>

            <Field
              label={t.site.contact.subject}
              htmlFor="subject"
              required
              error={errors.subject}
            >
              <Input
                id="subject"
                value={form.subject}
                onChange={(event) => set("subject", event.target.value)}
                maxLength={200}
                required
              />
            </Field>

            <Field
              label={t.site.contact.message}
              htmlFor="body"
              required
              hint={t.site.contact.messageHint}
              error={errors.body}
            >
              <Textarea
                id="body"
                rows={7}
                value={form.body}
                onChange={(event) => set("body", event.target.value)}
                required
              />
            </Field>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-[13.5px] text-[var(--ink-3)]">
                <Clock className="size-4" />
                {t.site.contact.responseBody}
              </p>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                icon={<Send className="size-[18px]" />}
                loading={mutation.isPending}
              >
                {mutation.isPending ? t.common.saving : t.site.contact.send}
              </Button>
            </div>
          </form>
        </Pane>
      </SplitLayout>
    </div>
  );
}

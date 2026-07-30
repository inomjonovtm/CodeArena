"use client";

import { Keyboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  label: string;
  href?: string;
  group: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "K"], label: "Global qidiruv (command palette)", group: "Umumiy" },
  { keys: ["?"], label: "Yorliqlar ro'yxati", group: "Umumiy" },
  { keys: ["Esc"], label: "Oyna / panelni yopish", group: "Umumiy" },

  { keys: ["G", "D"], label: "Boshqaruv paneli", href: "/admin", group: "O'tish" },
  { keys: ["G", "P"], label: "Masalalar", href: "/admin/problems", group: "O'tish" },
  { keys: ["G", "U"], label: "Foydalanuvchilar", href: "/admin/users", group: "O'tish" },
  { keys: ["G", "S"], label: "Submissionlar", href: "/admin/submissions", group: "O'tish" },
  { keys: ["G", "C"], label: "Musobaqalar", href: "/admin/contests", group: "O'tish" },
  { keys: ["G", "M"], label: "Anti-plagiat", href: "/admin/plagiarism", group: "O'tish" },
  { keys: ["G", "J"], label: "Judge0", href: "/admin/judge0", group: "O'tish" },
  { keys: ["G", "T"], label: "Savatcha", href: "/admin/trash", group: "O'tish" },
  { keys: ["G", ","], label: "Sozlamalar", href: "/admin/settings", group: "O'tish" },

  { keys: ["N"], label: "Yangi yozuv (joriy bo'limda)", group: "Amallar" },
  { keys: ["/"], label: "Jadval qidiruviga fokus", group: "Amallar" },
];

const NEW_ROUTES: Record<string, string> = {
  "/admin/problems": "/admin/problems/new",
  "/admin/contests": "/admin/contests/new",
};

/** Global klaviatura yorliqlari + yordam oynasi (`?`). */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let pendingG = false;
    let timer: ReturnType<typeof setTimeout>;

    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el as HTMLElement).isContentEditable
      );
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping()) return;

      const key = event.key.toLowerCase();

      // `?` — yordam
      if (event.key === "?" || (event.shiftKey && key === "/")) {
        event.preventDefault();
        setOpen((state) => !state);
        return;
      }

      // `/` — qidiruvga fokus
      if (key === "/") {
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Qidir"], input[placeholder*="qidir"], input[type="search"]',
        );
        if (input) {
          event.preventDefault();
          input.focus();
        }
        return;
      }

      // `N` — yangi yozuv
      if (key === "n") {
        const target = Object.entries(NEW_ROUTES).find(([base]) =>
          window.location.pathname.startsWith(base),
        );
        if (target) {
          event.preventDefault();
          router.push(target[1]);
        }
        return;
      }

      // `G` + harf — bo'limga o'tish
      if (pendingG) {
        pendingG = false;
        clearTimeout(timer);
        const match = SHORTCUTS.find(
          (shortcut) =>
            shortcut.keys.length === 2 &&
            shortcut.keys[0] === "G" &&
            shortcut.keys[1].toLowerCase() === event.key.toLowerCase() &&
            shortcut.href,
        );
        if (match?.href) {
          event.preventDefault();
          router.push(match.href);
        }
        return;
      }

      if (key === "g") {
        pendingG = true;
        timer = setTimeout(() => (pendingG = false), 1200);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [router]);

  const groups = [...new Set(SHORTCUTS.map((item) => item.group))];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Klaviatura yorliqlari (?)"
        aria-label="Klaviatura yorliqlari"
        className={cn(
          "focus-ring fixed bottom-4 left-4 z-30 hidden size-9 items-center justify-center lg:flex",
          "rounded-[var(--r-chip)] border border-[var(--edge)] bg-[var(--pane-solid)] text-[var(--ink-4)]",
          "shadow-[var(--lift-2)] transition-colors duration-[var(--t-fast)]",
          "hover:bg-[var(--pane)] hover:text-[var(--brand)]",
        )}
      >
        <Keyboard className="size-4" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Klaviatura yorliqlari"
        description="Panelni sichqonchasiz boshqarish"
        size="lg"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {groups.map((group) => (
            // Har bir guruh — alohida blok
            <div key={group} className="pane rounded-[var(--r-pane)] p-4">
              <p className="t-eyebrow mb-3">{group}</p>
              <div className="space-y-2">
                {SHORTCUTS.filter((item) => item.group === group).map((item) => (
                  <div
                    key={item.keys.join("+") + item.label}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="min-w-0 truncate text-[var(--ink-2)]">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((key) => (
                        <kbd
                          key={key}
                          className={cn(
                            "rounded-[6px] border border-[var(--edge)] bg-[var(--pane-solid)] px-1.5 py-0.5",
                            "font-mono text-[10.5px] font-semibold text-[var(--ink)]",
                          )}
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

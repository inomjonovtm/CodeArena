"use client";

import { ImagePlus, Loader2, Link2, Trash2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { useToast } from "@/components/providers";
import type { MediaFile } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Input } from "./field";

const MAX_MB = 5;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";

/**
 * Drag & drop rasm yuklovchi. Yuklangan faylning URL'i `onChange` orqali
 * qaytadi — shuning uchun mavjud `*_url` maydonlari bilan mos ishlaydi.
 *
 * Bo'sh holat — botiq iliq maydon: "bu yerga tashlash mumkin" degani
 * shakldan ko'rinadi. Sudrab kelinganda maydon brend yuvindisiga o'tadi.
 */
export function ImageUpload({
  value,
  onChange,
  kind = "attachment",
  aspect = "aspect-[16/9]",
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  kind?: MediaFile["kind"];
  aspect?: string;
  className?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [manual, setManual] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Faqat rasm fayllari qabul qilinadi");
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`Fayl juda katta`, `Limit: ${MAX_MB} MB, sizniki: ${Math.round(file.size / 1024)} KB`);
        return;
      }

      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);

        const response = await fetch("/api/admin/media", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.detail ?? `Yuklanmadi (${response.status})`);
        }
        onChange((payload as MediaFile).url);
        toast.success("Rasm yuklandi");
      } catch (error) {
        toast.error("Yuklab bo'lmadi", String(error instanceof Error ? error.message : error));
      } finally {
        setUploading(false);
      }
    },
    [kind, onChange, toast],
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value ? (
        <div
          className={cn(
            "group relative overflow-hidden rounded-[var(--r-field)] border border-[var(--edge)]",
            aspect,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="size-full object-cover" />
          {/* Amallar qatlami — rasm ustidagi yagona to'q sirt */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 bg-[rgb(10_10_10/0.6)]",
              "opacity-0 transition-opacity duration-[var(--t-fast)]",
              "group-hover:opacity-100 focus-within:opacity-100",
            )}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={<Upload className="size-3.5" />}
              onClick={() => inputRef.current?.click()}
            >
              Almashtirish
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              icon={<Trash2 className="size-3.5" />}
              onClick={() => onChange("")}
            >
              O&apos;chirish
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={cn(
            "focus-ring flex w-full flex-col items-center justify-center gap-2 rounded-[var(--r-pane)] border-2 border-dashed p-6",
            "transition-[background-color,border-color] duration-[var(--t-fast)]",
            aspect,
            dragging
              ? "border-[var(--brand)] bg-[var(--brand-wash)]"
              : "border-[var(--edge-strong)] bg-[var(--pane-sunken)] hover:border-[var(--brand-edge)] hover:bg-[var(--pane-hover)]",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-[var(--brand)]" />
              <span className="text-[13px] text-[var(--ink-3)]">Yuklanmoqda...</span>
            </>
          ) : (
            <>
              <span className="flex size-11 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
                <ImagePlus className="size-5" />
              </span>
              <span className="text-[13px] font-medium text-[var(--ink)]">
                Rasmni tashlang yoki tanlang
              </span>
              <span className="t-num text-[11px] text-[var(--ink-4)]">
                JPG, PNG, WebP, GIF, SVG · maks. {MAX_MB} MB
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setManual((state) => !state)}
          className={cn(
            "focus-ring inline-flex items-center gap-1 rounded-[6px] text-[11.5px] font-medium text-[var(--ink-4)]",
            "transition-colors duration-[var(--t-fast)] hover:text-[var(--brand)]",
          )}
        >
          <Link2 className="size-3" />
          {manual ? "URL kiritishni yopish" : "yoki URL kiriting"}
        </button>
      </div>

      {manual ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://..."
        />
      ) : null}
    </div>
  );
}

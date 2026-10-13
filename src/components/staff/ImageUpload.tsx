import { useEffect, useRef, useState } from "react";
import { ImagePlus, RefreshCw, X } from "lucide-react";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/staff-options";

type Props = {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
  variant: "wide" | "round";
};

export function ImageUpload({ label, hint, file, onChange, variant }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) return setError("Please choose a JPG, PNG or WebP image.");
    if (f.size > MAX_IMAGE_BYTES) return setError("Image must be smaller than 8 MB.");
    setError(null);
    onChange(f);
  }

  return (
    <div>
      <span className="mb-1.5 block font-semibold">{label}</span>
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {url ? (
        <div className="flex items-center gap-4">
          <img
            src={url}
            alt={`${label} preview`}
            className={
              variant === "wide"
                ? "aspect-[16/9] w-full max-w-sm rounded-xl border object-cover"
                : "size-28 shrink-0 rounded-full border-4 border-card object-cover shadow-soft"
            }
          />
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => ref.current?.click()} className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
              <RefreshCw className="size-4" /> Replace
            </button>
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <X className="size-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-card text-muted-foreground transition hover:border-gold hover:bg-gold-soft ${variant === "wide" ? "py-10" : "py-8"}`}
        >
          <ImagePlus className="size-8 text-gold" />
          <span className="font-medium text-foreground">Tap to upload</span>
          <span className="text-xs">JPG, PNG or WebP · up to 8 MB</span>
        </button>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

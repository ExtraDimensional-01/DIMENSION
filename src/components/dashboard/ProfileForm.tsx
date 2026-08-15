"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ImageIcon, X } from "lucide-react";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import { initials } from "@/lib/utils";

export function ProfileForm({
  initialProducerName,
  initialBio,
  initialImageUrl,
  initialBannerUrl,
}: {
  initialProducerName: string;
  initialBio: string;
  initialImageUrl: string | null;
  initialBannerUrl: string | null;
}) {
  const router = useRouter();

  const [producerName, setProducerName] = useState(initialProducerName);
  const [bio, setBio] = useState(initialBio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialImageUrl);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialBannerUrl);
  const [bannerRemoved, setBannerRemoved] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarSelect(file: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Profile picture must be a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`Profile picture must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB`);
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleBannerSelect(file: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Banner must be a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`Banner must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB`);
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setBannerRemoved(false);
  }

  function handleRemoveBanner() {
    setBannerFile(null);
    setBannerPreview(null);
    setBannerRemoved(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!producerName.trim()) {
      setError("Producer name is required");
      return;
    }

    const formData = new FormData();
    formData.set("producerName", producerName.trim());
    formData.set("bio", bio.trim());
    if (avatarFile) formData.set("avatar", avatarFile);
    if (bannerFile) formData.set("banner", bannerFile);
    if (bannerRemoved) formData.set("removeBanner", "true");

    setSubmitting(true);
    const res = await fetch("/api/profile", { method: "PATCH", body: formData });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save changes");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Profile banner <span className="font-normal text-muted-2">(optional)</span>
        </label>
        <p className="mb-2.5 text-xs text-muted-2">
          Shown across the top of your public profile. Recommended around 3:1 (e.g. 1500×500).
        </p>
        <div
          onClick={() => bannerInputRef.current?.click()}
          className="relative flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface transition hover:border-muted-2 sm:h-36"
        >
          <input
            ref={bannerInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleBannerSelect(e.target.files[0])}
          />
          {bannerPreview ? (
            <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-2">
              <ImageIcon size={20} />
              <span className="text-xs">Click to upload a banner</span>
            </div>
          )}
        </div>
        {bannerPreview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveBanner();
            }}
            className="mt-2 flex items-center gap-1 text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
          >
            <X size={11} />
            Remove banner
          </button>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Profile picture</label>
        <div className="flex items-center gap-4">
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-accent transition hover:opacity-90"
          >
            <input
              ref={avatarInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarSelect(e.target.files[0])}
            />
            {avatarPreview ? (
              <Image src={avatarPreview} alt="Profile picture" fill className="object-cover" />
            ) : (
              <span className="text-lg font-semibold text-accent-foreground">
                {initials(producerName || "?")}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-muted-2"
          >
            Change photo
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Producer name</label>
        <input
          value={producerName}
          onChange={(e) => setProducerName(e.target.value)}
          maxLength={50}
          required
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          Bio <span className="font-normal text-muted-2">(optional)</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={1000}
          rows={4}
          className="input resize-none"
          placeholder="Tell listeners about your sound..."
        />
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Profile updated
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Save changes
        </button>
      </div>
    </form>
  );
}

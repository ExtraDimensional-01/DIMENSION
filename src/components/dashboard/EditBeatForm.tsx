"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2, Music2, RefreshCw, UploadCloud } from "lucide-react";
import { GENRES, MOODS, MUSICAL_KEYS, MAX_IMAGE_SIZE_BYTES, MAX_AUDIO_SIZE_BYTES } from "@/lib/constants";
import {
  uploadWithProgress,
  uploadFileDirectToR2,
  getAudioDuration,
  getWaveformPeaks,
} from "@/lib/upload-client";
import { TagInput } from "@/components/dashboard/TagInput";
import { formatFileSize, formatDuration, cn } from "@/lib/utils";
import type { BeatDetail } from "@/types";

export function EditBeatForm({ beat, r2Enabled }: { beat: BeatDetail; r2Enabled: boolean }) {
  const router = useRouter();

  const [title, setTitle] = useState(beat.title);
  const [bpm, setBpm] = useState(String(beat.bpm));
  const [key, setKey] = useState(beat.key);
  const [genre, setGenre] = useState(beat.genre);
  const [mood, setMood] = useState(beat.mood ?? "");
  const [description, setDescription] = useState(beat.description);
  const [tags, setTags] = useState<string[]>(beat.tags);
  const [isPublic, setIsPublic] = useState(beat.isPublic);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(beat.coverUrl);
  const [coverRemoved, setCoverRemoved] = useState(false);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [analyzingAudio, setAnalyzingAudio] = useState(false);
  const [showAudioPicker, setShowAudioPicker] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  function handleCoverSelect(file: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Cover artwork must be a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`Cover artwork must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB`);
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverRemoved(false);
  }

  function handleRemoveCover() {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverRemoved(true);
  }

  async function handleAudioSelect(file: File) {
    setError(null);
    const isMp3 = file.type === "audio/mpeg" || file.type === "audio/mp3";
    const isWav = file.type === "audio/wav" || file.type === "audio/x-wav" || file.type === "audio/wave";
    if (!isMp3 && !isWav) {
      setError("Audio must be an MP3 or WAV file");
      return;
    }
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      setError(`Audio file must be under ${Math.round(MAX_AUDIO_SIZE_BYTES / 1024 / 1024)}MB`);
      return;
    }
    setAudioFile(file);
    setWaveformPeaks([]);

    const duration = await getAudioDuration(file);
    setAudioDuration(duration);

    setAnalyzingAudio(true);
    const peaks = await getWaveformPeaks(file);
    setWaveformPeaks(peaks);
    setAnalyzingAudio(false);
  }

  function handleCancelAudioReplace() {
    setAudioFile(null);
    setWaveformPeaks([]);
    setAudioDuration(0);
    setShowAudioPicker(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a beat title");
      return;
    }
    if (!bpm || Number(bpm) < 20 || Number(bpm) > 300) {
      setError("Please enter a valid BPM (20–300)");
      return;
    }
    setSubmitting(true);
    setProgress(0);

    try {
      // If replacing audio and R2 is enabled, upload it directly to R2 first
      // (large files shouldn't pass through our own server), then submit the
      // rest of the form with just the resulting key.
      let uploadedAudioKey: string | null = null;
      if (audioFile && r2Enabled) {
        const uploaded = await uploadFileDirectToR2(audioFile, "beat-audio", { beatId: beat.id }, setProgress);
        uploadedAudioKey = uploaded.key;
      }

      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("bpm", bpm);
      formData.set("key", key);
      formData.set("genre", genre);
      formData.set("mood", mood);
      formData.set("description", description.trim());
      formData.set("tags", JSON.stringify(tags));
      formData.set("isPublic", String(isPublic));
      if (coverFile) formData.set("cover", coverFile);
      if (coverRemoved) formData.set("removeCover", "true");
      if (audioFile) {
        if (uploadedAudioKey) {
          formData.set("audioKey", uploadedAudioKey);
        } else {
          formData.set("audio", audioFile);
        }
        formData.set("durationSec", String(audioDuration));
        if (waveformPeaks.length > 0) formData.set("waveformPeaks", JSON.stringify(waveformPeaks));
      }

      const { ok, data } = await uploadWithProgress(
        `/api/beats/${beat.id}`,
        "PATCH",
        formData,
        setProgress
      );
      if (!ok) {
        setError(data.error ?? "Failed to save changes");
        setSubmitting(false);
        return;
      }
      router.push(`/beats/${beat.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Cover artwork <span className="font-normal text-muted-2">(optional)</span>
        </label>
        <div className="flex items-center gap-4">
          <div
            onClick={() => coverInputRef.current?.click()}
            className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface transition hover:border-muted-2"
          >
            <input
              ref={coverInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCoverSelect(e.target.files[0])}
            />
            {coverPreview ? (
              <Image src={coverPreview} alt="Cover preview" fill className="object-cover" />
            ) : (
              <UploadCloud size={18} className="text-muted-2" />
            )}
          </div>
          {coverPreview && (
            <button
              type="button"
              onClick={handleRemoveCover}
              className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
            >
              Remove cover
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Audio file</label>
        {!showAudioPicker ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-2">
              <Music2 size={13} />
              {beat.audioFormat.toUpperCase()} · {formatFileSize(beat.audioSize)}
            </div>
            <button
              type="button"
              onClick={() => setShowAudioPicker(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent transition hover:text-accent-hover"
            >
              <RefreshCw size={12} />
              Replace audio
            </button>
          </div>
        ) : (
          <div
            onClick={() => !audioFile && audioInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition",
              !audioFile && "cursor-pointer border-border hover:border-muted-2"
            )}
          >
            <input
              ref={audioInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAudioSelect(e.target.files[0])}
            />
            {audioFile ? (
              <>
                <Music2 size={20} className="text-accent" />
                <p className="text-sm font-medium text-foreground">{audioFile.name}</p>
                <p className="text-xs text-muted-2">
                  {formatFileSize(audioFile.size)}
                  {audioDuration > 0 && ` · ${formatDuration(audioDuration)}`}
                  {analyzingAudio && " · Analyzing..."}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelAudioReplace();
                  }}
                  className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <UploadCloud size={20} className="text-muted-2" />
                <p className="text-xs text-muted-2">
                  Click to choose a new MP3 or WAV — replaces the current preview file
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAudioPicker(false);
                  }}
                  className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Visibility</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={cn(
              "flex flex-1 items-center gap-2.5 rounded-lg border px-4 py-3 text-left transition",
              isPublic ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-muted-2"
            )}
          >
            <Eye size={16} className={isPublic ? "text-accent" : "text-muted-2"} />
            <div>
              <p className="text-sm font-medium text-foreground">Public</p>
              <p className="text-xs text-muted-2">Shows up in browse, search, and your profile</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={cn(
              "flex flex-1 items-center gap-2.5 rounded-lg border px-4 py-3 text-left transition",
              !isPublic ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-muted-2"
            )}
          >
            <EyeOff size={16} className={!isPublic ? "text-accent" : "text-muted-2"} />
            <div>
              <p className="text-sm font-medium text-foreground">Unlisted</p>
              <p className="text-xs text-muted-2">Hidden from browse/search — link still works</p>
            </div>
          </button>
        </div>
      </div>

      <Field label="Beat title" required>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="BPM" required>
          <input
            type="number"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="Key" required>
          <select value={key} onChange={(e) => setKey(e.target.value)} className="input">
            {MUSICAL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Genre" required>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="input">
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mood" hint="Optional">
          <select value={mood} onChange={(e) => setMood(e.target.value)} className="input">
            <option value="">None</option>
            {MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Tags" hint="Press Enter or comma to add a tag">
        <TagInput tags={tags} onChange={setTags} />
      </Field>

      <Field label="Description" hint="Optional">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
          className="input resize-none"
        />
      </Field>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {submitting && (
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-10 text-xs text-muted-2">{progress}%</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-danger">*</span>}
        {hint && <span className="ml-1.5 font-normal text-muted-2">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

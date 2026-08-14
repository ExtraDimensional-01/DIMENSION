"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Music2, UploadCloud } from "lucide-react";
import { GENRES, MOODS, MUSICAL_KEYS, MAX_AUDIO_SIZE_BYTES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import { formatFileSize, formatDuration } from "@/lib/utils";
import { getAudioDuration, getWaveformPeaks, uploadWithProgress } from "@/lib/upload-client";
import { TagInput } from "@/components/dashboard/TagInput";
import { Waveform } from "@/components/beats/Waveform";
import { LicenseTierEditor, type DraftLicense } from "@/components/dashboard/LicenseTierEditor";

export function UploadForm() {
  const router = useRouter();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [analyzingWaveform, setAnalyzingWaveform] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState<string>(MUSICAL_KEYS[0]);
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [mood, setMood] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [licenses, setLicenses] = useState<DraftLicense[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
    if (!title) setTitle(file.name.replace(/\.(mp3|wav)$/i, ""));

    const duration = await getAudioDuration(file);
    setAudioDuration(duration);

    setAnalyzingWaveform(true);
    const peaks = await getWaveformPeaks(file);
    setWaveformPeaks(peaks);
    setAnalyzingWaveform(false);
  }

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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!audioFile) {
      setError("Please select an audio file to upload");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a beat title");
      return;
    }
    if (!bpm || Number(bpm) < 20 || Number(bpm) > 300) {
      setError("Please enter a valid BPM (20–300)");
      return;
    }
    for (const license of licenses) {
      if (!license.name.trim()) {
        setError("Every license tier needs a name");
        return;
      }
      if (!license.price.trim() || Number.isNaN(Number(license.price)) || Number(license.price) < 0) {
        setError(`Enter a valid price for "${license.name}"`);
        return;
      }
      if (!license.file) {
        setError(`Attach a deliverable file for "${license.name}"`);
        return;
      }
    }

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("bpm", bpm);
    formData.set("key", key);
    formData.set("genre", genre);
    formData.set("mood", mood);
    formData.set("description", description.trim());
    formData.set("tags", JSON.stringify(tags));
    formData.set("durationSec", String(audioDuration));
    if (waveformPeaks.length > 0) formData.set("waveformPeaks", JSON.stringify(waveformPeaks));
    formData.set("audio", audioFile);
    if (coverFile) formData.set("cover", coverFile);
    if (licenses.length > 0) {
      formData.set(
        "licenses",
        JSON.stringify(
          licenses.map((l) => ({
            name: l.name.trim(),
            price: l.price.trim(),
            terms: l.terms.trim(),
            isExclusive: l.isExclusive,
            includedFormats: l.includedFormats,
            commercialUse: l.commercialUse,
            distributionAllowed: l.distributionAllowed,
            musicVideoAllowed: l.musicVideoAllowed,
            performanceAllowed: l.performanceAllowed,
            socialMediaAllowed: l.socialMediaAllowed,
            streamLimit: l.streamLimit.trim(),
            salesLimit: l.salesLimit.trim(),
            creditRequired: l.creditRequired,
            creditText: l.creditText.trim(),
            otherRestrictions: l.otherRestrictions.trim(),
          }))
        )
      );
      for (const license of licenses) {
        formData.append("licenseFiles", license.file!);
      }
    }

    setSubmitting(true);
    setProgress(0);
    try {
      const { ok, data } = await uploadWithProgress("/api/beats", "POST", formData, setProgress);
      if (!ok) {
        setError(data.error ?? "Failed to upload beat");
        setSubmitting(false);
        return;
      }
      router.push(`/beats/${data.beat.id}`);
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Audio dropzone */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Audio file <span className="text-danger">*</span>
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleAudioSelect(file);
          }}
          onClick={() => audioInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? "border-accent bg-accent/5" : "border-border hover:border-muted-2"
          }`}
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
              <Music2 size={22} className="text-accent" />
              <p className="text-sm font-medium text-foreground">{audioFile.name}</p>
              <p className="text-xs text-muted-2">
                {formatFileSize(audioFile.size)} · {formatDuration(audioDuration)}
              </p>
              <div className="h-10 w-full max-w-xs px-2" onClick={(e) => e.stopPropagation()}>
                {analyzingWaveform ? (
                  <p className="text-[11px] text-muted-2">Analyzing waveform...</p>
                ) : (
                  waveformPeaks.length > 0 && <Waveform peaks={waveformPeaks} />
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAudioFile(null);
                  setAudioDuration(0);
                  setWaveformPeaks([]);
                }}
                className="mt-1 text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <UploadCloud size={22} className="text-muted-2" />
              <p className="text-sm text-foreground">
                <span className="font-medium text-accent">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-2">MP3 or WAV, up to 50MB</p>
            </>
          )}
        </div>
      </div>

      {/* Cover art */}
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
          {coverFile && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-foreground">{coverFile.name}</p>
              <button
                type="button"
                onClick={() => {
                  setCoverFile(null);
                  setCoverPreview(null);
                }}
                className="text-left text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <Field label="Beat title" required>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          className="input"
          placeholder="e.g. Midnight Drive"
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
            placeholder="140"
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

      <Field
        label="License tiers"
        hint="Optional — leave empty if not for sale. Each tier has its own price, terms, and deliverable file."
      >
        <LicenseTierEditor licenses={licenses} onChange={setLicenses} />
      </Field>

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
          placeholder="Tell listeners about this beat — mood, inspiration, suggested use..."
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
          {submitting ? "Uploading..." : "Upload beat"}
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

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Music2, UploadCloud, X } from "lucide-react";
import { COLLAB_ROLES, GENRES } from "@/lib/constants";
import { formatFileSize } from "@/lib/utils";
import { TagInput } from "@/components/dashboard/TagInput";
import type { CollabPostDetail } from "@/types";

export function CreateCollabForm({ existingPost }: { existingPost?: CollabPostDetail }) {
  const router = useRouter();
  const isEdit = !!existingPost;

  const [title, setTitle] = useState(existingPost?.title ?? "");
  const [lookingFor, setLookingFor] = useState<string>(existingPost?.lookingFor ?? COLLAB_ROLES[1]);
  const [description, setDescription] = useState(existingPost?.description ?? "");
  const [genre, setGenre] = useState<string>(existingPost?.genre ?? GENRES[0]);
  const [subgenre, setSubgenre] = useState(existingPost?.subgenre ?? "");
  const [mood, setMood] = useState(existingPost?.mood ?? "");
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>(existingPost?.skillsNeeded ?? []);
  const [isPaid, setIsPaid] = useState(existingPost?.isPaid ?? false);
  const [budgetMin, setBudgetMin] = useState(
    existingPost?.budgetMinCents != null ? (existingPost.budgetMinCents / 100).toFixed(2) : ""
  );
  const [budgetMax, setBudgetMax] = useState(
    existingPost?.budgetMaxCents != null ? (existingPost.budgetMaxCents / 100).toFixed(2) : ""
  );
  const [locationType, setLocationType] = useState(existingPost?.locationType ?? "remote");
  const [location, setLocation] = useState(existingPost?.location ?? "");
  const [deadline, setDeadline] = useState(existingPost?.deadline ? existingPost.deadline.slice(0, 10) : "");
  const [contactPref, setContactPref] = useState(existingPost?.contactPref ?? "In-app messaging preferred");
  const [attachments, setAttachments] = useState<File[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  function validate(): string | null {
    if (!title.trim()) return "Please enter a title";
    if (!genre) return "Please select a genre";
    if (isPaid && budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) {
      return "Minimum budget can't be more than the maximum";
    }
    return null;
  }

  async function submit(status: "draft" | "publish") {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(status);

    try {
      if (isEdit) {
        const res = await fetch(`/api/collabs/posts/${existingPost!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            lookingFor,
            description: description.trim(),
            genre,
            subgenre: subgenre.trim(),
            mood: mood.trim(),
            skillsNeeded,
            isPaid,
            budgetMinCents: isPaid && budgetMin ? Math.round(Number(budgetMin) * 100) : null,
            budgetMaxCents: isPaid && budgetMax ? Math.round(Number(budgetMax) * 100) : null,
            locationType,
            location: location.trim(),
            deadline: deadline || null,
            contactPref: contactPref.trim(),
            status: status === "publish" ? "open" : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to save changes");
          setSubmitting(null);
          return;
        }
        router.push(`/collabs/${existingPost!.id}`);
        router.refresh();
        return;
      }

      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("lookingFor", lookingFor);
      formData.set("description", description.trim());
      formData.set("genre", genre);
      formData.set("subgenre", subgenre.trim());
      formData.set("mood", mood.trim());
      formData.set("skillsNeeded", JSON.stringify(skillsNeeded));
      formData.set("isPaid", String(isPaid));
      if (isPaid && budgetMin) formData.set("budgetMin", budgetMin);
      if (isPaid && budgetMax) formData.set("budgetMax", budgetMax);
      formData.set("locationType", locationType);
      formData.set("location", location.trim());
      if (deadline) formData.set("deadline", deadline);
      formData.set("contactPref", contactPref.trim());
      formData.set("status", status === "publish" ? "open" : "draft");
      for (const file of attachments) formData.append("attachments", file);

      const res = await fetch("/api/collabs/posts", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create collaboration");
        setSubmitting(null);
        return;
      }
      router.push(`/collabs/${data.post.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Field label="Collaboration title" required>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="input"
          placeholder="e.g. Dark cinematic trap song — need a producer"
        />
      </Field>

      <Field label="What I'm looking for / Role needed" required>
        <select value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} className="input">
          {COLLAB_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description" hint="What's the project, and what are you looking for from a collaborator?">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={3000}
          rows={5}
          className="input resize-none"
          placeholder="Looking for a producer who can create something cinematic and aggressive with orchestral elements and heavy 808s..."
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Genre" required>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="input">
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subgenre" hint="Optional">
          <input
            value={subgenre}
            onChange={(e) => setSubgenre(e.target.value)}
            maxLength={60}
            className="input"
            placeholder="e.g. Cinematic Trap"
          />
        </Field>
        <Field label="Style / Mood" hint="Optional">
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            maxLength={60}
            className="input"
            placeholder="Dark, orchestral, cinematic"
          />
        </Field>
      </div>

      <Field label="Skills required" hint="Press Enter or comma to add">
        <TagInput tags={skillsNeeded} onChange={setSkillsNeeded} max={20} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Paid / Free">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPaid(false)}
              className={`input flex-1 py-2.5 text-sm font-medium transition ${!isPaid ? "border-accent text-accent" : "text-muted"}`}
            >
              Free / Collab
            </button>
            <button
              type="button"
              onClick={() => setIsPaid(true)}
              className={`input flex-1 py-2.5 text-sm font-medium transition ${isPaid ? "border-accent text-accent" : "text-muted"}`}
            >
              Paid
            </button>
          </div>
        </Field>
        {isPaid && (
          <Field label="Budget" hint="Optional range">
            <div className="flex items-center gap-2">
              <div className="input flex items-center gap-1.5 py-2.5">
                <span className="text-muted-2">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Min"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
                />
              </div>
              <span className="text-muted-2">–</span>
              <div className="input flex items-center gap-1.5 py-2.5">
                <span className="text-muted-2">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Max"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
                />
              </div>
            </div>
          </Field>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Remote / In Person">
          <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="input">
            <option value="remote">Remote</option>
            <option value="in_person">In Person</option>
            <option value="both">Either</option>
          </select>
        </Field>
        <Field label="Location" hint="Optional">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            className="input"
            placeholder="City, country..."
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Deadline" hint="Optional">
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
        </Field>
        <Field
          label="Social / contact preferences"
          hint="Keep it in-app where possible — don't share personal contact info here"
        >
          <input
            value={contactPref}
            onChange={(e) => setContactPref(e.target.value)}
            maxLength={200}
            className="input"
            placeholder="e.g. In-app messaging preferred"
          />
        </Field>
      </div>

      {!isEdit && (
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Attachments <span className="font-normal text-muted-2">(audio demos, beat previews, reference tracks, images, project files)</span>
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
              if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
              dragging ? "border-accent bg-accent/5" : "border-border hover:border-muted-2"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <UploadCloud size={20} className="text-muted-2" />
            <p className="text-sm text-foreground">
              <span className="font-medium text-accent">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-2">Audio, images, or project files</p>
          </div>
          {attachments.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs text-foreground">
                    <Music2 size={13} className="shrink-0 text-muted-2" />
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-muted-2">{formatFileSize(file.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-muted-2 hover:text-danger"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => submit("publish")}
          disabled={!!submitting}
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting === "publish" && <Loader2 size={15} className="animate-spin" />}
          {isEdit ? "Save & Publish" : "Publish Collaboration"}
        </button>
        <button
          type="button"
          onClick={() => submit("draft")}
          disabled={!!submitting}
          className="flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:border-muted-2 disabled:opacity-60"
        >
          {submitting === "draft" && <Loader2 size={15} className="animate-spin" />}
          Save as Draft
        </button>
      </div>
    </div>
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

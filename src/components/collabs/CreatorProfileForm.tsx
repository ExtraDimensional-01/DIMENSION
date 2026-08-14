"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { COLLAB_ROLES, AVAILABILITY_STATUSES } from "@/lib/constants";
import { TagInput } from "@/components/dashboard/TagInput";
import { cn } from "@/lib/utils";
import type { CreatorProfileSummary } from "@/types";

const AVAILABILITY_LABELS: Record<string, string> = {
  open: "Open to Work",
  busy: "Busy",
  not_available: "Not Available",
};

export function CreatorProfileForm({ initial }: { initial: CreatorProfileSummary | null }) {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>(initial?.roles ?? []);
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [experience, setExperience] = useState(initial?.experience ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [remotePref, setRemotePref] = useState(initial?.remotePref ?? "both");
  const [availability, setAvailability] = useState(initial?.availability ?? "open");
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(initial?.portfolioLinks ?? []);
  const [linkInput, setLinkInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(role: string) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function addLink() {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setError("That doesn't look like a valid URL");
      return;
    }
    setPortfolioLinks((prev) => [...prev, trimmed]);
    setLinkInput("");
  }

  async function submit() {
    if (roles.length === 0) {
      setError("Pick at least one role");
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/creator-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles,
          genres,
          skills,
          experience,
          location,
          remotePref,
          availability,
          headline,
          portfolioLinks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Your roles <span className="text-danger">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {COLLAB_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => toggleRole(role)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                roles.includes(role)
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted hover:border-muted-2 hover:text-foreground"
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Headline</label>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={160}
          className="input"
          placeholder="Producer / Artist making cinematic trap"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Genres</label>
        <TagInput tags={genres} onChange={setGenres} max={15} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Skills</label>
        <TagInput tags={skills} onChange={setSkills} max={20} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Experience level</label>
          <input
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            maxLength={60}
            className="input"
            placeholder="e.g. 5 years, Beginner, Professional"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            className="input"
            placeholder="City, country..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Remote / In Person</label>
          <select value={remotePref} onChange={(e) => setRemotePref(e.target.value)} className="input">
            <option value="remote">Remote</option>
            <option value="in_person">In Person</option>
            <option value="both">Either</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Availability</label>
          <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="input">
            {AVAILABILITY_STATUSES.map((a) => (
              <option key={a} value={a}>
                {AVAILABILITY_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Portfolio links <span className="font-normal text-muted-2">(SoundCloud, Spotify, etc.)</span>
        </label>
        <div className="flex gap-2">
          <input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
            className="input flex-1"
            placeholder="https://soundcloud.com/..."
          />
          <button
            type="button"
            onClick={addLink}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:border-muted-2 hover:text-foreground"
          >
            <Plus size={16} />
          </button>
        </div>
        {portfolioLinks.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {portfolioLinks.map((link, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5">
                <span className="truncate text-xs text-muted">{link}</span>
                <button
                  type="button"
                  onClick={() => setPortfolioLinks((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-muted-2 hover:text-danger"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">Creator profile saved.</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="flex w-fit items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        Save Creator Profile
      </button>
    </div>
  );
}

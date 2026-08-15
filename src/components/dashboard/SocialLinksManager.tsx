"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/constants";

interface SocialLinkRow {
  platform: SocialPlatform;
  url: string;
  displayName: string;
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = Object.fromEntries(
  SOCIAL_PLATFORMS.map((p) => [p.value, p.label])
) as Record<SocialPlatform, string>;

export function SocialLinksManager({ initialLinks }: { initialLinks: SocialLinkRow[] }) {
  const [links, setLinks] = useState<SocialLinkRow[]>(initialLinks);
  const [error, setError] = useState<string | null>(null);

  const [editingPlatform, setEditingPlatform] = useState<SocialPlatform | null>(null);
  const [editingUrl, setEditingUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [addPlatform, setAddPlatform] = useState<SocialPlatform | "">("");
  const [addUrl, setAddUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const linkedPlatforms = new Set(links.map((l) => l.platform));
  const availablePlatforms = SOCIAL_PLATFORMS.filter((p) => !linkedPlatforms.has(p.value));

  async function saveLink(platform: SocialPlatform, url: string): Promise<string | null> {
    setError(null);
    const res = await fetch("/api/social-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to save link");
      return null;
    }
    // The server normalizes the URL (adds https://, etc.) — reflect that
    // normalized value rather than echoing back whatever was typed.
    return data.link.url as string;
  }

  async function handleAdd() {
    if (!addPlatform || !addUrl.trim()) return;
    setAdding(true);
    const normalizedUrl = await saveLink(addPlatform, addUrl.trim());
    setAdding(false);
    if (!normalizedUrl) return;
    setLinks((prev) => [...prev, { platform: addPlatform, url: normalizedUrl, displayName: "" }]);
    setAddPlatform("");
    setAddUrl("");
  }

  async function handleSaveEdit(platform: SocialPlatform) {
    if (!editingUrl.trim()) return;
    setSaving(true);
    const normalizedUrl = await saveLink(platform, editingUrl.trim());
    setSaving(false);
    if (!normalizedUrl) return;
    setLinks((prev) => prev.map((l) => (l.platform === platform ? { ...l, url: normalizedUrl } : l)));
    setEditingPlatform(null);
  }

  async function handleRemove(platform: SocialPlatform) {
    setError(null);
    const prev = links;
    setLinks((p) => p.filter((l) => l.platform !== platform));
    const res = await fetch(`/api/social-links/${platform}`, { method: "DELETE" });
    if (!res.ok) {
      setLinks(prev);
      setError("Failed to remove link");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const reordered = [...links];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setLinks(reordered);

    const res = await fetch("/api/social-links/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((l) => l.platform) }),
    });
    if (!res.ok) {
      setLinks(links); // revert on failure
      setError("Failed to reorder links");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {links.length === 0 ? (
        <p className="text-sm text-muted-2">No social links yet — add one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link, i) => (
            <li
              key={link.platform}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0}
                  className="text-muted-2 transition hover:text-foreground disabled:opacity-20"
                  aria-label={`Move ${PLATFORM_LABEL[link.platform]} up`}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(i, 1)}
                  disabled={i === links.length - 1}
                  className="text-muted-2 transition hover:text-foreground disabled:opacity-20"
                  aria-label={`Move ${PLATFORM_LABEL[link.platform]} down`}
                >
                  <ArrowDown size={12} />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">
                  {PLATFORM_LABEL[link.platform]}
                </p>
                {editingPlatform === link.platform ? (
                  <input
                    value={editingUrl}
                    onChange={(e) => setEditingUrl(e.target.value)}
                    autoFocus
                    className="input mt-1 py-1 text-sm"
                  />
                ) : (
                  <p className="truncate text-sm text-foreground">{link.url}</p>
                )}
              </div>

              {editingPlatform === link.platform ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(link.platform)}
                    disabled={saving}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-success transition hover:bg-success/10"
                    aria-label="Save"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPlatform(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-2 transition hover:bg-surface-hover"
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlatform(link.platform);
                      setEditingUrl(link.url);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-2 transition hover:bg-surface-hover hover:text-foreground"
                    aria-label={`Edit ${PLATFORM_LABEL[link.platform]} link`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(link.platform)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-2 transition hover:bg-danger/10 hover:text-danger"
                    aria-label={`Remove ${PLATFORM_LABEL[link.platform]} link`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {availablePlatforms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
          <select
            value={addPlatform}
            onChange={(e) => setAddPlatform(e.target.value as SocialPlatform)}
            className="input w-auto min-w-[9rem] py-2"
          >
            <option value="">Choose a platform...</option>
            {availablePlatforms.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="Profile URL"
            className="input min-w-[10rem] flex-1 py-2"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!addPlatform || !addUrl.trim() || adding}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
          >
            {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add
          </button>
        </div>
      )}
    </div>
  );
}

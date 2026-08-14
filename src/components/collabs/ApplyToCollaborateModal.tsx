"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Music2, Plus, UploadCloud, X } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

export function ApplyToCollaborateModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setError(null);
  }

  async function submit() {
    if (!message.trim()) {
      setError("Please add a short message");
      return;
    }
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("message", message.trim());
    if (proposedPrice.trim()) formData.set("proposedPrice", proposedPrice.trim());
    formData.set("portfolioLinks", JSON.stringify(portfolioLinks));
    for (const file of attachments) formData.append("attachments", file);

    try {
      const res = await fetch(`/api/collabs/posts/${postId}/applications`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit application");
        setSubmitting(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="animate-fade-in max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Music2 size={20} />
            </div>
            <h3 className="text-base font-semibold text-foreground">Application sent</h3>
            <p className="text-sm text-muted">The creator will review it and get back to you.</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Apply To Collaborate</h3>
              <button onClick={onClose} className="text-muted-2 hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Message <span className="text-danger">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="input resize-none"
                  placeholder="Introduce yourself and explain why you're a good fit..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Portfolio / previous work <span className="font-normal text-muted-2">(links)</span>
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
                    aria-label="Add link"
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

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Proposed price <span className="font-normal text-muted-2">(optional)</span>
                </label>
                <div className="input flex items-center gap-1.5 py-2.5">
                  <span className="text-muted-2">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Beats / audio samples <span className="font-normal text-muted-2">(optional)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border px-4 py-5 text-center transition hover:border-muted-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && setAttachments((prev) => [...prev, ...Array.from(e.target.files!)])}
                  />
                  <UploadCloud size={18} className="text-muted-2" />
                  <p className="text-xs text-muted-2">Click to attach files</p>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5">
                        <span className="truncate text-xs text-foreground">
                          {file.name} <span className="text-muted-2">{formatFileSize(file.size)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                          className="shrink-0 text-muted-2 hover:text-danger"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
              )}

              <button
                onClick={submit}
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                Submit Application
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { COLLAB_ROLES } from "@/lib/constants";
import type { CollabPostSummary } from "@/types";

export function InviteToCollaborateModal({ inviteeId, onClose }: { inviteeId: string; onClose: () => void }) {
  const router = useRouter();
  const [myPosts, setMyPosts] = useState<CollabPostSummary[] | null>(null);
  const [postId, setPostId] = useState("");
  const [roleNeeded, setRoleNeeded] = useState<string>(COLLAB_ROLES[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/collabs/posts?mine=1")
      .then((r) => r.json())
      .then((d) => {
        const eligible = (d.posts ?? []).filter((p: CollabPostSummary) => p.status === "open" || p.status === "draft");
        setMyPosts(eligible);
        if (eligible.length > 0) {
          setPostId(eligible[0].id);
          setRoleNeeded(eligible[0].lookingFor);
        }
      })
      .catch(() => setMyPosts([]));
  }, []);

  async function submit() {
    if (!postId) {
      setError("Select a collaboration to invite them to");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/collabs/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, inviteeId, roleNeeded, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send invitation");
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
        className="animate-fade-in w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <h3 className="text-base font-semibold text-foreground">Invitation sent</h3>
            <p className="text-sm text-muted">They've been notified and can accept from their dashboard.</p>
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
              <h3 className="text-base font-semibold text-foreground">Invite To Collaborate</h3>
              <button onClick={onClose} className="text-muted-2 hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {myPosts === null ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-2" />
              </div>
            ) : myPosts.length === 0 ? (
              <p className="py-4 text-sm text-muted">
                You don&apos;t have any open collaborations to invite them to yet.{" "}
                <a href="/collabs/create" className="text-accent hover:text-accent-hover">
                  Create one
                </a>
                .
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Collaboration</label>
                  <select
                    value={postId}
                    onChange={(e) => {
                      setPostId(e.target.value);
                      const post = myPosts.find((p) => p.id === e.target.value);
                      if (post) setRoleNeeded(post.lookingFor);
                    }}
                    className="input"
                  >
                    {myPosts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Role needed</label>
                  <select value={roleNeeded} onChange={(e) => setRoleNeeded(e.target.value)} className="input">
                    {COLLAB_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Message <span className="font-normal text-muted-2">(optional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="input resize-none"
                    placeholder="I'd love to have you on this project..."
                  />
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
                  Send Invitation
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

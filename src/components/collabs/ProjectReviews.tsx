"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Star } from "lucide-react";
import type { CollabParticipant, CollabReview } from "@/types";
import { ReviewsList } from "@/components/collabs/ReviewsList";

const CATEGORIES = [
  { key: "communication", label: "Communication" },
  { key: "reliability", label: "Reliability" },
  { key: "qualityOfWork", label: "Quality of Work" },
  { key: "professionalism", label: "Professionalism" },
] as const;

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} stars`}
          className="text-muted-2 transition hover:text-accent"
        >
          <Star size={18} className={n <= value ? "fill-current text-accent" : ""} />
        </button>
      ))}
    </div>
  );
}

export function ProjectReviews({ projectId, participants }: { projectId: string; participants: CollabParticipant[] }) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<CollabReview[] | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [ratings, setRatings] = useState({ communication: 5, reliability: 5, qualityOfWork: 5, professionalism: 5, overall: 5 });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/collab-projects/${projectId}/reviews`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []));
  }, [projectId]);

  const myId = session?.user?.id;
  const others = participants.filter((p) => p.user.id !== myId);
  const alreadyReviewed = new Set((reviews ?? []).filter((r) => r.reviewer.id === myId).map((r) => r.revieweeId));

  async function submitReview(revieweeId: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/collab-projects/${projectId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revieweeId, ...ratings, comment: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit review");
        return;
      }
      setReviews((prev) => [data.review, ...(prev ?? [])]);
      setOpenFor(null);
      setComment("");
      setRatings({ communication: 5, reliability: 5, qualityOfWork: 5, professionalism: 5, overall: 5 });
    } finally {
      setSubmitting(false);
    }
  }

  if (!reviews) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {others.map((p) => {
        if (alreadyReviewed.has(p.user.id)) return null;
        const isOpen = openFor === p.user.id;
        return (
          <div key={p.user.id} className="rounded-xl border border-border p-4">
            {!isOpen ? (
              <button
                onClick={() => setOpenFor(p.user.id)}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Leave a review for {p.user.producerName}
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-foreground">Review {p.user.producerName}</p>
                {CATEGORIES.map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">{c.label}</span>
                    <RatingPicker
                      value={ratings[c.key]}
                      onChange={(v) => setRatings((prev) => ({ ...prev, [c.key]: v }))}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Overall</span>
                  <RatingPicker value={ratings.overall} onChange={(v) => setRatings((prev) => ({ ...prev, overall: v }))} />
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="input resize-none"
                  placeholder="Optional comment..."
                />
                {error && <p className="text-xs text-danger">{error}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => submitReview(p.user.id)}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
                  >
                    {submitting && <Loader2 size={13} className="animate-spin" />}
                    Submit Review
                  </button>
                  <button
                    onClick={() => setOpenFor(null)}
                    className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition hover:border-muted-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Reviews for this collaboration</h3>
        <ReviewsList reviews={reviews} />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil, Trash2, Users } from "lucide-react";

export function PostOwnerControls({
  postId,
  status,
  applicationCount,
}: {
  postId: string;
  status: string;
  applicationCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/collabs/posts/${postId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update status");
        setBusy(false);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deletePost() {
    if (!confirm("Delete this collaboration? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/collabs/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/collabs");
      router.refresh();
    } else {
      setBusy(false);
      setError("Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {status === "draft" && (
          <button
            onClick={() => changeStatus("open")}
            disabled={busy}
            className="glow-accent rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="inline animate-spin" /> : "Publish"}
          </button>
        )}
        {status === "open" && (
          <button
            onClick={() => changeStatus("draft")}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2 disabled:opacity-60"
          >
            Unpublish
          </button>
        )}
        {(status === "open" || status === "reviewing") && (
          <button
            onClick={() => changeStatus("cancelled")}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:border-danger/50 hover:text-danger disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        <Link
          href={`/collabs/${postId}/edit`}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2"
        >
          <Pencil size={14} />
          Edit
        </Link>
        <Link
          href="/dashboard/collabs"
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2"
        >
          <Users size={14} />
          Applications ({applicationCount})
        </Link>
        <button
          onClick={deletePost}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:border-danger/50 hover:text-danger disabled:opacity-60"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

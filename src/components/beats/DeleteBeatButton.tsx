"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteBeatButton({
  beatId,
  redirectTo = "/dashboard",
  className,
  label = "Delete",
}: {
  beatId: string;
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Delete this beat permanently? This cannot be undone.")) return;
    setLoading(true);
    const res = await fetch(`/api/beats/${beatId}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete beat");
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={
        className ??
        "flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-danger transition hover:border-danger disabled:opacity-60"
      }
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      {label}
    </button>
  );
}

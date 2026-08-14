"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2, TriangleAlert } from "lucide-react";

export function DeleteAccountSection() {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Enter your password to confirm");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to delete account");
        setSubmitting(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 p-5">
      <div className="flex items-center gap-2">
        <TriangleAlert size={16} className="text-danger" />
        <h3 className="text-sm font-semibold text-foreground">Danger zone</h3>
      </div>

      {!expanded ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Permanently delete your account. Your name, email, bio, and photo are removed — but your
            existing beats stay available so buyers keep their purchased licenses, and past collab and
            order history is preserved for anyone you dealt with. This can&apos;t be undone.
          </p>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-4 rounded-full border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
          >
            Delete account
          </button>
        </>
      ) : (
        <form onSubmit={handleDelete} className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-muted">
            This is permanent. Enter your password to confirm you want to delete your account.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoFocus
            className="input"
          />
          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              Yes, delete my account
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setPassword("");
                setError(null);
              }}
              disabled={submitting}
              className="rounded-full px-4 py-2.5 text-sm font-medium text-muted transition hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

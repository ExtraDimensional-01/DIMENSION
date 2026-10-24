"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);

    const data = await res?.json().catch(() => null);
    setLoading(false);

    if (!res?.ok) {
      setError(data?.error ?? "Something went wrong");
      return;
    }
    setDone(true);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark size={56} className="glow-accent mb-4 rounded-full ring-1 ring-accent/40" />
        <h1 className="font-display text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-muted">Make it at least 8 characters</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-5 text-center">
          <CheckCircle2 size={22} className="text-accent" />
          <p className="text-sm text-foreground">Your password has been reset. You can now log in with your new password.</p>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover"
          >
            Log in
          </Link>
        </div>
      ) : !token ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            This reset link is invalid or has expired. Request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover"
          >
            Request a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
              placeholder="At least 8 characters"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
              placeholder="Re-enter your new password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
              {error.includes("Request a new one") && (
                <>
                  {" "}
                  <Link href="/forgot-password" className="font-medium underline hover:text-foreground">
                    Request a new link
                  </Link>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Reset password
          </button>
        </form>
      )}

      {!done && (
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-accent">
            <ArrowLeft size={14} />
            Back to login
          </Link>
        </p>
      )}
    </div>
  );
}

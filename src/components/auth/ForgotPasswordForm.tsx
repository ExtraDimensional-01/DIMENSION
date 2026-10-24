"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark size={56} className="glow-accent mb-4 rounded-full ring-1 ring-accent/40" />
        <h1 className="font-display text-2xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="mt-1.5 text-sm text-muted">
          Enter your account email and we&apos;ll send you a reset link
        </p>
      </div>

      {submitted ? (
        <div className="flex flex-col gap-4">
          <p
            role="status"
            className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success"
          >
            If an account exists for that email, we&apos;ve sent a password reset link. It expires
            in 1 hour and can only be used once.
          </p>
          <p className="text-center text-sm text-muted">
            Didn&apos;t get it? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="font-medium text-foreground hover:text-accent"
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Send Reset Link
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground hover:text-accent">
          Back to log in
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);

    const data = await res?.json().catch(() => null);
    setLoading(false);

    if (!res?.ok) {
      setError(data?.error ?? "Something went wrong");
      return;
    }
    setSentMessage(data.message);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark size={56} className="glow-accent mb-4 rounded-full ring-1 ring-accent/40" />
        <h1 className="font-display text-2xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="mt-1.5 text-sm text-muted">
          Enter the email linked to your account and we&apos;ll send you a reset link
        </p>
      </div>

      {sentMessage ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-5 text-center">
          <MailCheck size={22} className="text-accent" />
          <p className="text-sm text-foreground">{sentMessage}</p>
          <p className="text-xs text-muted">
            The link expires in 1 hour. Check your spam folder if it doesn&apos;t arrive.
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
        <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-accent">
          <ArrowLeft size={14} />
          Back to login
        </Link>
      </p>
    </div>
  );
}

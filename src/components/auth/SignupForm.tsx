"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Headphones, Loader2, Music2 } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();

  const [role, setRole] = useState<"producer" | "viewer">("producer");
  const [producerName, setProducerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producerName, email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark size={56} className="glow-accent mb-4 rounded-full ring-1 ring-accent/40" />
        <h1 className="font-display text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted">
          {role === "producer" ? "Start uploading and sharing your beats" : "Discover beats and message producers"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">I am a...</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("producer")}
              className={cn(
                "flex flex-1 items-center gap-2.5 rounded-lg border px-3.5 py-3 text-left transition",
                role === "producer"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface hover:border-muted-2"
              )}
            >
              <Music2 size={16} className={role === "producer" ? "text-accent" : "text-muted-2"} />
              <div>
                <p className="text-sm font-medium text-foreground">Producer</p>
                <p className="text-xs text-muted-2">Upload &amp; sell beats</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRole("viewer")}
              className={cn(
                "flex flex-1 items-center gap-2.5 rounded-lg border px-3.5 py-3 text-left transition",
                role === "viewer"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface hover:border-muted-2"
              )}
            >
              <Headphones size={16} className={role === "viewer" ? "text-accent" : "text-muted-2"} />
              <div>
                <p className="text-sm font-medium text-foreground">Viewer</p>
                <p className="text-xs text-muted-2">Discover &amp; message</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="producerName" className="text-sm font-medium text-foreground">
            {role === "producer" ? "Producer name" : "Display name"}
          </label>
          <input
            id="producerName"
            type="text"
            required
            minLength={2}
            maxLength={50}
            value={producerName}
            onChange={(e) => setProducerName(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
            placeholder={role === "producer" ? "e.g. Nova Beats" : "e.g. Alex"}
          />
        </div>

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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
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
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:text-accent">
          Log in
        </Link>
      </p>
    </div>
  );
}

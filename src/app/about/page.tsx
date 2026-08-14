import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Radio, Shield, Upload } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

export const metadata: Metadata = { title: "About — DIMENSION" };

const PILLARS = [
  {
    icon: Upload,
    title: "Upload without friction",
    body: "MP3 or WAV, cover art, BPM, key, genre, mood, and tags — up and discoverable in minutes.",
  },
  {
    icon: Radio,
    title: "Built for discovery",
    body: "Real waveform previews, genre/mood/BPM/key filtering, and a persistent player that follows you across the site.",
  },
  {
    icon: Shield,
    title: "Your catalog, your rules",
    body: "Every account is yours — edit or delete any upload, and keep specific beats unlisted until you're ready to share them.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-12 flex flex-col items-center text-center">
        <BrandMark size={80} className="glow-accent mb-6 rounded-full ring-1 ring-accent/40" />
        <span className="kicker mb-3">About the platform</span>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-5xl">
          A universe of beats.
        </h1>
        <p className="mt-4 max-w-lg text-sm text-muted sm:text-base">
          DIMENSION is a home for producers to upload instrumentals and for artists to discover
          new sounds — no gatekeeping, no clutter, just the catalog.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="cut-corner-sm border border-border bg-surface p-5">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-background text-accent">
              <p.icon size={16} />
            </span>
            <h2 className="mb-1.5 text-sm font-semibold text-foreground">{p.title}</h2>
            <p className="text-xs leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center gap-4 border-t border-border pt-10 text-center">
        <p className="text-sm text-muted">Ready to put your sound out there?</p>
        <Link
          href="/signup"
          className="glow-accent flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
        >
          Create your account
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

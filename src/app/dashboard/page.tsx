import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare, Music2, Play, Search, UploadCloud } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { beatInclude } from "@/lib/beat-query";
import { serializeBeatSummary } from "@/lib/serialize";
import { MyBeatsList } from "@/components/dashboard/MyBeatsList";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { BrandMark } from "@/components/layout/BrandMark";

export const metadata: Metadata = { title: "Dashboard — DIMENSION" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  if (session!.user.role !== "producer") {
    return <ViewerOverview />;
  }

  const beatsRaw = await db.beat.findMany({
    where: { producerId: userId },
    include: beatInclude,
    orderBy: { createdAt: "desc" },
  });

  const beats = beatsRaw.map((beat) => serializeBeatSummary(beat, false, true));
  const totalPlays = beats.reduce((sum, b) => sum + b.playCount, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your beats</h1>
          <p className="mt-1 text-sm text-muted">Manage your uploads and track performance</p>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton path={`/producers/${userId}`} label="Copy profile link" className="px-4 py-2.5" />
          <Link
            href="/dashboard/upload"
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
          >
            <UploadCloud size={15} />
            Upload a beat
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <StatCard icon={Music2} label="Total beats" value={beats.length.toLocaleString()} />
        <StatCard icon={Play} label="Total plays" value={totalPlays.toLocaleString()} />
      </div>

      {beats.length === 0 ? (
        <EmptyState
          icon={Music2}
          title="No beats yet"
          description="Upload your first instrumental to start building your catalog."
          action={
            <Link
              href="/dashboard/upload"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
            >
              Upload a beat
            </Link>
          }
        />
      ) : (
        <MyBeatsList beats={beats} />
      )}
    </div>
  );
}

function ViewerOverview() {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <BrandMark size={64} className="glow-accent rounded-full ring-1 ring-accent/40" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted">
          You&apos;re browsing as a viewer — discover beats and message producers directly.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover"
        >
          <Search size={15} />
          Browse beats
        </Link>
        <Link
          href="/messages"
          className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2"
        >
          <MessageSquare size={15} />
          Your messages
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Music2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background text-muted">
        <Icon size={15} />
      </div>
      <p className="text-xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-2">{label}</p>
    </div>
  );
}

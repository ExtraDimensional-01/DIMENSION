"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { CollabApplication } from "@/types";
import { CollabFileList } from "@/components/collabs/CollabFileList";
import { formatRelativeDate, formatPrice, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-accent/15 text-accent",
  accepted: "bg-success/15 text-success",
  declined: "bg-danger/10 text-danger",
  withdrawn: "bg-surface-hover text-muted-2",
};

type ApplicationWithPost = CollabApplication & { post: { id: string; title: string; status: string } };

export function ApplicationsList({
  applications,
  mode,
}: {
  applications: ApplicationWithPost[];
  mode: "received" | "mine";
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(applicationId: string, action: "accept" | "decline" | "withdraw") {
    setBusyId(applicationId);
    try {
      const res = await fetch(`/api/collabs/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && action === "accept" && data.projectId) {
        router.push(`/collab-projects/${data.projectId}`);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (applications.length === 0) {
    return <p className="text-sm text-muted-2">Nothing here yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {applications.map((app) => (
        <div key={app.id} className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-accent">
                {app.applicant.profileImageUrl ? (
                  <Image src={app.applicant.profileImageUrl} alt="" fill sizes="36px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-accent-foreground">
                    {initials(app.applicant.producerName)}
                  </div>
                )}
              </div>
              <div>
                <Link href={`/creators/${app.applicant.id}`} className="text-sm font-medium text-foreground hover:text-accent">
                  {app.applicant.producerName}
                </Link>
                <p className="text-xs text-muted-2">
                  {mode === "mine" ? app.post.title : formatRelativeDate(app.createdAt)}
                </p>
              </div>
            </div>
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", STATUS_STYLES[app.status])}>
              {app.status}
            </span>
          </div>

          <p className="mt-3 text-sm text-muted">{app.message}</p>

          {app.proposedPriceCents != null && (
            <p className="mt-2 text-xs font-medium text-foreground">Proposed: {formatPrice(app.proposedPriceCents)}</p>
          )}

          {app.portfolioLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3">
              {app.portfolioLinks.map((link) => (
                <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:text-accent-hover">
                  {link}
                </a>
              ))}
            </div>
          )}

          {app.files.length > 0 && (
            <div className="mt-3">
              <CollabFileList files={app.files} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={`/creators/${app.applicant.id}`}
              className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground transition hover:border-muted-2"
            >
              View Profile
            </Link>
            {mode === "received" && app.status === "pending" && (
              <>
                <button
                  onClick={() => act(app.id, "accept")}
                  disabled={busyId === app.id}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {busyId === app.id && <Loader2 size={12} className="animate-spin" />}
                  Accept
                </button>
                <button
                  onClick={() => act(app.id, "decline")}
                  disabled={busyId === app.id}
                  className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-danger/50 hover:text-danger disabled:opacity-60"
                >
                  Decline
                </button>
              </>
            )}
            {mode === "mine" && app.status === "pending" && (
              <button
                onClick={() => act(app.id, "withdraw")}
                disabled={busyId === app.id}
                className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-danger/50 hover:text-danger disabled:opacity-60"
              >
                Withdraw
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

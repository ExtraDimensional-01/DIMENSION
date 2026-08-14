"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { CollabInvitation } from "@/types";
import { formatRelativeDate, initials, cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-accent/15 text-accent",
  accepted: "bg-success/15 text-success",
  declined: "bg-danger/10 text-danger",
};

export function InvitationsList({
  invitations,
  direction,
}: {
  invitations: CollabInvitation[];
  direction: "sent" | "received";
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "accept" | "decline") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/collabs/invitations/${id}`, {
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

  if (invitations.length === 0) {
    return <p className="text-sm text-muted-2">Nothing here yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {invitations.map((inv) => {
        const person = direction === "received" ? inv.inviter : inv.invitee;
        return (
          <div key={inv.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-accent">
                  {person.profileImageUrl ? (
                    <Image src={person.profileImageUrl} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-accent-foreground">
                      {initials(person.producerName)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {direction === "received" ? `${person.producerName} invited you` : `You invited ${person.producerName}`}
                  </p>
                  <Link href={`/collabs/${inv.post.id}`} className="text-xs text-accent hover:text-accent-hover">
                    {inv.post.title}
                  </Link>
                  <p className="text-[11px] text-muted-2">{formatRelativeDate(inv.createdAt)}</p>
                </div>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", STATUS_STYLES[inv.status])}>
                {inv.status}
              </span>
            </div>
            {inv.message && <p className="mt-2 text-sm text-muted">{inv.message}</p>}
            {direction === "received" && inv.status === "pending" && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => act(inv.id, "accept")}
                  disabled={busyId === inv.id}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {busyId === inv.id && <Loader2 size={12} className="animate-spin" />}
                  Accept
                </button>
                <button
                  onClick={() => act(inv.id, "decline")}
                  disabled={busyId === inv.id}
                  className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-danger/50 hover:text-danger disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

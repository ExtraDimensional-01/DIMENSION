"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CollabApplication, CollabInvitation, CollabPostSummary } from "@/types";
import { MyCollabPostsList } from "@/components/collabs/MyCollabPostsList";
import { ApplicationsList } from "@/components/collabs/ApplicationsList";
import { InvitationsList } from "@/components/collabs/InvitationsList";

type ApplicationWithPost = CollabApplication & { post: { id: string; title: string; status: string } };

const TABS = ["Posts", "Applications Received", "My Applications", "Invitations"] as const;
type Tab = (typeof TABS)[number];

export function DashboardCollabsTabs({
  posts,
  applicationsReceived,
  myApplications,
  invitationsReceived,
  invitationsSent,
}: {
  posts: CollabPostSummary[];
  applicationsReceived: ApplicationWithPost[];
  myApplications: ApplicationWithPost[];
  invitationsReceived: CollabInvitation[];
  invitationsSent: CollabInvitation[];
}) {
  const [tab, setTab] = useState<Tab>("Posts");

  const counts: Record<Tab, number> = {
    Posts: posts.length,
    "Applications Received": applicationsReceived.filter((a) => a.status === "pending").length,
    "My Applications": myApplications.length,
    Invitations: invitationsReceived.filter((i) => i.status === "pending").length,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition",
              tab === t ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t}
            {counts[t] > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/15 px-1 text-[10px] font-semibold text-accent">
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "Posts" && <MyCollabPostsList posts={posts} />}
      {tab === "Applications Received" && <ApplicationsList applications={applicationsReceived} mode="received" />}
      {tab === "My Applications" && <ApplicationsList applications={myApplications} mode="mine" />}
      {tab === "Invitations" && (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Received</h3>
            <InvitationsList invitations={invitationsReceived} direction="received" />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Sent</h3>
            <InvitationsList invitations={invitationsSent} direction="sent" />
          </div>
        </div>
      )}
    </div>
  );
}

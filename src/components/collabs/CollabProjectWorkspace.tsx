"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import type { CollabProject } from "@/types";
import { cn, initials } from "@/lib/utils";
import { CollabStatusBadge } from "@/components/collabs/CollabStatusBadge";
import { CollabMessageThread } from "@/components/collabs/CollabMessageThread";
import { CollabProjectFiles } from "@/components/collabs/CollabProjectFiles";
import { CollabTaskList } from "@/components/collabs/CollabTaskList";
import { ProjectReviews } from "@/components/collabs/ProjectReviews";

const TABS = ["Messages", "Files", "Tasks", "Details"] as const;
type Tab = (typeof TABS)[number];

export function CollabProjectWorkspace({ project: initialProject }: { project: CollabProject }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState<Tab>("Messages");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [releaseUrl, setReleaseUrl] = useState(project.releaseUrl ?? "");

  const myId = session?.user?.id;
  const myParticipant = project.participants.find((p) => p.user.id === myId);
  const isCreator = myParticipant?.role === "Creator";
  const isActive = project.status === "in_progress";
  const isCompleted = project.status === "completed";

  async function saveDetails() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/collab-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, releaseUrl: releaseUrl.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      setProject(data.project);
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!confirm("Mark this collaboration as completed? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/collab-projects/${project.id}/complete`, { method: "PATCH" });
    if (res.ok) {
      router.refresh();
      const refreshed = await fetch(`/api/collab-projects/${project.id}`).then((r) => r.json());
      if (refreshed.project) setProject(refreshed.project);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to complete");
    }
    setBusy(false);
  }

  async function toggleShowcase() {
    if (!myParticipant) return;
    setBusy(true);
    await fetch(`/api/collab-projects/${project.id}/showcase`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showcaseOnProfile: !myParticipant.showcaseOnProfile }),
    });
    router.refresh();
    const refreshed = await fetch(`/api/collab-projects/${project.id}`).then((r) => r.json());
    if (refreshed.project) setProject(refreshed.project);
    setBusy(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{project.name}</h1>
          <CollabStatusBadge status={project.status} />
        </div>
        <div className="flex -space-x-2">
          {project.participants.map((p) => (
            <div key={p.id} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-background bg-accent" title={p.user.producerName}>
              {p.user.profileImageUrl ? (
                <Image src={p.user.profileImageUrl} alt="" fill sizes="32px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-accent-foreground">
                  {initials(p.user.producerName)}
                </div>
              )}
            </div>
          ))}
          <span className="ml-3 flex items-center text-xs text-muted-2">
            {project.participants.map((p) => `${p.user.producerName} (${p.role})`).join(" · ")}
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-3 py-3 text-sm font-medium transition",
              tab === t ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Messages" && <CollabMessageThread projectId={project.id} />}
      {tab === "Files" && <CollabProjectFiles projectId={project.id} />}
      {tab === "Tasks" && <CollabTaskList projectId={project.id} participants={project.participants} />}
      {tab === "Details" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Project name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCompleted}
                className="input disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCompleted}
                rows={4}
                className="input resize-none disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Release link</label>
              <input
                value={releaseUrl}
                onChange={(e) => setReleaseUrl(e.target.value)}
                placeholder="https://..."
                className="input"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              onClick={saveDetails}
              disabled={busy}
              className="flex w-fit items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2 disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </div>

          {myParticipant && (
            <label className="flex w-fit items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={myParticipant.showcaseOnProfile}
                onChange={toggleShowcase}
                className="h-4 w-4 accent-accent"
              />
              Show this collaboration on my public profile
            </label>
          )}

          {isCreator && isActive && (
            <button
              onClick={complete}
              disabled={busy}
              className="glow-accent w-fit rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
            >
              Mark Completed
            </button>
          )}

          {isCompleted && (
            <div className="border-t border-border pt-6">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Leave feedback</h2>
              <ProjectReviews projectId={project.id} participants={project.participants} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

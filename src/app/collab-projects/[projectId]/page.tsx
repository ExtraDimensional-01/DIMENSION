import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serializeProject } from "@/lib/collab-serialize";
import { CollabProjectWorkspace } from "@/components/collabs/CollabProjectWorkspace";

const projectInclude = {
  post: { select: { id: true, title: true, genre: true } },
  participants: { include: { user: { select: { id: true, producerName: true, profileImage: true } } } },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const project = await db.collaborationProject.findUnique({ where: { id: projectId }, select: { name: true } });
  return { title: project ? `${project.name} — DIMENSION Collabs` : "Project not found" };
}

export default async function CollabProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/collab-projects/${projectId}`);
  }

  const projectRecord = await db.collaborationProject.findUnique({ where: { id: projectId }, include: projectInclude });
  if (!projectRecord) notFound();

  const isParticipant = projectRecord.participants.some((p) => p.userId === session.user.id);
  if (!isParticipant) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <CollabProjectWorkspace project={serializeProject(projectRecord)} />
    </div>
  );
}

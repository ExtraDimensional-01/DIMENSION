import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { collabPostInclude } from "@/lib/collab-query";
import { serializeCollabPost } from "@/lib/collab-serialize";
import { CreateCollabForm } from "@/components/collabs/CreateCollabForm";

export const metadata: Metadata = { title: "Edit Collaboration — DIMENSION" };

export default async function EditCollabPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/collabs/${postId}/edit`);
  }

  const postRecord = await db.collaborationPost.findUnique({ where: { id: postId }, include: collabPostInclude });
  if (!postRecord) notFound();
  if (postRecord.creatorId !== session.user.id) notFound();

  const post = serializeCollabPost(postRecord);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <span className="kicker mb-2">Edit Collaboration</span>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">{post.title}</h1>
      </div>
      <CreateCollabForm existingPost={post} />
    </div>
  );
}

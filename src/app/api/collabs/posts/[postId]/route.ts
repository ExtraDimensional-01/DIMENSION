import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { collabPostUpdateSchema } from "@/lib/collab-validations";
import { serializeCollabPost } from "@/lib/collab-serialize";
import { collabPostInclude } from "@/lib/collab-query";

export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();

  const post = await db.collaborationPost.findUnique({ where: { id: postId }, include: collabPostInclude });
  if (!post) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }
  if (post.status === "draft" && post.creatorId !== session?.user?.id) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }

  return NextResponse.json({ post: serializeCollabPost(post) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.collaborationPost.findUnique({ where: { id: postId } });
  if (!existing) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }
  if (existing.creatorId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own collaborations" }, { status: 403 });
  }
  if (existing.status === "completed" || existing.status === "cancelled") {
    return NextResponse.json(
      { error: "This collaboration is closed and can no longer be edited." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = collabPostUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.lookingFor !== undefined) data.lookingFor = parsed.data.lookingFor;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.genre !== undefined) data.genre = parsed.data.genre;
  if (parsed.data.subgenre !== undefined) data.subgenre = parsed.data.subgenre;
  if (parsed.data.mood !== undefined) data.mood = parsed.data.mood;
  if (parsed.data.skillsNeeded !== undefined) data.skillsNeeded = JSON.stringify(parsed.data.skillsNeeded);
  if (parsed.data.isPaid !== undefined) data.isPaid = parsed.data.isPaid;
  if (parsed.data.budgetMinCents !== undefined) data.budgetMin = parsed.data.budgetMinCents;
  if (parsed.data.budgetMaxCents !== undefined) data.budgetMax = parsed.data.budgetMaxCents;
  if (parsed.data.locationType !== undefined) data.locationType = parsed.data.locationType;
  if (parsed.data.location !== undefined) data.location = parsed.data.location;
  if (parsed.data.deadline !== undefined) data.deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  if (parsed.data.contactPref !== undefined) data.contactPref = parsed.data.contactPref;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;

  const post = await db.collaborationPost.update({
    where: { id: postId },
    data,
    include: collabPostInclude,
  });

  return NextResponse.json({ post: serializeCollabPost(post) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.collaborationPost.findUnique({
    where: { id: postId },
    include: { files: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
  }
  if (existing.creatorId !== session.user.id) {
    return NextResponse.json({ error: "You can only delete your own collaborations" }, { status: 403 });
  }

  await db.collaborationPost.delete({ where: { id: postId } });

  for (const file of existing.files) {
    await storage.delete(file.fileKey);
  }

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// draft/open/reviewing are simple creator-toggled states. in_progress is only
// reached via accepting an application/invitation; completed/cancelled (from
// in_progress) go through the dedicated project complete/cancel endpoints,
// which also update the linked post. This route covers the pre-acceptance states.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["open"],
  open: ["draft", "cancelled"],
  reviewing: ["open", "cancelled"],
};

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
    return NextResponse.json({ error: "You can only manage your own collaborations" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const nextStatus = typeof body.status === "string" ? body.status : "";

  const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Can't move a "${existing.status}" collaboration to "${nextStatus}".` },
      { status: 400 }
    );
  }

  const post = await db.collaborationPost.update({
    where: { id: postId },
    data: { status: nextStatus },
  });

  return NextResponse.json({ status: post.status });
}

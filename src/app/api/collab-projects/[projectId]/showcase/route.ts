import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.showcaseOnProfile !== "boolean") {
    return NextResponse.json({ error: "showcaseOnProfile must be a boolean" }, { status: 400 });
  }

  const participant = await db.collaborationParticipant.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });
  if (!participant) {
    return NextResponse.json({ error: "You're not part of this project" }, { status: 403 });
  }

  await db.collaborationParticipant.update({
    where: { id: participant.id },
    data: { showcaseOnProfile: body.showcaseOnProfile },
  });

  return NextResponse.json({ success: true });
}

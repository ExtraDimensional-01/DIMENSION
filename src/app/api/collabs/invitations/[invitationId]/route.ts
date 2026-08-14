import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { acceptApplicationAndCreateProject } from "@/lib/collab-workflow";
import { createNotification } from "@/lib/notify";

export async function PATCH(req: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  const invitation = await db.collaborationInvitation.findUnique({
    where: { id: invitationId },
    include: { post: { select: { id: true, title: true, creatorId: true, status: true } } },
  });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invitation.inviteeId !== session.user.id) {
    return NextResponse.json({ error: "This invitation isn't addressed to you" }, { status: 403 });
  }
  if (invitation.status !== "pending") {
    return NextResponse.json({ error: "This invitation has already been decided" }, { status: 400 });
  }

  if (action === "decline") {
    await db.collaborationInvitation.update({ where: { id: invitationId }, data: { status: "declined" } });
    return NextResponse.json({ status: "declined" });
  }

  if (action === "accept") {
    if (invitation.post.status !== "open") {
      return NextResponse.json({ error: "This collaboration is no longer open" }, { status: 400 });
    }

    const application = await db.collaborationApplication.create({
      data: {
        postId: invitation.postId,
        applicantId: session.user.id,
        message: invitation.message || "Accepted via invitation.",
      },
    });

    try {
      // The inviter is guaranteed to be the post's creator (enforced when the
      // invitation was created), so this satisfies acceptApplicationAndCreateProject's
      // creator-only check even though the invitee is the one accepting here.
      const project = await acceptApplicationAndCreateProject(application.id, invitation.post.creatorId);
      await db.collaborationInvitation.update({ where: { id: invitationId }, data: { status: "accepted" } });
      await createNotification(
        invitation.inviterId,
        "invitation_accepted",
        "Invitation accepted",
        `Your invitation for "${invitation.post.title}" was accepted.`,
        `/collab-projects/${project.id}`
      );
      return NextResponse.json({ status: "accepted", projectId: project.id });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to accept" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

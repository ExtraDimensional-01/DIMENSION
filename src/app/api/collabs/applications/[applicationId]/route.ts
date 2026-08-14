import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { acceptApplicationAndCreateProject } from "@/lib/collab-workflow";
import { createNotification } from "@/lib/notify";

export async function PATCH(req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  const application = await db.collaborationApplication.findUnique({
    where: { id: applicationId },
    include: { post: { select: { id: true, title: true, creatorId: true } } },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (action === "accept") {
    if (application.post.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Only the creator can accept an application" }, { status: 403 });
    }
    try {
      const project = await acceptApplicationAndCreateProject(applicationId, session.user.id);
      return NextResponse.json({ status: "accepted", projectId: project.id });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to accept" }, { status: 400 });
    }
  }

  if (action === "decline") {
    if (application.post.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Only the creator can decline an application" }, { status: 403 });
    }
    if (application.status !== "pending") {
      return NextResponse.json({ error: "This application has already been decided" }, { status: 400 });
    }
    await db.collaborationApplication.update({ where: { id: applicationId }, data: { status: "declined" } });
    await createNotification(
      application.applicantId,
      "application_declined",
      "Application update",
      `Your application for "${application.post.title}" was declined.`,
      `/collabs/${application.post.id}`
    );
    return NextResponse.json({ status: "declined" });
  }

  if (action === "withdraw") {
    if (application.applicantId !== session.user.id) {
      return NextResponse.json({ error: "You can only withdraw your own application" }, { status: 403 });
    }
    if (application.status !== "pending") {
      return NextResponse.json({ error: "This application has already been decided" }, { status: 400 });
    }
    await db.collaborationApplication.update({ where: { id: applicationId }, data: { status: "withdrawn" } });
    return NextResponse.json({ status: "withdrawn" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

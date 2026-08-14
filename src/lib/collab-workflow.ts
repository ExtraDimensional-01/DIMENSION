import { db } from "@/lib/db";
import { createNotification } from "@/lib/notify";

export async function isProjectParticipant(projectId: string, userId: string): Promise<boolean> {
  const participant = await db.collaborationParticipant.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  });
  return !!participant;
}

/**
 * Accepts a pending application: creates the private project + participant
 * rows for both sides, marks the post in_progress, and auto-declines every
 * other pending application on that post. Shared by both the
 * applications-accept route and the invitations-accept route (an invitation
 * accept creates an "accepted" application first, then calls this).
 */
export async function acceptApplicationAndCreateProject(applicationId: string, actingUserId: string) {
  const application = await db.collaborationApplication.findUnique({
    where: { id: applicationId },
    include: { post: true },
  });
  if (!application) throw new Error("Application not found");
  if (application.post.creatorId !== actingUserId) throw new Error("Forbidden");
  if (application.status !== "pending") throw new Error("This application has already been decided.");

  const otherPending = await db.collaborationApplication.findMany({
    where: { postId: application.postId, status: "pending", id: { not: applicationId } },
    select: { id: true, applicantId: true },
  });

  const project = await db.$transaction(async (tx) => {
    await tx.collaborationApplication.update({
      where: { id: applicationId },
      data: { status: "accepted" },
    });

    if (otherPending.length > 0) {
      await tx.collaborationApplication.updateMany({
        where: { id: { in: otherPending.map((a) => a.id) } },
        data: { status: "declined" },
      });
    }

    const created = await tx.collaborationProject.create({
      data: {
        name: application.post.title,
        postId: application.postId,
        status: "in_progress",
        participants: {
          create: [
            { userId: application.post.creatorId, role: "Creator" },
            { userId: application.applicantId, role: application.post.lookingFor },
          ],
        },
      },
    });

    await tx.collaborationPost.update({
      where: { id: application.postId },
      data: { status: "in_progress" },
    });

    return created;
  });

  await createNotification(
    application.applicantId,
    "application_accepted",
    "Your application was accepted",
    `You're now collaborating on "${application.post.title}".`,
    `/collab-projects/${project.id}`
  );
  for (const other of otherPending) {
    await createNotification(
      other.applicantId,
      "application_declined",
      "Application update",
      `"${application.post.title}" has been filled.`,
      `/collabs/${application.postId}`
    );
  }

  return project;
}

export async function completeProject(projectId: string, actingUserId: string) {
  const project = await db.collaborationProject.findUnique({
    where: { id: projectId },
    include: { post: true, participants: true },
  });
  if (!project) throw new Error("Project not found");
  if (project.post.creatorId !== actingUserId) throw new Error("Forbidden");
  if (project.status !== "in_progress") throw new Error("Project is not in progress.");

  const updated = await db.$transaction(async (tx) => {
    const p = await tx.collaborationProject.update({
      where: { id: projectId },
      data: { status: "completed", completedAt: new Date() },
    });
    await tx.collaborationPost.update({
      where: { id: project.postId },
      data: { status: "completed" },
    });
    return p;
  });

  for (const participant of project.participants) {
    if (participant.userId === actingUserId) continue;
    await createNotification(
      participant.userId,
      "collab_completed",
      "Collaboration completed",
      `"${project.name}" has been marked complete. You can now leave a review.`,
      `/collab-projects/${projectId}`
    );
  }

  return updated;
}

export async function cancelProject(projectId: string, actingUserId: string) {
  const project = await db.collaborationProject.findUnique({
    where: { id: projectId },
    include: { post: true },
  });
  if (!project) throw new Error("Project not found");
  if (project.post.creatorId !== actingUserId) throw new Error("Forbidden");

  return db.$transaction(async (tx) => {
    const p = await tx.collaborationProject.update({
      where: { id: projectId },
      data: { status: "cancelled" },
    });
    await tx.collaborationPost.update({
      where: { id: project.postId },
      data: { status: "cancelled" },
    });
    return p;
  });
}

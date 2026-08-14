import { db } from "@/lib/db";
import type { NotificationType } from "@/lib/constants";

export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
) {
  return db.notification.create({
    data: { userId, type, title, body, link },
  });
}

/**
 * There's no scheduler/cron available in this stack, so "deadline
 * approaching" notifications can't be pushed proactively. Instead this runs
 * lazily whenever the caller's dashboard/workspace page loads: it looks for
 * post deadlines and task due dates within the next 48h that the user hasn't
 * already been notified about (deduped by `link`, within the last 24h), and
 * creates a notification for each one found. This is a best-effort
 * approximation, not a real-time push.
 */
export async function checkUpcomingDeadlines(userId: string): Promise<void> {
  const now = new Date();
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const dedupeSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [posts, tasks] = await Promise.all([
    db.collaborationPost.findMany({
      where: {
        creatorId: userId,
        deadline: { gte: now, lte: soon },
        status: { in: ["open", "reviewing", "in_progress"] },
      },
      select: { id: true, title: true, deadline: true },
    }),
    db.collaborationTask.findMany({
      where: {
        assigneeId: userId,
        done: false,
        dueDate: { gte: now, lte: soon },
      },
      select: { id: true, title: true, dueDate: true, projectId: true },
    }),
  ]);

  for (const post of posts) {
    const link = `/collabs/${post.id}`;
    const already = await db.notification.findFirst({
      where: { userId, type: "deadline_approaching", link, createdAt: { gte: dedupeSince } },
      select: { id: true },
    });
    if (already) continue;
    await createNotification(
      userId,
      "deadline_approaching",
      "Deadline approaching",
      `"${post.title}" is due ${post.deadline!.toLocaleDateString()}.`,
      link
    );
  }

  for (const task of tasks) {
    const link = `/collab-projects/${task.projectId}`;
    const already = await db.notification.findFirst({
      where: { userId, type: "deadline_approaching", link, createdAt: { gte: dedupeSince } },
      select: { id: true },
    });
    if (already) continue;
    await createNotification(
      userId,
      "deadline_approaching",
      "Task due soon",
      `"${task.title}" is due ${task.dueDate!.toLocaleDateString()}.`,
      link
    );
  }
}

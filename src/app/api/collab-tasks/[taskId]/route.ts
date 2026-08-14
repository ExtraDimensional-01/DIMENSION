import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isProjectParticipant } from "@/lib/collab-workflow";
import { collabTaskUpdateSchema } from "@/lib/collab-validations";
import { serializeTask } from "@/lib/collab-serialize";

const taskInclude = {
  assignee: { select: { id: true, producerName: true } },
} as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.collaborationTask.findUnique({ where: { id: taskId } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (!(await isProjectParticipant(existing.projectId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = collabTaskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.assigneeId) {
    const assigneeIsParticipant = await isProjectParticipant(existing.projectId, parsed.data.assigneeId);
    if (!assigneeIsParticipant) {
      return NextResponse.json({ error: "Assignee must be a participant of this project" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.done !== undefined) data.done = parsed.data.done;
  if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (parsed.data.assigneeId !== undefined) data.assigneeId = parsed.data.assigneeId || null;

  const task = await db.collaborationTask.update({ where: { id: taskId }, data, include: taskInclude });
  return NextResponse.json({ task: serializeTask(task) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.collaborationTask.findUnique({ where: { id: taskId } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (!(await isProjectParticipant(existing.projectId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }

  await db.collaborationTask.delete({ where: { id: taskId } });
  return NextResponse.json({ success: true });
}

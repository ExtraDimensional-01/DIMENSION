import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isProjectParticipant } from "@/lib/collab-workflow";
import { collabTaskSchema } from "@/lib/collab-validations";
import { serializeTask } from "@/lib/collab-serialize";

const taskInclude = {
  assignee: { select: { id: true, producerName: true } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isProjectParticipant(projectId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }

  const tasks = await db.collaborationTask.findMany({
    where: { projectId },
    include: taskInclude,
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks: tasks.map(serializeTask) });
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isProjectParticipant(projectId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = collabTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.assigneeId) {
    const assigneeIsParticipant = await isProjectParticipant(projectId, parsed.data.assigneeId);
    if (!assigneeIsParticipant) {
      return NextResponse.json({ error: "Assignee must be a participant of this project" }, { status: 400 });
    }
  }

  const task = await db.collaborationTask.create({
    data: {
      projectId,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assigneeId: parsed.data.assigneeId || null,
    },
    include: taskInclude,
  });

  return NextResponse.json({ task: serializeTask(task) }, { status: 201 });
}

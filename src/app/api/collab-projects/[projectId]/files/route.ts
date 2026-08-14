import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isProjectParticipant } from "@/lib/collab-workflow";
import { serializeCollabFile } from "@/lib/collab-serialize";
import { saveCollabFile, saveUploadedCollabFile } from "@/lib/collab-files";
import { isR2Configured } from "@/lib/storage";
import { createNotification } from "@/lib/notify";

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isProjectParticipant(projectId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }

  const files = await db.collaborationFile.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ files: files.map(serializeCollabFile) });
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

  const contentType = req.headers.get("content-type") ?? "";
  let saved;

  if (isR2Configured() && contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    const { key, filename } = body as { key?: string; filename?: string };
    if (typeof key !== "string" || typeof filename !== "string") {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    try {
      saved = await saveUploadedCollabFile({
        key,
        filename,
        uploaderId: session.user.id,
        expectedProjectId: projectId,
        projectId,
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
    }
  } else {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "A file is required" }, { status: 400 });
    }

    try {
      saved = await saveCollabFile({ file, uploaderId: session.user.id, projectId });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
    }
  }

  const otherParticipants = await db.collaborationParticipant.findMany({
    where: { projectId, userId: { not: session.user.id } },
    select: { userId: true },
  });
  const project = await db.collaborationProject.findUnique({ where: { id: projectId }, select: { name: true } });
  for (const p of otherParticipants) {
    await createNotification(
      p.userId,
      "project_file_new",
      "New file uploaded",
      `A new file was added to "${project?.name ?? "your collaboration"}".`,
      `/collab-projects/${projectId}`
    );
  }

  return NextResponse.json({ file: serializeCollabFile(saved) }, { status: 201 });
}

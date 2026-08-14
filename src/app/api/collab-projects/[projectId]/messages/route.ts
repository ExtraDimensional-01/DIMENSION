import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isProjectParticipant } from "@/lib/collab-workflow";
import { collabMessageSchema } from "@/lib/collab-validations";
import { serializeMessage } from "@/lib/collab-serialize";
import { saveCollabFile, saveUploadedCollabFile } from "@/lib/collab-files";
import { isR2Configured } from "@/lib/storage";
import { createNotification } from "@/lib/notify";

const messageInclude = {
  sender: { select: { id: true, producerName: true, profileImage: true } },
  files: true,
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

  const messages = await db.collaborationMessage.findMany({
    where: { projectId },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  await db.collaborationParticipant.updateMany({
    where: { projectId, userId: session.user.id },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ messages: messages.map(serializeMessage) });
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
  const isJson = isR2Configured() && contentType.includes("application/json");

  let body = "";
  let legacyAttachment: File | null = null;
  let uploadedAttachment: { key: string; filename: string } | null = null;

  if (isJson) {
    const json = await req.json().catch(() => ({}));
    const parsed = collabMessageSchema.safeParse({ body: json.body ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
    }
    body = parsed.data.body;
    if (json.attachment?.key && typeof json.attachment.filename === "string") {
      uploadedAttachment = { key: json.attachment.key, filename: json.attachment.filename };
    }
    if (!body && !uploadedAttachment) {
      return NextResponse.json({ error: "Message must have text or an attachment" }, { status: 400 });
    }
  } else {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const parsed = collabMessageSchema.safeParse({ body: formData.get("body") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
    }
    body = parsed.data.body;

    const attachment = formData.get("attachment");
    if (!body && !(attachment instanceof File && attachment.size > 0)) {
      return NextResponse.json({ error: "Message must have text or an attachment" }, { status: 400 });
    }
    if (attachment instanceof File && attachment.size > 0) legacyAttachment = attachment;
  }

  const message = await db.collaborationMessage.create({
    data: { projectId, senderId: session.user.id, body },
  });

  if (legacyAttachment) {
    try {
      await saveCollabFile({ file: legacyAttachment, uploaderId: session.user.id, messageId: message.id });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to attach file" }, { status: 400 });
    }
  } else if (uploadedAttachment) {
    try {
      await saveUploadedCollabFile({
        key: uploadedAttachment.key,
        filename: uploadedAttachment.filename,
        uploaderId: session.user.id,
        expectedProjectId: projectId,
        messageId: message.id,
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to attach file" }, { status: 400 });
    }
  }

  await db.collaborationParticipant.updateMany({
    where: { projectId, userId: session.user.id },
    data: { lastReadAt: new Date() },
  });

  const otherParticipants = await db.collaborationParticipant.findMany({
    where: { projectId, userId: { not: session.user.id } },
    select: { userId: true },
  });
  const project = await db.collaborationProject.findUnique({ where: { id: projectId }, select: { name: true } });
  for (const p of otherParticipants) {
    await createNotification(
      p.userId,
      "message_new",
      "New message",
      `New message in "${project?.name ?? "your collaboration"}".`,
      `/collab-projects/${projectId}`
    );
  }

  const full = await db.collaborationMessage.findUniqueOrThrow({
    where: { id: message.id },
    include: messageInclude,
  });

  return NextResponse.json({ message: serializeMessage(full) }, { status: 201 });
}

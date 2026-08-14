import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { isProjectParticipant } from "@/lib/collab-workflow";
import { collabProjectUpdateSchema } from "@/lib/collab-validations";
import { serializeProject } from "@/lib/collab-serialize";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

const projectInclude = {
  post: { select: { id: true, title: true, genre: true } },
  participants: { include: { user: { select: { id: true, producerName: true, profileImage: true } } } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.collaborationProject.findUnique({ where: { id: projectId }, include: projectInclude });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!(await isProjectParticipant(projectId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }

  return NextResponse.json({ project: serializeProject(project) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.collaborationProject.findUnique({ where: { id: projectId } });
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!(await isProjectParticipant(projectId, session.user.id))) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }

  const isCompleted = existing.status === "completed";
  const contentType = req.headers.get("content-type") ?? "";
  const data: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    // Cover art is the one field that's meant to be added *after* completion
    // (portfolio artwork), so it's allowed regardless of status.
    const formData = await req.formData();
    const cover = formData.get("cover");
    if (cover instanceof File && cover.size > 0) {
      const ext = ALLOWED_IMAGE_TYPES[cover.type];
      if (!ext) {
        return NextResponse.json({ error: "Cover art must be a JPG, PNG, or WEBP image" }, { status: 400 });
      }
      if (cover.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Cover art must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await cover.arrayBuffer());
      const key = await storage.save(buffer, "collab", ext);
      if (existing.coverKey) await storage.delete(existing.coverKey);
      data.coverKey = key;
    }
    const releaseUrlRaw = formData.get("releaseUrl");
    if (typeof releaseUrlRaw === "string") data.releaseUrl = releaseUrlRaw.trim() || null;
  } else {
    const body = await req.json().catch(() => ({}));
    const parsed = collabProjectUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (parsed.data.releaseUrl !== undefined) data.releaseUrl = parsed.data.releaseUrl;
    if (!isCompleted) {
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.description !== undefined) data.description = parsed.data.description;
    }
  }

  const project = await db.collaborationProject.update({
    where: { id: projectId },
    data,
    include: projectInclude,
  });

  return NextResponse.json({ project: serializeProject(project) });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, serveStoredObject } from "@/lib/storage";
import { getAuthorizedCollabFile, canDeleteCollabFile } from "@/lib/collab-files";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const session = await auth();

  const file = await getAuthorizedCollabFile(fileId, session?.user?.id ?? null);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  // Collab files are private, so even the "inline" preview gets a
  // no-store, per-request signed URL rather than the long-lived public
  // caching used for beat previews/covers.
  return serveStoredObject(req, file.fileKey, { filename: file.fileName, disposition: "inline", cache: "private" });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await db.collaborationFile.findUnique({ where: { id: fileId } });
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if (!canDeleteCollabFile(session.user.id, file)) {
    return NextResponse.json({ error: "You can only delete files you uploaded" }, { status: 403 });
  }

  await db.collaborationFile.delete({ where: { id: fileId } });
  await storage.delete(file.fileKey);

  return NextResponse.json({ success: true });
}

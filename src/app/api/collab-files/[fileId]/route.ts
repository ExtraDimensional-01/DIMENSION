import fs from "fs";
import fsp from "fs/promises";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getAuthorizedCollabFile, canDeleteCollabFile } from "@/lib/collab-files";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mid: "audio/midi",
  midi: "audio/midi",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const session = await auth();

  const file = await getAuthorizedCollabFile(fileId, session?.user?.id ?? null);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  let absolutePath: string;
  try {
    absolutePath = storage.absolutePath(file.fileKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = await fsp.stat(absolutePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[file.fileType] ?? "application/octet-stream";
  const range = req.headers.get("range");

  // Private files: no long-lived public caching.
  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      if (start >= stat.size || end >= stat.size || start > end) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      }

      const nodeStream = fs.createReadStream(absolutePath, { start, end });
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new Response(webStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Content-Length": String(chunkSize),
        },
      });
    }
  }

  const nodeStream = fs.createReadStream(absolutePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(stat.size) },
  });
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

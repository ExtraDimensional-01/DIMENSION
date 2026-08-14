import fs from "fs";
import fsp from "fs/promises";
import { Readable } from "stream";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  zip: "application/zip",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      beat: { select: { title: true } },
      license: { select: { name: true, fileKey: true, fileFormat: true } },
    },
  });
  const isParty = order?.buyerId === session.user.id || order?.sellerId === session.user.id;
  if (!order || !isParty || order.status !== "confirmed") {
    return new Response("Not found", { status: 404 });
  }

  let absolutePath: string;
  try {
    absolutePath = storage.absolutePath(order.license.fileKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = await fsp.stat(absolutePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[order.license.fileFormat] ?? "application/octet-stream";
  const filename = `${order.beat.title} - ${order.license.name}.${order.license.fileFormat}`.replace(
    /[/\\]/g,
    "-"
  );
  const range = req.headers.get("range");

  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
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

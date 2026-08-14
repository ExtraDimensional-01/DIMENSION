import fs from "fs";
import fsp from "fs/promises";
import { Readable } from "stream";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  // License deliverable files are private — they must only ever be reachable
  // through /api/orders/[id]/download, which checks the requester is the
  // order's buyer or seller. This route is for public assets only (audio
  // previews, cover art, avatars), so refuse anything stored under "license/".
  if (keyParts[0] === "license") {
    return new Response("Not found", { status: 404 });
  }

  let absolutePath: string;
  try {
    absolutePath = storage.absolutePath(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = await fsp.stat(absolutePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const range = req.headers.get("range");

  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      if (start >= stat.size || end >= stat.size || start > end) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${stat.size}` },
        });
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
    headers: {
      ...baseHeaders,
      "Content-Length": String(stat.size),
    },
  });
}

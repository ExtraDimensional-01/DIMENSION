import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { Readable } from "stream";
import * as r2 from "@/lib/r2";

/**
 * Storage abstraction. Two adapters implement the same interface:
 *  - LocalDiskStorage: writes outside the source tree (STORAGE_DIR, default
 *    ./storage). Used automatically whenever R2 isn't configured, so local
 *    dev keeps working without any Cloudflare setup.
 *  - R2Storage: Cloudflare R2 (S3-compatible), used automatically once
 *    R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT / R2_BUCKET_NAME
 *    are all set. This is what DIMENSION uses in production.
 *
 * Large files (beat audio, license deliverables, collab files) bypass this
 * adapter's save() entirely in R2 mode — they're uploaded directly
 * browser -> R2 via a presigned URL (see createUploadUrl below and
 * /api/uploads/presign), so their bytes never pass through the Vercel
 * function. save() is still used for small images (covers/avatars, capped
 * at MAX_IMAGE_SIZE_BYTES) where a server round-trip is cheap and simple.
 */
export interface StorageAdapter {
  save(buffer: Buffer, kind: StorageKind, extension: string): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export type StorageKind = "audio" | "covers" | "avatars" | "collab" | "license";

/** MIME type for a stored object, inferred from its extension — used both when writing to R2 and when serving. */
export const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  zip: "application/zip",
  mid: "audio/midi",
  midi: "audio/midi",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function contentTypeForExt(ext: string): string {
  return CONTENT_TYPE_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

// turbopackIgnore: STORAGE_DIR is an env-configured path outside the source
// tree (uploaded files), not a project asset — it must not be traced/bundled.
const STORAGE_ROOT = path.resolve(
  process.cwd(),
  /* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage"
);

class LocalDiskStorage implements StorageAdapter {
  async save(buffer: Buffer, kind: StorageKind, extension: string): Promise<string> {
    const dir = path.join(/* turbopackIgnore: true */ STORAGE_ROOT, kind);
    await fsp.mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    const key = `${kind}/${filename}`;
    await fsp.writeFile(path.join(/* turbopackIgnore: true */ STORAGE_ROOT, key), buffer);
    return key;
  }

  async delete(key: string): Promise<void> {
    try {
      await fsp.unlink(this.absolutePath(key));
    } catch {
      // already gone — fine
    }
  }

  absolutePath(key: string): string {
    const resolved = path.resolve(/* turbopackIgnore: true */ STORAGE_ROOT, key);
    if (!resolved.startsWith(STORAGE_ROOT)) {
      throw new Error("Invalid storage key");
    }
    return resolved;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fsp.access(this.absolutePath(key));
      return true;
    } catch {
      return false;
    }
  }
}

class R2Storage implements StorageAdapter {
  async save(buffer: Buffer, kind: StorageKind, extension: string): Promise<string> {
    const key = `${kind}/${randomUUID()}.${extension}`;
    await r2.putObject(key, buffer, contentTypeForExt(extension));
    return key;
  }

  async delete(key: string): Promise<void> {
    await r2.deleteObject(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await r2.headObject(key)) !== null;
  }
}

const localDiskStorage = new LocalDiskStorage();

export const storage: StorageAdapter = r2.isR2Configured() ? new R2Storage() : localDiskStorage;

/** Public URL the browser/audio player uses to fetch a stored file — proxied through /api/files, which authorizes then serves (locally) or redirects to a signed R2 URL. */
export function fileUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/files/${key}`;
}

// =============================================================================
// Direct-to-R2 presigned upload/download — only meaningful when R2 is
// configured. The /api/uploads/presign route (and callers of
// createDownloadUrl below) check isR2Configured() before calling these.
// =============================================================================

export { isR2Configured } from "@/lib/r2";

/** Presigned PUT URL for the browser to upload a large file directly to R2, bypassing the Vercel function. */
export async function createUploadUrl(key: string, contentType: string): Promise<{ url: string; expiresIn: number }> {
  const expiresIn = 300;
  const url = await r2.presignPutUrl(key, contentType, expiresIn);
  return { url, expiresIn };
}

/** Verifies a client-reported upload actually landed in R2, returning its real size/content-type (never trust the browser's own claim). */
export async function headObjectMeta(key: string): Promise<{ size: number; contentType: string | undefined } | null> {
  return r2.headObject(key);
}

// =============================================================================
// Object key builders — beats/{userId}/{beatId}/..., collabs/{parentType}/
// {parentId}/{fileId}/filename, avatars/{userId}/{fileId}.ext. Every key
// includes a random/unique id component so two uploads can never collide or
// overwrite each other.
// =============================================================================

export function beatAudioKey(userId: string, beatId: string, ext: string): string {
  return `beats/${userId}/${beatId}/preview.${ext}`;
}

export function beatCoverKey(userId: string, beatId: string, ext: string): string {
  return `beats/${userId}/${beatId}/artwork.${ext}`;
}

export function beatLicenseKey(userId: string, beatId: string, licenseFileId: string, ext: string): string {
  return `beats/${userId}/${beatId}/licenses/${licenseFileId}/deliverable.${ext}`;
}

export function avatarKey(userId: string, fileId: string, ext: string): string {
  return `avatars/${userId}/${fileId}.${ext}`;
}

export type CollabParentType = "post" | "application" | "project" | "message";

function sanitizeFilename(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.slice(-120) || "file";
}

export function collabFileKey(parentType: CollabParentType, parentId: string, fileId: string, originalFilename: string): string {
  return `collabs/${parentType}/${parentId}/${fileId}/${sanitizeFilename(originalFilename)}`;
}

// =============================================================================
// Unified serving: authorization happens in the route handler (unchanged);
// this just turns an authorized key into a Response — a redirect to a
// short-lived signed R2 URL in production, or a locally streamed file
// (with Range support) in local-disk dev mode.
// =============================================================================

export async function serveStoredObject(
  req: Request,
  key: string,
  opts: { filename?: string; disposition?: "inline" | "attachment"; cache?: "public" | "private" } = {}
): Promise<Response> {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = contentTypeForExt(ext);

  if (r2.isR2Configured()) {
    const url = await r2.presignGetUrl(
      key,
      {
        downloadFilename: opts.disposition === "attachment" ? opts.filename ?? key.split("/").pop() : undefined,
      },
      contentType
    );
    const isPrivate = opts.cache === "private" || opts.disposition === "attachment";
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": isPrivate ? "private, no-store" : "no-store",
      },
    });
  }

  return streamLocalFile(req, key, contentType, opts);
}

async function streamLocalFile(
  req: Request,
  key: string,
  contentType: string,
  opts: { filename?: string; disposition?: "inline" | "attachment"; cache?: "public" | "private" }
): Promise<Response> {
  let absolutePath: string;
  try {
    absolutePath = localDiskStorage.absolutePath(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = await fsp.stat(absolutePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const range = req.headers.get("range");
  const dispositionHeader = opts.filename
    ? `${opts.disposition ?? "inline"}; filename="${encodeURIComponent(opts.filename)}"`
    : undefined;

  const isPrivate = opts.cache === "private" || opts.disposition === "attachment";
  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": isPrivate ? "private, no-store" : "public, max-age=31536000, immutable",
    ...(dispositionHeader ? { "Content-Disposition": dispositionHeader } : {}),
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

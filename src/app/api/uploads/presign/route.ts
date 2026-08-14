import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isProjectParticipant } from "@/lib/collab-workflow";
import { isR2Configured, createUploadUrl, beatAudioKey, beatCoverKey, beatLicenseKey, collabFileKey } from "@/lib/storage";
import {
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_LICENSE_FILE_TYPES,
  ALLOWED_PROJECT_FILE_TYPES,
  MAX_AUDIO_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_LICENSE_FILE_SIZE_BYTES,
  MAX_PROJECT_FILE_SIZE_BYTES,
} from "@/lib/constants";

/**
 * Issues a short-lived presigned R2 PUT URL for a large file the browser
 * will upload directly, bypassing the Vercel function entirely. Every
 * category here validates the caller's session + ownership/authorization
 * *before* handing out a URL, and validates the declared content-type/size
 * against the same allow-lists the old server-side upload routes used — see
 * beats/route.ts and collab-files.ts for the equivalent legacy checks.
 *
 * The upload itself is untrusted until the finalize step (POST /api/beats,
 * /api/beat-licenses, or the collab file routes) re-checks the object with
 * a HeadObject call against R2 — this route only decides whether the
 * caller is *allowed to try*.
 */

type Category = "beat-audio" | "beat-cover" | "beat-license" | "collab-project-file";

interface PresignRequestBody {
  category: Category;
  filename: string;
  contentType: string;
  size: number;
  context: Record<string, unknown>;
}

export async function POST(req: Request) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Direct uploads aren't available — R2 isn't configured on this deployment." },
      { status: 501 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PresignRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { category, filename, contentType, size, context } = body;
  if (typeof filename !== "string" || typeof contentType !== "string" || typeof size !== "number") {
    return NextResponse.json({ error: "Missing filename, contentType, or size" }, { status: 400 });
  }

  const userId = session.user.id;

  switch (category) {
    case "beat-audio":
    case "beat-cover":
    case "beat-license":
      return handleBeatUpload(category, { filename, contentType, size, context, userId });
    case "collab-project-file":
      return handleCollabProjectFile({ filename, contentType, size, context, userId });
    default:
      return NextResponse.json({ error: "Unknown upload category" }, { status: 400 });
  }
}

async function handleBeatUpload(
  category: "beat-audio" | "beat-cover" | "beat-license",
  { filename, contentType, size, context, userId }: { filename: string; contentType: string; size: number; context: Record<string, unknown>; userId: string }
) {
  const currentUser = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!currentUser || currentUser.role !== "producer") {
    return NextResponse.json({ error: "Only producer accounts can upload beat files" }, { status: 403 });
  }

  const beatId = typeof context.beatId === "string" ? context.beatId : null;
  if (!beatId) {
    return NextResponse.json({ error: "Missing beatId" }, { status: 400 });
  }

  // If this beatId already exists, the caller must own it (adding/replacing
  // a license tier on an existing beat). If it doesn't exist yet, this is a
  // brand-new beat upload — the client generated beatId itself and will
  // create the Beat row (with this exact id) in the same request that
  // reports these uploaded keys back. Either way the R2 key is namespaced
  // under this session's own userId, so no other producer's files can ever
  // be overwritten or collided with.
  const existingBeat = await db.beat.findUnique({ where: { id: beatId }, select: { producerId: true } });
  if (existingBeat && existingBeat.producerId !== userId) {
    return NextResponse.json({ error: "You don't own this beat" }, { status: 403 });
  }

  if (category === "beat-audio") {
    const ext = ALLOWED_AUDIO_TYPES[contentType];
    if (!ext) return NextResponse.json({ error: "Audio must be an MP3 or WAV file" }, { status: 400 });
    if (size <= 0 || size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Audio file must be under ${Math.round(MAX_AUDIO_SIZE_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }
    const key = beatAudioKey(userId, beatId, ext);
    const { url, expiresIn } = await createUploadUrl(key, contentType);
    return NextResponse.json({ key, uploadUrl: url, expiresIn });
  }

  if (category === "beat-cover") {
    const ext = ALLOWED_IMAGE_TYPES[contentType];
    if (!ext) return NextResponse.json({ error: "Cover artwork must be a JPG, PNG, or WEBP image" }, { status: 400 });
    if (size <= 0 || size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Cover artwork must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }
    const key = beatCoverKey(userId, beatId, ext);
    const { url, expiresIn } = await createUploadUrl(key, contentType);
    return NextResponse.json({ key, uploadUrl: url, expiresIn });
  }

  // beat-license
  if (existingBeat) {
    const soldCheck = await db.beat.findUnique({ where: { id: beatId }, select: { exclusiveSoldAt: true } });
    if (soldCheck?.exclusiveSoldAt) {
      return NextResponse.json({ error: "Exclusive rights to this beat have already been sold" }, { status: 400 });
    }
  }
  const licenseFileId = typeof context.licenseFileId === "string" ? context.licenseFileId : randomUUID();
  const ext = ALLOWED_LICENSE_FILE_TYPES[contentType];
  if (!ext) return NextResponse.json({ error: "File must be an MP3, WAV, or ZIP" }, { status: 400 });
  if (size <= 0 || size > MAX_LICENSE_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File must be under ${Math.round(MAX_LICENSE_FILE_SIZE_BYTES / 1024 / 1024)}MB` },
      { status: 400 }
    );
  }
  const key = beatLicenseKey(userId, beatId, licenseFileId, ext);
  const { url, expiresIn } = await createUploadUrl(key, contentType);
  return NextResponse.json({ key, uploadUrl: url, expiresIn, licenseFileId });
}

async function handleCollabProjectFile({
  filename,
  contentType,
  size,
  context,
  userId,
}: {
  filename: string;
  contentType: string;
  size: number;
  context: Record<string, unknown>;
  userId: string;
}) {
  const projectId = typeof context.projectId === "string" ? context.projectId : null;
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }
  if (!(await isProjectParticipant(projectId, userId))) {
    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
  }

  let ext = ALLOWED_PROJECT_FILE_TYPES[contentType];
  if (!ext) {
    // MIDI/ZIP MIME types are reported inconsistently across browsers/OSes —
    // fall back to the file's own extension if it's on the allow-list
    // (mirrors the legacy saveCollabFile() behavior).
    const fallback = filename.split(".").pop()?.toLowerCase();
    const validExts = new Set(Object.values(ALLOWED_PROJECT_FILE_TYPES));
    if (fallback && validExts.has(fallback)) ext = fallback;
  }
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (size <= 0 || size > MAX_PROJECT_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File must be under ${Math.round(MAX_PROJECT_FILE_SIZE_BYTES / 1024 / 1024)}MB` },
      { status: 400 }
    );
  }

  const fileId = randomUUID();
  const key = collabFileKey("project", projectId, fileId, filename);
  const { url, expiresIn } = await createUploadUrl(key, contentType);
  return NextResponse.json({ key, uploadUrl: url, expiresIn, fileId });
}

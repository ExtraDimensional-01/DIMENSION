import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { beatUpdateSchema } from "@/lib/validations";
import { serializeBeat } from "@/lib/serialize";
import { isBeatUnlockedForUser } from "@/lib/orders";
import { beatInclude } from "@/lib/beat-query";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [session, beat] = await Promise.all([
    auth(),
    db.beat.findUnique({ where: { id }, include: beatInclude }),
  ]);
  if (!beat) {
    return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  }
  const unlocked = await isBeatUnlockedForUser(session?.user?.id, id);
  const isOwner = session?.user?.id === beat.producerId;
  return NextResponse.json({ beat: serializeBeat(beat, unlocked, isOwner) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.beat.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  }
  if (existing.producerId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own beats" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let fields: Record<string, unknown> = {};
  let coverFile: File | null = null;
  let removeCover = false;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    for (const key of ["title", "bpm", "key", "genre", "mood", "description"]) {
      const v = formData.get(key);
      if (v !== null) fields[key] = v;
    }
    const tagsRaw = formData.get("tags");
    if (typeof tagsRaw === "string") {
      try {
        fields.tags = JSON.parse(tagsRaw);
      } catch {
        fields.tags = [];
      }
    }
    const isPublicRaw = formData.get("isPublic");
    if (isPublicRaw !== null) fields.isPublic = isPublicRaw === "true";

    const cover = formData.get("cover");
    if (cover instanceof File && cover.size > 0) coverFile = cover;
    removeCover = formData.get("removeCover") === "true";
  } else {
    fields = await req.json().catch(() => ({}));
  }

  const parsed = beatUpdateSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let newCoverKey: string | null | undefined = undefined;

  if (coverFile) {
    const ext = ALLOWED_IMAGE_TYPES[coverFile.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Cover artwork must be a JPG, PNG, or WEBP image" },
        { status: 400 }
      );
    }
    if (coverFile.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Cover artwork must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await coverFile.arrayBuffer());
    newCoverKey = await storage.save(buffer, "covers", ext);
    if (existing.coverKey) await storage.delete(existing.coverKey);
  } else if (removeCover && existing.coverKey) {
    await storage.delete(existing.coverKey);
    newCoverKey = null;
  }

  const data: Prisma.BeatUpdateInput = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.bpm !== undefined) data.bpm = parsed.data.bpm;
  if (parsed.data.key !== undefined) data.key = parsed.data.key;
  if (parsed.data.genre !== undefined) data.genre = parsed.data.genre;
  if (parsed.data.mood !== undefined) data.mood = parsed.data.mood || null;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.isPublic !== undefined) data.isPublic = parsed.data.isPublic;
  if (newCoverKey !== undefined) data.coverKey = newCoverKey;

  if (parsed.data.tags !== undefined) {
    const normalizedTags = Array.from(
      new Set(parsed.data.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))
    );
    data.tags = {
      deleteMany: {},
      create: normalizedTags.map((name: string) => ({
        tag: {
          connectOrCreate: { where: { name }, create: { name } },
        },
      })),
    };
  }

  const beat = await db.beat.update({
    where: { id },
    data,
    include: beatInclude,
  });

  return NextResponse.json({ beat: serializeBeat(beat, false, true) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.beat.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  }
  if (existing.producerId !== session.user.id) {
    return NextResponse.json({ error: "You can only delete your own beats" }, { status: 403 });
  }

  await db.beat.delete({ where: { id } });

  await storage.delete(existing.audioKey);
  if (existing.coverKey) await storage.delete(existing.coverKey);

  return NextResponse.json({ success: true });
}

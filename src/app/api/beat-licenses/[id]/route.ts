import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { beatLicenseUpdateSchema } from "@/lib/validations";
import { parseLicenseFormFields } from "@/lib/beat-license-form";
import { serializeBeatLicense } from "@/lib/serialize";
import { ALLOWED_LICENSE_FILE_TYPES, MAX_LICENSE_FILE_SIZE_BYTES } from "@/lib/constants";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.beatLicense.findUnique({
    where: { id },
    include: { beat: { select: { producerId: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }
  if (existing.beat.producerId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit licenses on your own beats" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const parsed = beatLicenseUpdateSchema.safeParse(parseLicenseFormFields(formData));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const fileEntry = formData.get("file");
  const replacingFile = fileEntry instanceof File && fileEntry.size > 0;

  const priceRaw = formData.get("price");
  let priceCents: number | undefined;
  if (typeof priceRaw === "string" && priceRaw.trim() !== "") {
    const dollars = Number(priceRaw);
    if (Number.isNaN(dollars) || dollars < 0) {
      return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
    }
    priceCents = Math.round(dollars * 100);
  }

  let fileKey: string | undefined;
  let fileFormat: string | undefined;
  let fileSize: number | undefined;
  if (replacingFile) {
    const file = fileEntry as File;
    const ext = ALLOWED_LICENSE_FILE_TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: "File must be an MP3, WAV, or ZIP" }, { status: 400 });
    }
    if (file.size > MAX_LICENSE_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File must be under ${Math.round(MAX_LICENSE_FILE_SIZE_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    fileKey = await storage.save(buffer, "license", ext);
    fileFormat = ext;
    fileSize = file.size;
  }

  const license = await db.beatLicense.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.terms !== undefined ? { terms: parsed.data.terms } : {}),
      ...(parsed.data.isExclusive !== undefined ? { isExclusive: parsed.data.isExclusive } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.includedFormats !== undefined
        ? { includedFormats: JSON.stringify(parsed.data.includedFormats) }
        : {}),
      ...(parsed.data.commercialUse !== undefined ? { commercialUse: parsed.data.commercialUse } : {}),
      ...(parsed.data.distributionAllowed !== undefined
        ? { distributionAllowed: parsed.data.distributionAllowed }
        : {}),
      ...(parsed.data.musicVideoAllowed !== undefined
        ? { musicVideoAllowed: parsed.data.musicVideoAllowed }
        : {}),
      ...(parsed.data.performanceAllowed !== undefined
        ? { performanceAllowed: parsed.data.performanceAllowed }
        : {}),
      ...(parsed.data.socialMediaAllowed !== undefined
        ? { socialMediaAllowed: parsed.data.socialMediaAllowed }
        : {}),
      ...(parsed.data.streamLimit !== undefined ? { streamLimit: parsed.data.streamLimit } : {}),
      ...(parsed.data.salesLimit !== undefined ? { salesLimit: parsed.data.salesLimit } : {}),
      ...(parsed.data.creditRequired !== undefined ? { creditRequired: parsed.data.creditRequired } : {}),
      ...(parsed.data.creditText !== undefined ? { creditText: parsed.data.creditText } : {}),
      ...(parsed.data.otherRestrictions !== undefined
        ? { otherRestrictions: parsed.data.otherRestrictions }
        : {}),
      ...(priceCents !== undefined ? { priceCents } : {}),
      ...(fileKey !== undefined ? { fileKey, fileFormat, fileSize } : {}),
    },
  });

  if (replacingFile) {
    await storage.delete(existing.fileKey);
  }

  return NextResponse.json({ license: serializeBeatLicense(license) });
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

  const existing = await db.beatLicense.findUnique({
    where: { id },
    include: { beat: { select: { producerId: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }
  if (existing.beat.producerId !== session.user.id) {
    return NextResponse.json({ error: "You can only delete licenses on your own beats" }, { status: 403 });
  }

  const hasOrder = await db.order.findFirst({ where: { licenseId: id }, select: { id: true } });
  if (hasOrder) {
    return NextResponse.json({ error: "Can't delete a license that has orders on it" }, { status: 400 });
  }

  await db.beatLicense.delete({ where: { id } });
  await storage.delete(existing.fileKey);

  return NextResponse.json({ success: true });
}

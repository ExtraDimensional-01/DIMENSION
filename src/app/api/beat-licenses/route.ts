import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { storage, isR2Configured, headObjectMeta } from "@/lib/storage";
import { beatLicenseFieldsSchema } from "@/lib/validations";
import { parseLicenseFormFields } from "@/lib/beat-license-form";
import { serializeBeatLicense } from "@/lib/serialize";
import { ALLOWED_LICENSE_FILE_TYPES, MAX_LICENSE_FILE_SIZE_BYTES } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (isR2Configured() && contentType.includes("application/json")) {
    return postFromUploadedKey(req, session.user.id);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const beatId = formData.get("beatId");
  if (typeof beatId !== "string" || !beatId) {
    return NextResponse.json({ error: "Missing beat" }, { status: 400 });
  }

  const beat = await db.beat.findUnique({
    where: { id: beatId },
    select: { id: true, producerId: true, exclusiveSoldAt: true },
  });
  if (!beat) {
    return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  }
  if (beat.producerId !== session.user.id) {
    return NextResponse.json({ error: "You can only add licenses to your own beats" }, { status: 403 });
  }
  if (beat.exclusiveSoldAt) {
    return NextResponse.json(
      { error: "Exclusive rights to this beat have already been sold" },
      { status: 400 }
    );
  }

  const priceRaw = formData.get("price");
  if (typeof priceRaw !== "string" || priceRaw.trim() === "") {
    return NextResponse.json({ error: "Enter a price" }, { status: 400 });
  }
  const dollars = Number(priceRaw);
  if (Number.isNaN(dollars) || dollars < 0) {
    return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
  }
  const priceCents = Math.round(dollars * 100);

  const parsed = beatLicenseFieldsSchema.safeParse(parseLicenseFormFields(formData));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json({ error: "A deliverable file is required" }, { status: 400 });
  }
  const ext = ALLOWED_LICENSE_FILE_TYPES[fileEntry.type];
  if (!ext) {
    return NextResponse.json({ error: "File must be an MP3, WAV, or ZIP" }, { status: 400 });
  }
  if (fileEntry.size > MAX_LICENSE_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File must be under ${Math.round(MAX_LICENSE_FILE_SIZE_BYTES / 1024 / 1024)}MB` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const fileKey = await storage.save(buffer, "license", ext);

  const maxSortOrder = await db.beatLicense.aggregate({
    where: { beatId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  const license = await db.beatLicense.create({
    data: {
      beatId,
      name: parsed.data.name,
      priceCents,
      terms: parsed.data.terms,
      isExclusive: parsed.data.isExclusive,
      isActive: parsed.data.isActive,
      includedFormats: JSON.stringify(parsed.data.includedFormats),
      commercialUse: parsed.data.commercialUse,
      distributionAllowed: parsed.data.distributionAllowed,
      musicVideoAllowed: parsed.data.musicVideoAllowed,
      performanceAllowed: parsed.data.performanceAllowed,
      socialMediaAllowed: parsed.data.socialMediaAllowed,
      streamLimit: parsed.data.streamLimit ?? null,
      salesLimit: parsed.data.salesLimit ?? null,
      creditRequired: parsed.data.creditRequired,
      creditText: parsed.data.creditText,
      otherRestrictions: parsed.data.otherRestrictions,
      fileKey,
      fileFormat: ext,
      fileSize: fileEntry.size,
      sortOrder,
    },
  });

  return NextResponse.json({ license: serializeBeatLicense(license) }, { status: 201 });
}

interface PresignedLicenseBody {
  beatId: string;
  name: string;
  price: string;
  terms?: string;
  isExclusive?: boolean;
  isActive?: boolean;
  includedFormats?: string[];
  commercialUse?: boolean;
  distributionAllowed?: boolean;
  musicVideoAllowed?: boolean;
  performanceAllowed?: boolean;
  socialMediaAllowed?: boolean;
  streamLimit?: string;
  salesLimit?: string;
  creditRequired?: boolean;
  creditText?: string;
  otherRestrictions?: string;
  file: { key: string; size: number };
}

/** Adds a license tier whose deliverable file was already uploaded directly to R2 via a presigned URL. */
async function postFromUploadedKey(req: Request, userId: string): Promise<NextResponse> {
  let body: PresignedLicenseBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const beatId = body.beatId;
  if (typeof beatId !== "string" || !beatId) {
    return NextResponse.json({ error: "Missing beat" }, { status: 400 });
  }
  const beat = await db.beat.findUnique({
    where: { id: beatId },
    select: { id: true, producerId: true, exclusiveSoldAt: true },
  });
  if (!beat) return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  if (beat.producerId !== userId) {
    return NextResponse.json({ error: "You can only add licenses to your own beats" }, { status: 403 });
  }
  if (beat.exclusiveSoldAt) {
    return NextResponse.json({ error: "Exclusive rights to this beat have already been sold" }, { status: 400 });
  }

  const dollars = Number(body.price);
  if (Number.isNaN(dollars) || dollars < 0) {
    return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
  }
  const priceCents = Math.round(dollars * 100);

  const parsed = beatLicenseFieldsSchema.safeParse({
    name: body.name,
    terms: body.terms,
    isExclusive: body.isExclusive,
    isActive: body.isActive,
    includedFormats: body.includedFormats ?? [],
    commercialUse: body.commercialUse,
    distributionAllowed: body.distributionAllowed,
    musicVideoAllowed: body.musicVideoAllowed,
    performanceAllowed: body.performanceAllowed,
    socialMediaAllowed: body.socialMediaAllowed,
    streamLimit: body.streamLimit ? Number(body.streamLimit) : null,
    salesLimit: body.salesLimit ? Number(body.salesLimit) : null,
    creditRequired: body.creditRequired,
    creditText: body.creditText,
    otherRestrictions: body.otherRestrictions,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (!body.file?.key || !body.file.key.startsWith(`beats/${userId}/${beatId}/licenses/`)) {
    return NextResponse.json({ error: "Invalid file upload" }, { status: 400 });
  }
  const ext = body.file.key.split(".").pop()?.toLowerCase() ?? "";
  if (!Object.values(ALLOWED_LICENSE_FILE_TYPES).includes(ext)) {
    return NextResponse.json({ error: "File must be an MP3, WAV, or ZIP" }, { status: 400 });
  }
  const meta = await headObjectMeta(body.file.key);
  if (!meta) {
    return NextResponse.json({ error: "Upload not found — please re-upload and try again" }, { status: 400 });
  }
  if (meta.size > MAX_LICENSE_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File must be under ${Math.round(MAX_LICENSE_FILE_SIZE_BYTES / 1024 / 1024)}MB` },
      { status: 400 }
    );
  }

  const maxSortOrder = await db.beatLicense.aggregate({ where: { beatId }, _max: { sortOrder: true } });
  const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  const license = await db.beatLicense.create({
    data: {
      beatId,
      name: parsed.data.name,
      priceCents,
      terms: parsed.data.terms,
      isExclusive: parsed.data.isExclusive,
      isActive: parsed.data.isActive,
      includedFormats: JSON.stringify(parsed.data.includedFormats),
      commercialUse: parsed.data.commercialUse,
      distributionAllowed: parsed.data.distributionAllowed,
      musicVideoAllowed: parsed.data.musicVideoAllowed,
      performanceAllowed: parsed.data.performanceAllowed,
      socialMediaAllowed: parsed.data.socialMediaAllowed,
      streamLimit: parsed.data.streamLimit ?? null,
      salesLimit: parsed.data.salesLimit ?? null,
      creditRequired: parsed.data.creditRequired,
      creditText: parsed.data.creditText,
      otherRestrictions: parsed.data.otherRestrictions,
      fileKey: body.file.key,
      fileFormat: ext,
      fileSize: meta.size,
      sortOrder,
    },
  });

  return NextResponse.json({ license: serializeBeatLicense(license) }, { status: 201 });
}

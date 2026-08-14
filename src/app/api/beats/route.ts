import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  storage,
  isR2Configured,
  headObjectMeta,
  beatAudioKey,
  beatCoverKey,
  beatLicenseKey,
} from "@/lib/storage";
import { beatMetadataSchema, beatLicenseFieldsSchema } from "@/lib/validations";
import { serializeBeatSummary } from "@/lib/serialize";
import { getUnlockedBeatIds } from "@/lib/orders";
import { beatInclude, buildBeatWhere, buildBeatOrderBy } from "@/lib/beat-query";
import {
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_LICENSE_FILE_TYPES,
  BEATS_PAGE_SIZE,
  MAX_AUDIO_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_LICENSE_FILE_SIZE_BYTES,
} from "@/lib/constants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const genre = searchParams.get("genre")?.trim();
  const mood = searchParams.get("mood")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const producerId = searchParams.get("producerId")?.trim();
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const bpmMinRaw = searchParams.get("bpmMin");
  const bpmMaxRaw = searchParams.get("bpmMax");
  const bpmMin = bpmMinRaw ? Number(bpmMinRaw) : undefined;
  const bpmMax = bpmMaxRaw ? Number(bpmMaxRaw) : undefined;

  const where = buildBeatWhere({ q, genre, mood, tag, producerId, sort, bpmMin, bpmMax });
  const orderBy = buildBeatOrderBy(sort);

  const [session, [beats, total]] = await Promise.all([
    auth(),
    Promise.all([
      db.beat.findMany({
        where,
        include: beatInclude,
        orderBy,
        skip: (page - 1) * BEATS_PAGE_SIZE,
        take: BEATS_PAGE_SIZE,
      }),
      db.beat.count({ where }),
    ]),
  ]);

  const unlockedIds = await getUnlockedBeatIds(
    session?.user?.id,
    beats.map((b) => b.id)
  );

  return NextResponse.json({
    beats: beats.map((beat) => serializeBeatSummary(beat, unlockedIds.has(beat.id))),
    total,
    page,
    hasMore: page * BEATS_PAGE_SIZE < total,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be logged in to upload a beat" }, { status: 401 });
  }

  // A JWT session can outlive the account it points to (e.g. the account was
  // deleted after the session was issued). Fail with a clear, actionable
  // error instead of a raw foreign-key crash on beat creation.
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!currentUser) {
    return NextResponse.json(
      { error: "Your session is no longer valid. Please log out and log back in." },
      { status: 401 }
    );
  }
  if (currentUser.role !== "producer") {
    return NextResponse.json(
      { error: "Only producer accounts can upload beats." },
      { status: 403 }
    );
  }

  // R2 mode: the client already uploaded audio/cover/license files directly
  // to R2 via presigned URLs (see /api/uploads/presign) and is now just
  // reporting back the object keys as JSON, to be verified and persisted.
  const contentType = req.headers.get("content-type") ?? "";
  if (isR2Configured() && contentType.includes("application/json")) {
    return postFromUploadedKeys(req, session.user.id);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioFile = formData.get("audio");
  if (!(audioFile instanceof File) || audioFile.size === 0) {
    return NextResponse.json({ error: "An audio file is required" }, { status: 400 });
  }

  const audioExt = ALLOWED_AUDIO_TYPES[audioFile.type];
  if (!audioExt) {
    return NextResponse.json(
      { error: "Audio must be an MP3 or WAV file" },
      { status: 400 }
    );
  }
  if (audioFile.size > MAX_AUDIO_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Audio file must be under ${Math.round(MAX_AUDIO_SIZE_BYTES / 1024 / 1024)}MB` },
      { status: 400 }
    );
  }

  const coverFile = formData.get("cover");
  let coverExt: string | undefined;
  if (coverFile instanceof File && coverFile.size > 0) {
    coverExt = ALLOWED_IMAGE_TYPES[coverFile.type];
    if (!coverExt) {
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
  }

  let tags: string[] = [];
  const tagsRaw = formData.get("tags");
  if (typeof tagsRaw === "string" && tagsRaw.length > 0) {
    try {
      tags = JSON.parse(tagsRaw);
    } catch {
      tags = [];
    }
  }

  const parsed = beatMetadataSchema.safeParse({
    title: formData.get("title"),
    bpm: formData.get("bpm"),
    key: formData.get("key"),
    genre: formData.get("genre"),
    mood: formData.get("mood") ?? "",
    description: formData.get("description") ?? "",
    tags,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // License tiers are optional at upload time — a producer can publish
  // without pricing and add tiers later from the edit page. Each tier's
  // deliverable file arrives as a repeated "licenseFiles" entry, in the same
  // order as the "licenses" JSON array.
  type PreparedLicense = {
    name: string;
    priceCents: number;
    terms: string;
    isExclusive: boolean;
    includedFormats: string[];
    commercialUse: boolean;
    distributionAllowed: boolean;
    musicVideoAllowed: boolean;
    performanceAllowed: boolean;
    socialMediaAllowed: boolean;
    streamLimit: number | null;
    salesLimit: number | null;
    creditRequired: boolean;
    creditText: string;
    otherRestrictions: string;
    file: File;
  };
  const preparedLicenses: PreparedLicense[] = [];
  const licensesRaw = formData.get("licenses");
  if (typeof licensesRaw === "string" && licensesRaw.trim() !== "") {
    let licenseInputs: unknown[] = [];
    try {
      const arr = JSON.parse(licensesRaw);
      if (Array.isArray(arr)) licenseInputs = arr;
    } catch {
      return NextResponse.json({ error: "Invalid license data" }, { status: 400 });
    }
    const licenseFileEntries = formData.getAll("licenseFiles");

    for (let i = 0; i < licenseInputs.length; i++) {
      const li = licenseInputs[i] as Record<string, unknown>;
      const fileEntry = licenseFileEntries[i];
      if (!(fileEntry instanceof File) || fileEntry.size === 0) {
        return NextResponse.json({ error: `License tier ${i + 1} is missing a file` }, { status: 400 });
      }
      const ext = ALLOWED_LICENSE_FILE_TYPES[fileEntry.type];
      if (!ext) {
        return NextResponse.json(
          { error: `License tier ${i + 1}: file must be an MP3, WAV, or ZIP` },
          { status: 400 }
        );
      }
      if (fileEntry.size > MAX_LICENSE_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `License tier ${i + 1}: file must be under ${Math.round(
              MAX_LICENSE_FILE_SIZE_BYTES / 1024 / 1024
            )}MB`,
          },
          { status: 400 }
        );
      }
      const dollars = Number(li?.price);
      if (Number.isNaN(dollars) || dollars < 0) {
        return NextResponse.json({ error: `License tier ${i + 1}: enter a valid price` }, { status: 400 });
      }

      const toNullableInt = (v: unknown): number | null | undefined => {
        if (typeof v !== "string" || v.trim() === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : null;
      };
      const structuredParsed = beatLicenseFieldsSchema.safeParse({
        name: li?.name,
        terms: li?.terms,
        isExclusive: li?.isExclusive,
        includedFormats: Array.isArray(li?.includedFormats) ? li.includedFormats : [],
        commercialUse: li?.commercialUse,
        distributionAllowed: li?.distributionAllowed,
        musicVideoAllowed: li?.musicVideoAllowed,
        performanceAllowed: li?.performanceAllowed,
        socialMediaAllowed: li?.socialMediaAllowed,
        streamLimit: toNullableInt(li?.streamLimit),
        salesLimit: toNullableInt(li?.salesLimit),
        creditRequired: li?.creditRequired,
        creditText: li?.creditText,
        otherRestrictions: li?.otherRestrictions,
      });
      if (!structuredParsed.success) {
        return NextResponse.json(
          { error: `License tier ${i + 1}: ${structuredParsed.error.issues[0]?.message ?? "invalid input"}` },
          { status: 400 }
        );
      }

      preparedLicenses.push({
        name: structuredParsed.data.name,
        priceCents: Math.round(dollars * 100),
        terms: structuredParsed.data.terms,
        isExclusive: structuredParsed.data.isExclusive,
        includedFormats: structuredParsed.data.includedFormats,
        commercialUse: structuredParsed.data.commercialUse,
        distributionAllowed: structuredParsed.data.distributionAllowed,
        musicVideoAllowed: structuredParsed.data.musicVideoAllowed,
        performanceAllowed: structuredParsed.data.performanceAllowed,
        socialMediaAllowed: structuredParsed.data.socialMediaAllowed,
        streamLimit: structuredParsed.data.streamLimit ?? null,
        salesLimit: structuredParsed.data.salesLimit ?? null,
        creditRequired: structuredParsed.data.creditRequired,
        creditText: structuredParsed.data.creditText,
        otherRestrictions: structuredParsed.data.otherRestrictions,
        file: fileEntry,
      });
    }
  }

  const durationRaw = formData.get("durationSec");
  const durationSec =
    typeof durationRaw === "string" && durationRaw && !Number.isNaN(Number(durationRaw))
      ? Number(durationRaw)
      : null;

  // Client-extracted amplitude peaks for waveform rendering. Trusted only in
  // shape (array of finite numbers) — never executed or interpreted as anything else.
  let waveformPeaks: string | null = null;
  const waveformRaw = formData.get("waveformPeaks");
  if (typeof waveformRaw === "string" && waveformRaw.length > 0) {
    try {
      const arr = JSON.parse(waveformRaw);
      if (Array.isArray(arr) && arr.every((n) => typeof n === "number" && Number.isFinite(n))) {
        waveformPeaks = JSON.stringify(arr.map((n) => Math.max(0, Math.min(1, n))));
      }
    } catch {
      waveformPeaks = null;
    }
  }

  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  const audioKey = await storage.save(audioBuffer, "audio", audioExt);

  let coverKey: string | null = null;
  if (coverFile instanceof File && coverExt) {
    const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
    coverKey = await storage.save(coverBuffer, "covers", coverExt);
  }

  const normalizedTags = Array.from(
    new Set(parsed.data.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))
  );

  let beat = await db.beat.create({
    data: {
      title: parsed.data.title,
      bpm: parsed.data.bpm,
      key: parsed.data.key,
      genre: parsed.data.genre,
      mood: parsed.data.mood || null,
      description: parsed.data.description,
      audioKey,
      audioFormat: audioExt,
      audioSize: audioFile.size,
      durationSec,
      waveformPeaks,
      coverKey,
      producerId: session.user.id,
      tags: {
        create: normalizedTags.map((name: string) => ({
          tag: {
            connectOrCreate: {
              where: { name },
              create: { name },
            },
          },
        })),
      },
    },
    include: beatInclude,
  });

  if (preparedLicenses.length > 0) {
    for (let i = 0; i < preparedLicenses.length; i++) {
      const pl = preparedLicenses[i];
      const buffer = Buffer.from(await pl.file.arrayBuffer());
      const licenseExt = ALLOWED_LICENSE_FILE_TYPES[pl.file.type];
      const fileKey = await storage.save(buffer, "license", licenseExt);
      await db.beatLicense.create({
        data: {
          beatId: beat.id,
          name: pl.name,
          priceCents: pl.priceCents,
          terms: pl.terms,
          isExclusive: pl.isExclusive,
          includedFormats: JSON.stringify(pl.includedFormats),
          commercialUse: pl.commercialUse,
          distributionAllowed: pl.distributionAllowed,
          musicVideoAllowed: pl.musicVideoAllowed,
          performanceAllowed: pl.performanceAllowed,
          socialMediaAllowed: pl.socialMediaAllowed,
          streamLimit: pl.streamLimit,
          salesLimit: pl.salesLimit,
          creditRequired: pl.creditRequired,
          creditText: pl.creditText,
          otherRestrictions: pl.otherRestrictions,
          fileKey,
          fileFormat: licenseExt,
          fileSize: pl.file.size,
          sortOrder: i,
        },
      });
    }
    beat = (await db.beat.findUnique({ where: { id: beat.id }, include: beatInclude }))!;
  }

  return NextResponse.json({ beat: serializeBeatSummary(beat) }, { status: 201 });
}

interface UploadedFileRef {
  key: string;
  size: number;
}

interface PresignedLicenseInput {
  name: string;
  price: string;
  terms: string;
  isExclusive: boolean;
  includedFormats: string[];
  commercialUse: boolean;
  distributionAllowed: boolean;
  musicVideoAllowed: boolean;
  performanceAllowed: boolean;
  socialMediaAllowed: boolean;
  streamLimit: string;
  salesLimit: string;
  creditRequired: boolean;
  creditText: string;
  otherRestrictions: string;
  file: UploadedFileRef;
}

interface PresignedBeatBody {
  beatId: string;
  title: string;
  bpm: number;
  key: string;
  genre: string;
  mood?: string;
  description?: string;
  tags?: string[];
  durationSec?: number | null;
  waveformPeaks?: number[];
  audio: UploadedFileRef;
  cover?: UploadedFileRef | null;
  licenses?: PresignedLicenseInput[];
}

/** Extracts and validates the extension off a key like "beats/u1/b1/preview.wav", against an allowed-extension set. */
function extFromKey(key: string): string {
  return key.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Finalizes a beat whose audio/cover/license files were already uploaded
 * directly to R2 via presigned URLs. Every reported key is re-verified here
 * — reconstructed from (userId, beatId, extension) and compared for an
 * exact match, then confirmed to actually exist in R2 (HeadObject) with a
 * size within limits — so a client can't report an arbitrary or someone
 * else's object key and have it accepted.
 */
async function postFromUploadedKeys(req: Request, userId: string): Promise<NextResponse> {
  let body: PresignedBeatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = beatMetadataSchema.safeParse({
    title: body.title,
    bpm: body.bpm,
    key: body.key,
    genre: body.genre,
    mood: body.mood ?? "",
    description: body.description ?? "",
    tags: body.tags ?? [],
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const beatId = body.beatId;
  if (typeof beatId !== "string" || !beatId) {
    return NextResponse.json({ error: "Missing beatId" }, { status: 400 });
  }
  const alreadyExists = await db.beat.findUnique({ where: { id: beatId }, select: { id: true } });
  if (alreadyExists) {
    return NextResponse.json({ error: "This beat has already been created" }, { status: 400 });
  }

  // --- Verify the audio object ---
  if (!body.audio?.key) {
    return NextResponse.json({ error: "An audio file is required" }, { status: 400 });
  }
  const audioExt = extFromKey(body.audio.key);
  if (!Object.values(ALLOWED_AUDIO_TYPES).includes(audioExt) || body.audio.key !== beatAudioKey(userId, beatId, audioExt)) {
    return NextResponse.json({ error: "Invalid audio upload" }, { status: 400 });
  }
  const audioMeta = await headObjectMeta(body.audio.key);
  if (!audioMeta) {
    return NextResponse.json({ error: "Audio upload not found — please re-upload and try again" }, { status: 400 });
  }
  if (audioMeta.size > MAX_AUDIO_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Audio file must be under ${Math.round(MAX_AUDIO_SIZE_BYTES / 1024 / 1024)}MB` },
      { status: 400 }
    );
  }

  // --- Verify the cover object, if provided ---
  let coverKey: string | null = null;
  if (body.cover?.key) {
    const coverExt = extFromKey(body.cover.key);
    if (!Object.values(ALLOWED_IMAGE_TYPES).includes(coverExt) || body.cover.key !== beatCoverKey(userId, beatId, coverExt)) {
      return NextResponse.json({ error: "Invalid cover upload" }, { status: 400 });
    }
    const coverMeta = await headObjectMeta(body.cover.key);
    if (!coverMeta) {
      return NextResponse.json({ error: "Cover upload not found — please re-upload and try again" }, { status: 400 });
    }
    if (coverMeta.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Cover artwork must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }
    coverKey = body.cover.key;
  }

  // --- Verify each license tier's deliverable object ---
  const licenseInputs = body.licenses ?? [];
  const verifiedLicenses: {
    data: ReturnType<typeof beatLicenseFieldsSchema.parse>;
    priceCents: number;
    fileKey: string;
    fileFormat: string;
    fileSize: number;
  }[] = [];

  for (let i = 0; i < licenseInputs.length; i++) {
    const li = licenseInputs[i];
    if (!li.file?.key) {
      return NextResponse.json({ error: `License tier ${i + 1} is missing a file` }, { status: 400 });
    }
    const ext = extFromKey(li.file.key);
    if (!Object.values(ALLOWED_LICENSE_FILE_TYPES).includes(ext) || !li.file.key.startsWith(`beats/${userId}/${beatId}/licenses/`)) {
      return NextResponse.json({ error: `License tier ${i + 1}: invalid file upload` }, { status: 400 });
    }
    const meta = await headObjectMeta(li.file.key);
    if (!meta) {
      return NextResponse.json(
        { error: `License tier ${i + 1}: upload not found — please re-upload and try again` },
        { status: 400 }
      );
    }
    if (meta.size > MAX_LICENSE_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `License tier ${i + 1}: file must be under ${Math.round(MAX_LICENSE_FILE_SIZE_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }
    const dollars = Number(li.price);
    if (Number.isNaN(dollars) || dollars < 0) {
      return NextResponse.json({ error: `License tier ${i + 1}: enter a valid price` }, { status: 400 });
    }
    const toNullableInt = (v: string): number | null => {
      if (typeof v !== "string" || v.trim() === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    };
    const structuredParsed = beatLicenseFieldsSchema.safeParse({
      name: li.name,
      terms: li.terms,
      isExclusive: li.isExclusive,
      includedFormats: Array.isArray(li.includedFormats) ? li.includedFormats : [],
      commercialUse: li.commercialUse,
      distributionAllowed: li.distributionAllowed,
      musicVideoAllowed: li.musicVideoAllowed,
      performanceAllowed: li.performanceAllowed,
      socialMediaAllowed: li.socialMediaAllowed,
      streamLimit: toNullableInt(li.streamLimit),
      salesLimit: toNullableInt(li.salesLimit),
      creditRequired: li.creditRequired,
      creditText: li.creditText,
      otherRestrictions: li.otherRestrictions,
    });
    if (!structuredParsed.success) {
      return NextResponse.json(
        { error: `License tier ${i + 1}: ${structuredParsed.error.issues[0]?.message ?? "invalid input"}` },
        { status: 400 }
      );
    }
    verifiedLicenses.push({
      data: structuredParsed.data,
      priceCents: Math.round(dollars * 100),
      fileKey: li.file.key,
      fileFormat: ext,
      fileSize: meta.size,
    });
  }

  const durationSec =
    typeof body.durationSec === "number" && Number.isFinite(body.durationSec) ? body.durationSec : null;

  let waveformPeaks: string | null = null;
  if (Array.isArray(body.waveformPeaks) && body.waveformPeaks.every((n) => typeof n === "number" && Number.isFinite(n))) {
    waveformPeaks = JSON.stringify(body.waveformPeaks.map((n) => Math.max(0, Math.min(1, n))));
  }

  const normalizedTags = Array.from(
    new Set(parsed.data.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))
  );

  let beat = await db.beat.create({
    data: {
      id: beatId,
      title: parsed.data.title,
      bpm: parsed.data.bpm,
      key: parsed.data.key,
      genre: parsed.data.genre,
      mood: parsed.data.mood || null,
      description: parsed.data.description,
      audioKey: body.audio.key,
      audioFormat: audioExt,
      audioSize: audioMeta.size,
      durationSec,
      waveformPeaks,
      coverKey,
      producerId: userId,
      tags: {
        create: normalizedTags.map((name: string) => ({
          tag: { connectOrCreate: { where: { name }, create: { name } } },
        })),
      },
    },
    include: beatInclude,
  });

  if (verifiedLicenses.length > 0) {
    for (let i = 0; i < verifiedLicenses.length; i++) {
      const vl = verifiedLicenses[i];
      await db.beatLicense.create({
        data: {
          beatId: beat.id,
          name: vl.data.name,
          priceCents: vl.priceCents,
          terms: vl.data.terms,
          isExclusive: vl.data.isExclusive,
          includedFormats: JSON.stringify(vl.data.includedFormats),
          commercialUse: vl.data.commercialUse,
          distributionAllowed: vl.data.distributionAllowed,
          musicVideoAllowed: vl.data.musicVideoAllowed,
          performanceAllowed: vl.data.performanceAllowed,
          socialMediaAllowed: vl.data.socialMediaAllowed,
          streamLimit: vl.data.streamLimit ?? null,
          salesLimit: vl.data.salesLimit ?? null,
          creditRequired: vl.data.creditRequired,
          creditText: vl.data.creditText,
          otherRestrictions: vl.data.otherRestrictions,
          fileKey: vl.fileKey,
          fileFormat: vl.fileFormat,
          fileSize: vl.fileSize,
          sortOrder: i,
        },
      });
    }
    beat = (await db.beat.findUnique({ where: { id: beat.id }, include: beatInclude }))!;
  }

  return NextResponse.json({ beat: serializeBeatSummary(beat) }, { status: 201 });
}

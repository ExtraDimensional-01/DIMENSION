import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 access, via its S3-compatible API. Credentials are read only
 * from server-side env vars (never NEXT_PUBLIC_) and this module is only
 * ever imported from server code (API routes, other lib modules) — never
 * from a "use client" component.
 */

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

/** True once all four R2 env vars are set — the switch DIMENSION uses to prefer R2 over local disk. */
export function isR2Configured(): boolean {
  return !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT && R2_BUCKET_NAME);
}

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured — set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, and R2_BUCKET_NAME."
    );
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return cachedClient;
}

/** Presigned PUT URL the browser can upload directly to, bypassing the Vercel function entirely. */
export async function presignPutUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), command, { expiresIn });
}

/** Presigned GET URL for a private object — the only way any file ever leaves the bucket. */
export async function presignGetUrl(
  key: string,
  options?: { expiresIn?: number; downloadFilename?: string },
  contentTypeOverride?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ...(options?.downloadFilename
      ? { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(options.downloadFilename)}"` }
      : {}),
    ...(contentTypeOverride ? { ResponseContentType: contentTypeOverride } : {}),
  });
  return getSignedUrl(client(), command, { expiresIn: options?.expiresIn ?? 300 });
}

/** Returns object metadata if it exists in the bucket, or null if not found. Used to verify a client-reported upload actually happened before trusting it. */
export async function headObject(key: string): Promise<{ size: number; contentType: string | undefined } | null> {
  try {
    const res = await client().send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  } catch {
    // already gone — fine, matches LocalDiskStorage.delete's "best effort" semantics
  }
}

/** Server-side buffered upload — used for small files (images) that don't need a presigned direct upload. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await client().send(
    new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: body, ContentType: contentType })
  );
}

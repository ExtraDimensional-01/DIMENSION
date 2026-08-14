import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isR2Configured, R2_BUCKET_NAME } from "@/lib/r2";
import * as r2 from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Developer/admin-only diagnostic — never linked from the UI, and gated by
 * ADMIN_EMAIL so a random authenticated user can't probe the bucket. Runs a
 * self-contained round trip against R2 and reports pass/fail per step, then
 * cleans up after itself. Visit it directly at /api/admin/storage-test
 * while logged in as the admin account.
 */
export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json(
      { error: "ADMIN_EMAIL isn't set — this test endpoint is disabled until it is." },
      { status: 501 }
    );
  }

  const session = await auth();
  if (!session?.user?.email || session.user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    // Same response whether logged out or logged in as a non-admin — don't
    // reveal that this endpoint exists or who the admin is.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "R2 isn't configured — set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME." },
      { status: 501 }
    );
  }

  const results: { step: string; pass: boolean; detail: string }[] = [];
  const testKey = `_diagnostics/storage-test-${Date.now()}.txt`;
  const testBody = Buffer.from(`DIMENSION storage test — ${new Date().toISOString()}`);

  // 1. Upload
  try {
    await r2.putObject(testKey, testBody, "text/plain");
    results.push({ step: "Upload", pass: true, detail: `Wrote ${testBody.length} bytes to ${testKey}` });
  } catch (err) {
    results.push({ step: "Upload", pass: false, detail: String(err) });
    return NextResponse.json({ bucket: R2_BUCKET_NAME, results, allPassed: false });
  }

  // 2. Object existence
  try {
    const meta = await r2.headObject(testKey);
    results.push({
      step: "Object existence",
      pass: meta !== null && meta.size === testBody.length,
      detail: meta ? `Found, ${meta.size} bytes, content-type ${meta.contentType}` : "HeadObject returned null",
    });
  } catch (err) {
    results.push({ step: "Object existence", pass: false, detail: String(err) });
  }

  // 3. Signed download URL generation
  let signedUrl = "";
  try {
    signedUrl = await r2.presignGetUrl(testKey, { expiresIn: 60 });
    results.push({ step: "Signed download URL generation", pass: !!signedUrl, detail: "Presigned GET URL generated" });
  } catch (err) {
    results.push({ step: "Signed download URL generation", pass: false, detail: String(err) });
  }

  // 4. Authorized retrieval — fetch via the signed URL, expect 200 + matching body
  if (signedUrl) {
    try {
      const res = await fetch(signedUrl);
      const text = await res.text();
      results.push({
        step: "Authorized retrieval (signed URL)",
        pass: res.ok && text === testBody.toString(),
        detail: `HTTP ${res.status}, body ${res.ok ? "matched" : "did not match"}`,
      });
    } catch (err) {
      results.push({ step: "Authorized retrieval (signed URL)", pass: false, detail: String(err) });
    }
  }

  // 5. Unauthorized retrieval rejection — hit the same object with no
  // signature at all, straight against the R2 endpoint. This should fail —
  // if it succeeds, the bucket is misconfigured as public.
  try {
    const endpoint = process.env.R2_ENDPOINT!.replace(/\/$/, "");
    const unsignedUrl = `${endpoint}/${R2_BUCKET_NAME}/${testKey}`;
    const res = await fetch(unsignedUrl);
    results.push({
      step: "Unauthorized retrieval rejection",
      pass: !res.ok,
      detail: res.ok
        ? `WARNING: unsigned request succeeded (HTTP ${res.status}) — bucket may be public!`
        : `Correctly rejected with HTTP ${res.status}`,
    });
  } catch (err) {
    // A network-level failure also counts as "rejected".
    results.push({ step: "Unauthorized retrieval rejection", pass: true, detail: `Rejected: ${String(err)}` });
  }

  // 6. Cleanup
  try {
    await r2.deleteObject(testKey);
    const meta = await r2.headObject(testKey);
    results.push({ step: "Cleanup", pass: meta === null, detail: meta === null ? "Test object deleted" : "Object still exists after delete" });
  } catch (err) {
    results.push({ step: "Cleanup", pass: false, detail: String(err) });
  }

  const allPassed = results.every((r) => r.pass);
  return NextResponse.json({ bucket: R2_BUCKET_NAME, results, allPassed }, { status: allPassed ? 200 : 500 });
}

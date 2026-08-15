import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidPlatform, normalizeUrl } from "@/lib/social-links";

/** Add or update (upsert by platform) one of the caller's own social links. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { platform, url, displayName } = body as { platform?: unknown; url?: unknown; displayName?: unknown };

  if (!isValidPlatform(platform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }
  if (typeof url !== "string") {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return NextResponse.json({ error: "Enter a valid http(s) URL" }, { status: 400 });
  }

  const existingCount = await db.socialLink.count({ where: { userId: session.user.id } });

  const link = await db.socialLink.upsert({
    where: { userId_platform: { userId: session.user.id, platform } },
    create: {
      userId: session.user.id,
      platform,
      url: normalized,
      displayName: typeof displayName === "string" ? displayName.trim().slice(0, 100) : "",
      sortOrder: existingCount,
    },
    update: {
      url: normalized,
      displayName: typeof displayName === "string" ? displayName.trim().slice(0, 100) : "",
    },
  });

  return NextResponse.json({ link });
}

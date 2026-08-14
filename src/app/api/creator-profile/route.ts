import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { creatorProfileSchema } from "@/lib/collab-validations";
import { serializeCreatorProfile } from "@/lib/collab-serialize";
import { creatorProfileInclude } from "@/lib/creator-query";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    include: creatorProfileInclude,
  });

  return NextResponse.json({ creator: profile ? serializeCreatorProfile(profile) : null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = creatorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = {
    roles: JSON.stringify(parsed.data.roles),
    genres: JSON.stringify(parsed.data.genres),
    skills: JSON.stringify(parsed.data.skills),
    experience: parsed.data.experience,
    location: parsed.data.location,
    remotePref: parsed.data.remotePref,
    availability: parsed.data.availability,
    headline: parsed.data.headline,
    portfolioLinks: JSON.stringify(parsed.data.portfolioLinks),
  };

  const profile = await db.creatorProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
    include: creatorProfileInclude,
  });

  return NextResponse.json({ creator: serializeCreatorProfile(profile) });
}

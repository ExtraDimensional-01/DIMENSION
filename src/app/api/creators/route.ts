import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeCreatorProfile } from "@/lib/collab-serialize";
import { creatorProfileInclude, buildCreatorWhere } from "@/lib/creator-query";
import { CREATORS_PAGE_SIZE } from "@/lib/constants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const role = searchParams.get("role")?.trim();
  const genre = searchParams.get("genre")?.trim();
  const skill = searchParams.get("skill")?.trim();
  const location = searchParams.get("location")?.trim();
  const availability = searchParams.get("availability")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);

  const where = buildCreatorWhere({ q, role, genre, skill, location, availability });

  const [profiles, total] = await Promise.all([
    db.creatorProfile.findMany({
      where,
      include: creatorProfileInclude,
      orderBy: [{ ratingAvg: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * CREATORS_PAGE_SIZE,
      take: CREATORS_PAGE_SIZE,
    }),
    db.creatorProfile.count({ where }),
  ]);

  return NextResponse.json({
    creators: profiles.map(serializeCreatorProfile),
    total,
    page,
    hasMore: page * CREATORS_PAGE_SIZE < total,
  });
}

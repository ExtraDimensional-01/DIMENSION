import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ producers: [] });
  }

  const producers = await db.user.findMany({
    where: { producerName: { contains: q } },
    select: {
      id: true,
      producerName: true,
      profileImage: true,
      _count: { select: { beats: { where: { isPublic: true } }, followers: true } },
    },
    orderBy: { producerName: "asc" },
    take: 6,
  });

  return NextResponse.json({
    producers: producers.map((p) => ({
      id: p.id,
      producerName: p.producerName,
      profileImageUrl: fileUrl(p.profileImage),
      beatCount: p._count.beats,
      followerCount: p._count.followers,
    })),
  });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const tags = await db.tag.findMany({
    select: { name: true, _count: { select: { beats: true } } },
    orderBy: { beats: { _count: "desc" } },
    take: 30,
  });

  return NextResponse.json({
    tags: tags.filter((t) => t._count.beats > 0).map((t) => t.name),
  });
}

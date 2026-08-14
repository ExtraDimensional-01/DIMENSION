import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeReview } from "@/lib/collab-serialize";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const reviews = await db.collaborationReview.findMany({
    where: { revieweeId: userId },
    include: { reviewer: { select: { id: true, producerName: true, profileImage: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ reviews: reviews.map(serializeReview) });
}

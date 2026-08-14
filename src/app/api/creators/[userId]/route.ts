import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeCreatorProfile, serializeProject } from "@/lib/collab-serialize";
import { creatorProfileInclude } from "@/lib/creator-query";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const profile = await db.creatorProfile.findUnique({
    where: { userId },
    include: creatorProfileInclude,
  });
  if (!profile) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const showcasedProjects = await db.collaborationProject.findMany({
    where: {
      status: "completed",
      participants: { some: { userId, showcaseOnProfile: true } },
    },
    include: {
      post: { select: { id: true, title: true, genre: true } },
      participants: { include: { user: { select: { id: true, producerName: true, profileImage: true } } } },
    },
    orderBy: { completedAt: "desc" },
    take: 24,
  });

  return NextResponse.json({
    creator: serializeCreatorProfile(profile),
    portfolio: showcasedProjects.map(serializeProject),
  });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serializeProject } from "@/lib/collab-serialize";
import { checkUpcomingDeadlines } from "@/lib/notify";

const projectInclude = {
  post: { select: { id: true, title: true, genre: true } },
  participants: { include: { user: { select: { id: true, producerName: true, profileImage: true } } } },
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await checkUpcomingDeadlines(session.user.id).catch(() => {});

  const projects = await db.collaborationProject.findMany({
    where: { participants: { some: { userId: session.user.id } } },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects: projects.map(serializeProject) });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serializeApplication } from "@/lib/collab-serialize";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await db.collaborationApplication.findMany({
    where: { post: { creatorId: session.user.id } },
    include: {
      applicant: { select: { id: true, producerName: true, profileImage: true } },
      files: true,
      post: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    applications: applications.map((a) => ({ ...serializeApplication(a), post: a.post })),
  });
}

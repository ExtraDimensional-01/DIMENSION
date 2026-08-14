import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { reviewSchema } from "@/lib/collab-validations";
import { serializeReview } from "@/lib/collab-serialize";
import { createNotification } from "@/lib/notify";

const reviewInclude = {
  reviewer: { select: { id: true, producerName: true, profileImage: true } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const reviews = await db.collaborationReview.findMany({
    where: { projectId },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reviews: reviews.map(serializeReview) });
}

// Reviews are immutable once created — no PATCH/DELETE endpoint exists
// anywhere in the app. That, combined with the checks below and the
// @@unique([projectId, reviewerId, revieweeId]) DB constraint, is the full
// anti-fraud model: you can only review someone you actually completed a
// project with, only once per direction, and never yourself.
export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.collaborationProject.findUnique({
    where: { id: projectId },
    include: { participants: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.status !== "completed") {
    return NextResponse.json({ error: "You can only leave a review after the collaboration is completed" }, { status: 400 });
  }

  const reviewerIsParticipant = project.participants.some((p) => p.userId === session.user.id);
  if (!reviewerIsParticipant) {
    return NextResponse.json({ error: "You weren't part of this collaboration" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (parsed.data.revieweeId === session.user.id) {
    return NextResponse.json({ error: "You can't review yourself" }, { status: 400 });
  }
  const revieweeIsParticipant = project.participants.some((p) => p.userId === parsed.data.revieweeId);
  if (!revieweeIsParticipant) {
    return NextResponse.json({ error: "That person wasn't part of this collaboration" }, { status: 400 });
  }

  let review;
  try {
    review = await db.collaborationReview.create({
      data: {
        projectId,
        reviewerId: session.user.id,
        revieweeId: parsed.data.revieweeId,
        communication: parsed.data.communication,
        reliability: parsed.data.reliability,
        qualityOfWork: parsed.data.qualityOfWork,
        professionalism: parsed.data.professionalism,
        overall: parsed.data.overall,
        comment: parsed.data.comment,
      },
      include: reviewInclude,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "You've already reviewed this person for this collaboration" }, { status: 400 });
    }
    throw err;
  }

  const agg = await db.collaborationReview.aggregate({
    where: { revieweeId: parsed.data.revieweeId },
    _avg: { overall: true },
    _count: { _all: true },
  });
  await db.creatorProfile.upsert({
    where: { userId: parsed.data.revieweeId },
    create: {
      userId: parsed.data.revieweeId,
      ratingAvg: agg._avg.overall,
      ratingCount: agg._count._all,
    },
    update: {
      ratingAvg: agg._avg.overall,
      ratingCount: agg._count._all,
    },
  });

  await createNotification(
    parsed.data.revieweeId,
    "review_new",
    "New review",
    `You received a new review for "${project.name}".`,
    `/creators/${parsed.data.revieweeId}`
  );

  return NextResponse.json({ review: serializeReview(review) }, { status: 201 });
}

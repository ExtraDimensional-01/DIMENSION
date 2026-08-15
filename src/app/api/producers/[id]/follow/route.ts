import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { isUniqueConstraintError } from "@/lib/db-errors";

/** Follow a producer. Idempotent: following someone you already follow just confirms the existing state, no duplicate row. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: followingId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const followerId = session.user.id;

  if (followerId === followingId) {
    return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });
  }

  const [target, follower] = await Promise.all([
    db.user.findUnique({ where: { id: followingId }, select: { id: true, deletedAt: true } }),
    db.user.findUnique({ where: { id: followerId }, select: { producerName: true } }),
  ]);
  if (!target || target.deletedAt) {
    return NextResponse.json({ error: "Producer not found" }, { status: 404 });
  }

  try {
    await db.follow.create({ data: { followerId, followingId } });
    await createNotification(
      followingId,
      "new_follower",
      "New follower",
      `${follower?.producerName ?? "Someone"} started following you.`,
      `/producers/${followerId}`
    );
  } catch (err) {
    // Unique constraint violation = already following — treat as success,
    // not an error, since the end state the caller wanted is already true.
    if (!isUniqueConstraintError(err)) {
      throw err;
    }
  }

  const followerCount = await db.follow.count({ where: { followingId } });
  return NextResponse.json({ following: true, followerCount }, { status: 201 });
}

/** Unfollow a producer. Idempotent: unfollowing someone you don't follow is a no-op success. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: followingId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.follow.deleteMany({ where: { followerId: session.user.id, followingId } });

  const followerCount = await db.follow.count({ where: { followingId } });
  return NextResponse.json({ following: false, followerCount });
}

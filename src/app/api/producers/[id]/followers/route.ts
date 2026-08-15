import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { FOLLOW_LIST_PAGE_SIZE } from "@/lib/constants";

/** Paginated list of users who follow this producer. Public — no auth required to view, but the viewer's own follow state on each row is only ever computed from their own session. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);

  const [session, rows, total] = await Promise.all([
    auth(),
    db.follow.findMany({
      where: { followingId: id, follower: { deletedAt: null } },
      include: { follower: { select: { id: true, producerName: true, profileImage: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * FOLLOW_LIST_PAGE_SIZE,
      take: FOLLOW_LIST_PAGE_SIZE,
    }),
    db.follow.count({ where: { followingId: id, follower: { deletedAt: null } } }),
  ]);

  const viewerId = session?.user?.id;
  let followingSet = new Set<string>();
  if (viewerId) {
    const viewerFollows = await db.follow.findMany({
      where: { followerId: viewerId, followingId: { in: rows.map((r) => r.follower.id) } },
      select: { followingId: true },
    });
    followingSet = new Set(viewerFollows.map((f) => f.followingId));
  }

  return NextResponse.json({
    users: rows.map((r) => ({
      id: r.follower.id,
      producerName: r.follower.producerName,
      profileImageUrl: fileUrl(r.follower.profileImage),
      isFollowing: followingSet.has(r.follower.id),
      isSelf: r.follower.id === viewerId,
    })),
    total,
    page,
    hasMore: page * FOLLOW_LIST_PAGE_SIZE < total,
  });
}

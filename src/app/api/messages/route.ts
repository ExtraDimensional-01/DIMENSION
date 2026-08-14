import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;

  // Bounded window of recent messages involving me — plenty to derive every
  // conversation + its latest message for V1 scale without a raw SQL window query.
  const recentMessages = await db.message.findMany({
    where: { OR: [{ senderId: myId }, { recipientId: myId }] },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      sender: { select: { id: true, producerName: true, profileImage: true, role: true } },
      recipient: { select: { id: true, producerName: true, profileImage: true, role: true } },
    },
  });

  const unreadBySender = await db.message.groupBy({
    by: ["senderId"],
    where: { recipientId: myId, readAt: null },
    _count: { _all: true },
  });
  const unreadMap = new Map(unreadBySender.map((u) => [u.senderId, u._count._all]));

  const conversations = new Map<
    string,
    {
      participant: { id: string; producerName: string; profileImageUrl: string | null; role: string };
      lastMessage: { body: string; createdAt: string; fromMe: boolean };
      unreadCount: number;
    }
  >();

  for (const m of recentMessages) {
    const isSender = m.senderId === myId;
    const other = isSender ? m.recipient : m.sender;
    if (conversations.has(other.id)) continue; // already have the latest (list is ordered desc)

    conversations.set(other.id, {
      participant: {
        id: other.id,
        producerName: other.producerName,
        profileImageUrl: fileUrl(other.profileImage),
        role: other.role,
      },
      lastMessage: {
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        fromMe: isSender,
      },
      unreadCount: unreadMap.get(other.id) ?? 0,
    });
  }

  return NextResponse.json({ conversations: Array.from(conversations.values()) });
}

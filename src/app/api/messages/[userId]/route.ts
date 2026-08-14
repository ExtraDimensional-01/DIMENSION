import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/storage";
import { canMessage } from "@/lib/messaging";
import { sendMessageSchema } from "@/lib/validations";
import { parseLicenseSnapshot } from "@/lib/license-snapshot";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;
  const { userId: otherId } = await params;

  const other = await db.user.findUnique({
    where: { id: otherId },
    select: { id: true, producerName: true, profileImage: true, role: true },
  });
  if (!other) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: myId, recipientId: otherId },
        { senderId: otherId, recipientId: myId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: {
      order: {
        include: {
          beat: { select: { title: true } },
        },
      },
    },
  });

  // Mark their messages to me as read.
  await db.message.updateMany({
    where: { senderId: otherId, recipientId: myId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    participant: {
      id: other.id,
      producerName: other.producerName,
      profileImageUrl: fileUrl(other.profileImage),
      role: other.role,
    },
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      fromMe: m.senderId === myId,
      createdAt: m.createdAt.toISOString(),
      order: m.order
        ? {
            id: m.order.id,
            orderNumber: m.order.orderNumber,
            status: m.order.status,
            paymentMethod: m.order.paymentMethod,
            priceCents: m.order.priceCents,
            createdAt: m.order.createdAt.toISOString(),
            confirmedAt: m.order.confirmedAt ? m.order.confirmedAt.toISOString() : null,
            beatId: m.order.beatId,
            beatTitle: m.order.beat.title,
            licenseId: m.order.licenseId,
            licenseName: parseLicenseSnapshot(m.order.licenseSnapshot).name,
            buyerId: m.order.buyerId,
            sellerId: m.order.sellerId,
          }
        : null,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;
  const { userId: recipientId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid message" },
      { status: 400 }
    );
  }

  const allowed = await canMessage(myId, recipientId);
  if (!allowed) {
    return NextResponse.json(
      { error: "You can't message this user." },
      { status: 403 }
    );
  }

  const message = await db.message.create({
    data: { senderId: myId, recipientId, body: parsed.data.body },
  });

  return NextResponse.json(
    {
      message: {
        id: message.id,
        body: message.body,
        fromMe: true,
        createdAt: message.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}

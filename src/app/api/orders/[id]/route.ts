import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderActionSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { parseLicenseSnapshot } from "@/lib/license-snapshot";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = orderActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      beat: { select: { title: true } },
      license: { select: { id: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.sellerId !== session.user.id) {
    return NextResponse.json(
      { error: "Only the seller can respond to this order" },
      { status: 403 }
    );
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "This order has already been resolved" },
      { status: 409 }
    );
  }

  // Use the frozen snapshot — not the live license row — so what actually
  // gets confirmed/named/unlocked always matches what the buyer agreed to.
  const snapshot = parseLicenseSnapshot(order.licenseSnapshot);

  const confirm = parsed.data.action === "confirm";
  const updated = await db.order.update({
    where: { id },
    data: {
      status: confirm ? "confirmed" : "declined",
      confirmedAt: confirm ? new Date() : null,
    },
  });

  if (confirm && snapshot.isExclusive) {
    await db.beat.update({
      where: { id: order.beatId },
      data: { exclusiveSoldAt: new Date() },
    });
  }

  const replyBody = confirm
    ? `Payment received — "${order.beat.title}" (${snapshot.name}) is unlocked for you now.`
    : `I haven't received payment for "${order.beat.title}" (${snapshot.name}), so I'm declining this order.`;
  await db.message.create({
    data: { senderId: order.sellerId, recipientId: order.buyerId, body: replyBody },
  });

  await createNotification(
    order.buyerId,
    confirm ? "order_confirmed" : "order_declined",
    confirm ? "Order confirmed" : "Order declined",
    confirm
      ? `Your purchase of "${order.beat.title}" (${snapshot.name}) was confirmed — it's unlocked now.`
      : `Your purchase request for "${order.beat.title}" (${snapshot.name}) was declined.`,
    `/messages/${order.sellerId}`
  );

  return NextResponse.json({
    order: {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      paymentMethod: updated.paymentMethod,
      priceCents: updated.priceCents,
      createdAt: updated.createdAt.toISOString(),
      confirmedAt: updated.confirmedAt ? updated.confirmedAt.toISOString() : null,
      beatId: updated.beatId,
      beatTitle: order.beat.title,
      licenseId: order.license.id,
      licenseName: snapshot.name,
      buyerId: updated.buyerId,
      sellerId: updated.sellerId,
    },
  });
}

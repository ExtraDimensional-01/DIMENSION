import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrderSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { generateOrderNumber } from "@/lib/orders";
import { buildLicenseSnapshot } from "@/lib/license-snapshot";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const buyerId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { licenseId, paymentMethod } = parsed.data;

  const license = await db.beatLicense.findUnique({
    where: { id: licenseId },
    include: {
      beat: { select: { id: true, title: true, producerId: true, exclusiveSoldAt: true } },
    },
  });
  if (!license) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }
  if (!license.isActive) {
    return NextResponse.json({ error: "This license tier is no longer available" }, { status: 400 });
  }
  if (license.beat.exclusiveSoldAt) {
    return NextResponse.json(
      { error: "This beat's exclusive rights have already been sold" },
      { status: 400 }
    );
  }
  if (license.beat.producerId === buyerId) {
    return NextResponse.json({ error: "You can't buy your own beat" }, { status: 400 });
  }

  const existingPending = await db.order.findFirst({
    where: { licenseId, buyerId, status: "pending" },
    select: { id: true },
  });
  if (existingPending) {
    return NextResponse.json(
      { error: "You already have a pending order for this license" },
      { status: 409 }
    );
  }

  const orderNumber = await generateOrderNumber();
  const licenseSnapshot = buildLicenseSnapshot(license);

  const order = await db.order.create({
    data: {
      orderNumber,
      licenseSnapshot,
      beatId: license.beat.id,
      licenseId: license.id,
      buyerId,
      sellerId: license.beat.producerId,
      paymentMethod,
      priceCents: license.priceCents,
    },
  });

  const priceDisplay = (license.priceCents / 100).toFixed(2);
  const message = await db.message.create({
    data: {
      senderId: buyerId,
      recipientId: license.beat.producerId,
      body: `I'd like to buy the "${license.name}" license for "${license.beat.title}" for $${priceDisplay}. I'll pay using ${paymentMethod}.`,
      orderId: order.id,
    },
  });

  await createNotification(
    license.beat.producerId,
    "order_new",
    "New purchase request",
    `Someone wants to buy the "${license.name}" license for "${license.beat.title}" using ${paymentMethod}.`,
    `/messages/${buyerId}`
  );

  return NextResponse.json(
    {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        priceCents: order.priceCents,
        createdAt: order.createdAt.toISOString(),
        confirmedAt: null,
        beatId: license.beat.id,
        beatTitle: license.beat.title,
        licenseId: license.id,
        licenseName: license.name,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      },
      message: {
        id: message.id,
        body: message.body,
        fromMe: true,
        createdAt: message.createdAt.toISOString(),
        orderId: order.id,
      },
    },
    { status: 201 }
  );
}

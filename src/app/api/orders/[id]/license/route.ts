import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateLicensePdf } from "@/lib/license-pdf";
import { parseLicenseSnapshot } from "@/lib/license-snapshot";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      beat: { select: { title: true } },
      buyer: { select: { producerName: true, email: true } },
      seller: { select: { producerName: true } },
    },
  });
  const isParty = order?.buyerId === session.user.id || order?.sellerId === session.user.id;
  if (!order || !isParty || order.status !== "confirmed") {
    return new Response("Not found", { status: 404 });
  }

  const snapshot = parseLicenseSnapshot(order.licenseSnapshot);

  const pdfBytes = await generateLicensePdf({
    orderNumber: order.orderNumber,
    beatTitle: order.beat.title,
    producerName: order.seller.producerName,
    buyerName: order.buyer.producerName,
    buyerEmail: order.buyer.email,
    purchaseDate: order.confirmedAt ?? order.updatedAt,
    priceCentsPaid: order.priceCents,
    snapshot,
  });

  const filename = `${order.beat.title} - ${snapshot.name} - License Agreement.pdf`.replace(/[/\\]/g, "-");

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serveStoredObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  req: Request,
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
      license: { select: { name: true, fileKey: true, fileFormat: true } },
    },
  });
  const isParty = order?.buyerId === session.user.id || order?.sellerId === session.user.id;
  if (!order || !isParty || order.status !== "confirmed") {
    return new Response("Not found", { status: 404 });
  }

  const filename = `${order.beat.title} - ${order.license.name}.${order.license.fileFormat}`.replace(
    /[/\\]/g,
    "-"
  );

  return serveStoredObject(req, order.license.fileKey, { filename, disposition: "attachment" });
}

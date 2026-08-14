import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(_req: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.notification.findUnique({ where: { id: notificationId } });
  if (!existing) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
  return NextResponse.json({ success: true });
}

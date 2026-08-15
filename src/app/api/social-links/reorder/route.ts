import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidPlatform } from "@/lib/social-links";

/** Reorders the caller's own social links to match the given platform order. Only ever touches rows scoped to their own userId. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const order = Array.isArray(body?.order) ? body.order : null;
  if (!order || !order.every(isValidPlatform)) {
    return NextResponse.json({ error: "Invalid order list" }, { status: 400 });
  }

  await db.$transaction(
    order.map((platform: string, index: number) =>
      db.socialLink.updateMany({
        where: { userId: session.user.id, platform },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}

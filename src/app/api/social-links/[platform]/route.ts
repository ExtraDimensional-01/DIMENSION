import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Remove one of the caller's own social links. Scoped to their own userId — there's no way to target anyone else's. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.socialLink.deleteMany({ where: { userId: session.user.id, platform } });
  return NextResponse.json({ success: true });
}

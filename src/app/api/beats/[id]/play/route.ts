import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.beat.update({
      where: { id },
      data: { playCount: { increment: 1 } },
      select: { id: true },
    });
  } catch {
    // beat may not exist — play-count tracking is best-effort, not critical
  }
  return NextResponse.json({ success: true });
}

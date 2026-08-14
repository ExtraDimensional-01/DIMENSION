import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Self-service account deletion — soft delete/anonymize, not a hard delete.
 * The user row (and their beats, orders, reviews, messages) stays so
 * counterparties keep their purchase history and license PDFs; only this
 * account's own PII is scrubbed and deletedAt is set, which blocks login
 * (see the Credentials authorize() check in src/lib/auth.ts).
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Enter your password to confirm" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
  }

  if (user.profileImage) {
    await storage.delete(user.profileImage);
  }

  // Random, never-typeable password — belt-and-suspenders alongside the
  // deletedAt login check, in case that check is ever bypassed.
  const unusablePasswordHash = await bcrypt.hash(randomUUID(), 10);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        email: `deleted-${user.id}@deleted.dimension.invalid`,
        producerName: "Deleted user",
        bio: "",
        profileImage: null,
        passwordHash: unusablePasswordHash,
        deletedAt: new Date(),
      },
    }),
    // Collab-specific identity (roles, genres, skills, headline, links) — no
    // reason to keep this once the account is gone.
    db.creatorProfile.deleteMany({ where: { userId: user.id } }),
    // Unlist their beats so no new purchases happen; existing orders/license
    // downloads for buyers are untouched.
    db.beat.updateMany({ where: { producerId: user.id }, data: { isPublic: false } }),
    // Close out anything still open so it doesn't linger as actionable for
    // other users — completed/in_progress collabs (which have other
    // participants) are left alone.
    db.collaborationPost.updateMany({
      where: { creatorId: user.id, status: { in: ["draft", "open"] } },
      data: { status: "cancelled" },
    }),
    db.collaborationApplication.updateMany({
      where: { applicantId: user.id, status: "pending" },
      data: { status: "withdrawn" },
    }),
  ]);

  return NextResponse.json({ success: true });
}

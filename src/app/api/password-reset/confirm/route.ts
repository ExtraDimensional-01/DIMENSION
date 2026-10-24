import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { RESET_WINDOW_MS, hashResetToken } from "@/lib/password-reset";

export const runtime = "nodejs";

const INVALID_LINK = "This reset link is invalid or has expired. Request a new one.";

/** Step 2 of "forgot password": redeem a valid, unexpired, unused token for a new password. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (!rateLimit(`reset:${clientIp(req)}`, 10, RESET_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const { token, password } = parsed.data;
  const now = new Date();

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { deletedAt: true } } },
  });
  if (!record || record.usedAt || record.expiresAt <= now || record.user.deletedAt) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Claim the token with a conditional update — if two submits race, only
  // one sees count === 1, which is what actually makes the link single-use.
  const claimed = await db.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Burn any other outstanding links for this account too.
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  return NextResponse.json({ success: true });
}

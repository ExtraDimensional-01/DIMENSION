import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  RESET_CONFIRMS_PER_IP,
  RESET_CONFIRM_WINDOW_MS,
  hashResetToken,
} from "@/lib/password-reset";

const INVALID_LINK = "This reset link is invalid or has expired. Please request a new one.";

/**
 * POST /api/password-reset/confirm  { token, password }
 *
 * Valid only for an existing, unexpired, unused token. The token is claimed
 * with a single atomic UPDATE ... WHERE usedAt IS NULL, so two simultaneous
 * submissions of the same link can't both succeed. Every failure mode (unknown,
 * expired, already used, deleted account) returns the same message.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Throttle token guessing.
  const allowed = await checkRateLimit(
    `pwreset-confirm:ip:${getClientIp(req)}`,
    RESET_CONFIRMS_PER_IP,
    RESET_CONFIRM_WINDOW_MS
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const { token, password } = parsed.data;
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { id: true, deletedAt: true } } },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date() || record.user.deletedAt) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Atomic claim: only one caller can flip usedAt from null.
  const claimed = await db.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Any other outstanding reset links for this account die with this one.
    db.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

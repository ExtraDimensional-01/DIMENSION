import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import {
  RESET_TOKEN_TTL_MS,
  RESET_REQUESTS_PER_EMAIL,
  RESET_REQUESTS_PER_IP,
  RESET_REQUEST_WINDOW_MS,
  generateResetToken,
  hashResetToken,
  getAppBaseUrl,
} from "@/lib/password-reset";

/**
 * POST /api/password-reset/request  { email }
 *
 * Always answers the same way for any well-formed email — registered or not,
 * rate-limited per account or not — so the endpoint can't be used to find out
 * which addresses have accounts. The account lookup, token creation and email
 * send all run in after(), i.e. after the response has been sent, so response
 * timing doesn't reveal whether an email was found either.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Per-IP limit. Independent of the email submitted, so it can't leak anything.
  const ipAllowed = await checkRateLimit(
    `pwreset:ip:${getClientIp(req)}`,
    RESET_REQUESTS_PER_IP,
    RESET_REQUEST_WINDOW_MS
  );
  if (!ipAllowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { email } = parsed.data;
  after(async () => {
    try {
      await issueResetEmail(email);
    } catch (err) {
      // Never surfaced to the client (that would reveal state) — server logs only.
      console.error("[password-reset] failed to issue reset email:", err);
    }
  });

  return NextResponse.json({ ok: true });
}

async function issueResetEmail(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return;

  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    console.error("[password-reset] APP_URL is not set; cannot build a reset link");
    return;
  }

  // Per-account limit, so one person's inbox can't be flooded.
  const allowed = await checkRateLimit(
    `pwreset:user:${user.id}`,
    RESET_REQUESTS_PER_EMAIL,
    RESET_REQUEST_WINDOW_MS
  );
  if (!allowed) return;

  const token = generateResetToken();

  // Only the newest link works: drop earlier unused tokens, plus any expired
  // leftovers while we're here.
  await db.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      OR: [{ usedAt: null }, { expiresAt: { lt: new Date() } }],
    },
  });
  const created = await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
    select: { id: true },
  });

  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const minutes = Math.round(RESET_TOKEN_TTL_MS / 60000);

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your DIMENSION password",
      text:
        `We received a request to reset your DIMENSION password.\n\n` +
        `Open this link to choose a new one (valid for ${minutes} minutes, one use only):\n${link}\n\n` +
        `If you didn't ask for this, you can ignore this email — your password won't change.`,
      html:
        `<p>We received a request to reset your DIMENSION password.</p>` +
        `<p><a href="${link}">Choose a new password</a></p>` +
        `<p>This link is valid for ${minutes} minutes and can be used once.</p>` +
        `<p>If you didn't ask for this, you can ignore this email — your password won't change.</p>`,
    });
  } catch (err) {
    // The emailed link never reached anyone; don't leave a live token behind.
    await db.passwordResetToken.delete({ where: { id: created.id } }).catch(() => {});
    throw err;
  }
}

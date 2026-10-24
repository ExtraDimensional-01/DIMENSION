import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validations";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  RESET_MAX_PER_WINDOW,
  RESET_TOKEN_TTL_MS,
  RESET_WINDOW_MS,
  appOrigin,
  generateResetToken,
  hashResetToken,
} from "@/lib/password-reset";

export const runtime = "nodejs";

// Identical for registered and unregistered emails — the response must never
// reveal whether an account exists.
const GENERIC_RESPONSE = {
  message: "If an account exists for that email, we've sent a link to reset your password.",
};

/**
 * Step 1 of "forgot password": email a single-use reset link. The lookup and
 * send run in after() — once the response is already on its way — so a
 * registered address doesn't take measurably longer to answer than an
 * unregistered one (which would otherwise leak account existence by timing).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid email address" },
      { status: 400 }
    );
  }

  if (!rateLimit(`forgot:${clientIp(req)}`, 5, RESET_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const { email } = parsed.data;
  after(async () => {
    try {
      await issueResetLink(email, appOrigin(req));
    } catch (err) {
      console.error("[password-reset] failed to issue reset link", err);
    }
  });

  return NextResponse.json(GENERIC_RESPONSE);
}

async function issueResetLink(email: string, origin: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, producerName: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return;

  const now = new Date();
  const recent = await db.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - RESET_WINDOW_MS) } },
  });
  if (recent >= RESET_MAX_PER_WINDOW) return;

  const token = generateResetToken();
  await db.$transaction([
    // A new link supersedes any earlier one still sitting in their inbox.
    db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    // Housekeeping — rows past expiry by a day serve no purpose, even for the throttle.
    db.passwordResetToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
    db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your DIMENSION password",
    text: [
      `Hi ${user.producerName},`,
      "",
      "We received a request to reset the password for your DIMENSION account.",
      "Open this link to choose a new password (it expires in 1 hour and can only be used once):",
      "",
      link,
      "",
      "If you didn't ask for this, you can ignore this email — your password won't change.",
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
        <h1 style="font-size:20px;margin:0 0 16px">Reset your password</h1>
        <p style="margin:0 0 12px">Hi ${escapeHtml(user.producerName)},</p>
        <p style="margin:0 0 20px">We received a request to reset the password for your DIMENSION account. This link expires in 1 hour and can only be used once.</p>
        <p style="margin:0 0 24px">
          <a href="${link}" style="display:inline-block;background:#9b4dff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Reset password</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#52525b">Or paste this link into your browser:</p>
        <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${link}" style="color:#8a2eff">${link}</a></p>
        <p style="margin:0;font-size:13px;color:#52525b">If you didn't ask for this, you can ignore this email — your password won't change.</p>
      </div>`,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

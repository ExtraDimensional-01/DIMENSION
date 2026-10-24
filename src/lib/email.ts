/**
 * Minimal transactional-email sender.
 *
 * Production: sends through Resend's HTTP API when RESEND_API_KEY and
 * EMAIL_FROM are set (plain fetch — no SDK dependency). Credentials are read
 * from server-side environment variables only and never reach client code.
 *
 * Development: if those variables aren't set, the message is printed to the
 * server console instead of being sent, so the flow can be exercised locally
 * with no email account. This fallback is disabled when NODE_ENV is
 * "production" — a misconfigured production deploy fails loudly rather than
 * silently dropping (or logging) reset links.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (apiKey && from) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Email provider rejected the message (${res.status}): ${detail.slice(0, 200)}`);
    }
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `\n[email:dev] RESEND_API_KEY / EMAIL_FROM not set — not sending. Message follows.\n` +
        `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`
    );
    return;
  }

  throw new Error("Email is not configured: set RESEND_API_KEY and EMAIL_FROM");
}

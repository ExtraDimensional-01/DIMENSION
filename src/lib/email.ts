import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email over SMTP — works with any provider that offers SMTP
 * (Resend, Postmark, SendGrid, Mailgun, Gmail app passwords, ...). Same
 * "configured vs. local fallback" pattern as src/lib/r2.ts: credentials are
 * read only from server-side env vars (never NEXT_PUBLIC_) and this module is
 * only ever imported from server code.
 *
 * When SMTP isn't configured, development logs the message to the server
 * console instead (so the reset flow is testable locally with no account);
 * production refuses to pretend and logs an error.
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM;

/** True once the SMTP host, credentials, and From address are all set. */
export function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASSWORD && EMAIL_FROM);
}

let cachedTransport: Transporter | null = null;

function transport(): Transporter {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // implicit TLS on 465; STARTTLS otherwise
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }
  return cachedTransport;
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `\n[email] SMTP not configured — would have sent:\n  To: ${message.to}\n  Subject: ${message.subject}\n\n${message.text}\n`
      );
      return;
    }
    throw new Error(
      "Email is not configured — set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM."
    );
  }

  await transport().sendMail({ from: EMAIL_FROM, ...message });
}

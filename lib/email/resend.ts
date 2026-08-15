import { Resend } from "resend";

export function isResendEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "SolarFlow <onboarding@resend.dev>"
  );
}

let resendClient: Resend | null = null;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("Resend is not configured (missing RESEND_API_KEY).");
  }
  if (!resendClient) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ id: string | null; skipped: boolean }> {
  if (!isResendEnabled()) {
    console.info("[email] Resend disabled; skipping send", {
      to: input.to,
      subject: input.subject,
    });
    return { id: null, skipped: true };
  }

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: emailFromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`,
  });

  if (error) {
    throw new Error(error.message);
  }
  return { id: data?.id ?? null, skipped: false };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

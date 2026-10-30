/**
 * Sends email through Brevo's HTTPS API. Render's free tier blocks outbound
 * SMTP ports (25/465/587), so SMTP libraries like nodemailer can't be used.
 *
 * Env:
 *   BREVO_API_KEY   — API key from Brevo (SMTP & API -> API Keys)
 *   EMAIL_FROM      — a sender address verified in Brevo (Senders & IP)
 *   EMAIL_FROM_NAME — display name, defaults to "Savoury"
 */

export const isEmailConfigured = (): boolean => !!process.env.BREVO_API_KEY && !!process.env.EMAIL_FROM;

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured (BREVO_API_KEY / EMAIL_FROM missing)');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY as string,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_FROM_NAME || 'Savoury' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo send failed: HTTP ${res.status} ${body.slice(0, 300)}`);
  }
}

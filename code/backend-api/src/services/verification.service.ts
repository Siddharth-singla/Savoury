import crypto from 'crypto';
import prisma from '../db';
import { isEmailConfigured, sendEmail } from '../utils/mailer';

const LINK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000;    // at most one email per minute per account

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Public base URL of this API, used in the emailed link. Taken from config,
 * never from the request's Host header (an attacker could spoof it to get a
 * link pointing at their own server). Render sets RENDER_EXTERNAL_URL itself.
 */
const apiBaseUrl = () =>
  (process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT ?? 3000}`)
    .replace(/\/+$/, '');

/** Verification is on only once an email provider is configured. */
export const isVerificationEnabled = isEmailConfigured;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/**
 * Creates (or replaces) the user's verification link and emails it.
 * Returns false if skipped because an email was sent less than a minute ago.
 */
export async function sendVerificationEmail(user: { id: string; name: string; email: string }): Promise<boolean> {
  const existing = await prisma.emailVerification.findUnique({ where: { userId: user.id } });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return false;
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const data = { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LINK_TTL_MS), lastSentAt: new Date() };
  await prisma.emailVerification.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  const link = `${apiBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const name = escapeHtml(user.name);
  await sendEmail(
    user.email,
    'Verify your Savoury account',
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a120b">
      <h2 style="color:#2d1b0e">Welcome to Savoury, ${name}</h2>
      <p>Please confirm this is your email address to activate your account.</p>
      <p style="margin:28px 0">
        <a href="${link}" style="background:#2d1b0e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Verify my email</a>
      </p>
      <p style="font-size:13px;color:#7a6855">This link expires in 24 hours. If you didn't create a Savoury account, you can ignore this email.</p>
    </div>`,
    `Welcome to Savoury, ${user.name}.\n\nVerify your email by opening this link (valid for 24 hours):\n${link}\n\nIf you didn't create a Savoury account, ignore this email.`
  );
  return true;
}

/** Consumes a verification token. Returns true if the account is now verified. */
export async function verifyEmailToken(token: string): Promise<boolean> {
  if (!token || token.length > 200) return false;
  const record = await prisma.emailVerification.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.expiresAt.getTime() < Date.now()) return false;

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerification.delete({ where: { id: record.id } }),
  ]);
  return true;
}

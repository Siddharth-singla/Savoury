import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import prisma from '../db';
import { signToken } from '../utils/token';
import { isVerificationEnabled, sendVerificationEmail } from './verification.service';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  hostelId?: string;
  rollNo?: string;
  phone?: string;
  roomNo?: string;
}

const httpError = (status: number, message: string, code?: string) => {
  const error = new Error(message);
  (error as any).status = status;
  if (code) (error as any).code = code;
  return error;
};

// Compared against when the email doesn't exist, so a failed login takes the
// same time whether or not the account exists (prevents email enumeration).
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

/**
 * One-time setup: create the first SUPER_ADMIN.
 * Requires the SETUP_TOKEN env secret so a stranger can't claim the system
 * on a fresh or wiped database. Disabled once any SUPER_ADMIN exists.
 */
export const registerSuperAdmin = async (name: string, email: string, password: string, setupToken: string) => {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    throw httpError(403, 'Setup is disabled. Set the SETUP_TOKEN environment variable on the server to enable it.');
  }
  if (!safeEqual(setupToken, expected)) {
    throw httpError(403, 'Invalid setup code.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Serializable transaction: two simultaneous setup requests can't both
  // see "no super admin" and create one each.
  const admin = await prisma.$transaction(async (tx) => {
    const existingAdmin = await tx.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (existingAdmin) {
      throw httpError(409, 'Initial setup already completed. A Super Admin already exists.');
    }
    const existingEmail = await tx.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw httpError(409, 'Email already in use');
    }
    return tx.user.create({ data: { name, email, passwordHash, role: 'SUPER_ADMIN', emailVerified: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return {
    accessToken: signToken(admin),
    user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, hostelId: null },
  };
};

export const registerUser = async (data: RegisterData) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

  if (existingUser) {
    throw httpError(409, 'Email already in use');
  }

  if (data.rollNo) {
    const rollTaken = await prisma.user.findUnique({ where: { rollNo: data.rollNo } });
    if (rollTaken) {
      throw httpError(409, 'This roll number is already registered. Contact your warden if this is your roll number.');
    }
  }

  if (data.hostelId) {
    const hostel = await prisma.hostel.findUnique({ where: { id: data.hostelId }, select: { id: true } });
    if (!hostel) throw httpError(400, 'Selected hostel does not exist');
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: hashedPassword,
      hostelId: data.hostelId,
      rollNo: data.rollNo ?? null,
      phone: data.phone ?? null,
      roomNo: data.roomNo ?? null,
      role: 'STUDENT',
      // Until an email provider is configured, accounts are active immediately.
      emailVerified: !isVerificationEnabled(),
    },
  });

  let verificationRequired = false;
  if (!newUser.emailVerified) {
    verificationRequired = true;
    try {
      await sendVerificationEmail(newUser);
    } catch (err) {
      // The account still exists; logging in re-sends the link.
      console.error('[verify] failed to send verification email', err);
    }
  }

  return {
    verificationRequired,
    message: verificationRequired
      ? `Account created. We've sent a verification link to ${newUser.email}. Open it, then log in. Check your spam folder if you don't see it.`
      : 'Account created.',
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      hostelId: newUser.hostelId,
      walletBalance: 0, // Needs a wallet account created by admin
    },
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { hostel: { select: { name: true } } }
  });

  const isMatch = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !isMatch) {
    throw httpError(401, 'Invalid email or password');
  }

  // Checked only after the password, so this can't be used to probe emails.
  if (!user.emailVerified && isVerificationEnabled()) {
    try {
      await sendVerificationEmail(user); // no-op if one was sent in the last minute
    } catch (err) {
      console.error('[verify] failed to send verification email', err);
    }
    throw httpError(
      403,
      `Please verify your email first. We've sent a verification link to ${user.email}. Open it, then log in again. Check your spam folder if you don't see it.`,
      'EMAIL_NOT_VERIFIED'
    );
  }

  const activeWallet = await prisma.walletAccount.findFirst({
    where: { studentId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  return {
    accessToken: signToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hostelId: user.hostelId,
      hostelName: user.hostel?.name,
      walletBalance: activeWallet?.balance ?? 0,
    },
  };
};

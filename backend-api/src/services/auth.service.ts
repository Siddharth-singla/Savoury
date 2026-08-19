import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_please_set_in_env';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  hostelId?: string;
  rollNo?: string;
  phone?: string;
}

/**
 * One-time setup: create the first SUPER_ADMIN.
 * Throws 409 if any SUPER_ADMIN already exists.
 */
export const registerSuperAdmin = async (name: string, email: string, password: string) => {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (existingAdmin) {
    const error = new Error('Initial setup already completed. A Super Admin already exists.');
    (error as any).status = 409;
    throw error;
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    const error = new Error('Email already in use');
    (error as any).status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: { name, email, passwordHash, role: 'SUPER_ADMIN' },
  });

  const token = jwt.sign(
    { userId: admin.id, role: admin.role, hostelId: null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    accessToken: token,
    user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, hostelId: null },
  };
};

export const registerUser = async (data: RegisterData) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

  if (existingUser) {
    const error = new Error('Email already in use');
    (error as any).status = 409;
    throw error;
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
      role: 'STUDENT',
    },
  });

  return {
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

  if (!user) {
    const error = new Error('Invalid email or password');
    (error as any).status = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    (error as any).status = 401;
    throw error;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, hostelId: user.hostelId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const activeWallet = await prisma.walletAccount.findFirst({
    where: { studentId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  return {
    accessToken: token,
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

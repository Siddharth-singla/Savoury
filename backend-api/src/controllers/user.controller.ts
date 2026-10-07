import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from '../db';

const listUsersSchema = z.object({
  role: z.string().optional(),
  hostelId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['STUDENT', 'MESS_COMMITTEE', 'WARDEN_ADMIN', 'COUNTER_STAFF', 'SUPER_ADMIN']),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  rollNo: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  roomNo: z.string().optional().nullable(),
  role: z.enum(['STUDENT', 'MESS_COMMITTEE', 'WARDEN_ADMIN', 'COUNTER_STAFF', 'SUPER_ADMIN']).optional(),
  password: z.string().min(6).optional(),
});

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  roomNo: z.string().optional().nullable(),
  rollNo: z.string().optional().nullable(),
  avatarBase64: z.string().optional().nullable(),
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['STUDENT', 'MESS_COMMITTEE', 'WARDEN_ADMIN', 'COUNTER_STAFF', 'SUPER_ADMIN']).default('STUDENT'),
  hostelId: z.string().optional().nullable(),
  rollNo: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  roomNo: z.string().optional().nullable(),
});

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        hostel: { select: { id: true, name: true } },
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const data = updateMeSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: {
        hostel: { select: { id: true, name: true } },
      }
    });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, hostelId, page = '1', limit = '50', search } = listUsersSchema.parse(req.query);
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { hostelId: callerHostelId, role: callerRole } = req.user!;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;

    // WARDEN_ADMIN is always scoped to their own hostel, ignoring any hostelId param
    if (callerRole === 'WARDEN_ADMIN') {
      where.hostelId = callerHostelId;
    } else if (callerRole === 'SUPER_ADMIN' && hostelId) {
      // SUPER_ADMIN may optionally filter by hostelId
      where.hostelId = hostelId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { rollNo: { contains: q, mode: 'insensitive' } },
        { roomNo: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true,
          hostelId: true, rollNo: true, phone: true, roomNo: true, createdAt: true,
          hostel: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({ users, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body);
    const { hostelId: callerHostelId, role: callerRole } = req.user!;

    let targetHostelId = data.hostelId;
    if (callerRole === 'WARDEN_ADMIN') {
      targetHostelId = callerHostelId;
      if (data.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Wardens cannot create Super Admins' });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already in use' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        hostelId: targetHostelId,
        rollNo: data.rollNo || null,
        phone: data.phone || null,
        roomNo: data.roomNo || null,
      },
      select: {
        id: true, name: true, email: true, role: true,
        hostelId: true, rollNo: true, phone: true, roomNo: true, createdAt: true,
        hostel: { select: { name: true } },
      }
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);
    const { hostelId: callerHostelId, role: callerRole } = req.user!;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, hostelId: true, role: true },
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (callerRole === 'WARDEN_ADMIN') {
      if (targetUser.hostelId !== callerHostelId) {
        return res.status(403).json({ error: 'You can only manage users in your own hostel' });
      }
      if (data.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Wardens cannot assign the Super Admin role' });
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.rollNo !== undefined) updatePayload.rollNo = data.rollNo;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.roomNo !== undefined) updatePayload.roomNo = data.roomNo;
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.password) {
      updatePayload.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true, name: true, email: true, role: true,
        hostelId: true, rollNo: true, phone: true, roomNo: true, createdAt: true,
        hostel: { select: { name: true } },
      }
    });

    res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = updateRoleSchema.parse(req.body);
    const { hostelId: callerHostelId, role: callerRole } = req.user!;

    // WARDEN_ADMIN can only modify users within their hostel
    if (callerRole === 'WARDEN_ADMIN') {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { hostelId: true },
      });
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.hostelId !== callerHostelId) {
        return res.status(403).json({ error: 'You can only manage users in your own hostel' });
      }
      // Wardens cannot elevate anyone to SUPER_ADMIN
      if (role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Wardens cannot assign the Super Admin role' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, hostelId: true },
    });

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { hostelId: callerHostelId, role: callerRole, userId } = req.user!;

    // Prevent deleting oneself
    if (userId === id) {
      return res.status(400).json({ error: "You cannot delete yourself." });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, hostelId: true, role: true },
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (callerRole === 'WARDEN_ADMIN') {
      if (targetUser.hostelId !== callerHostelId) {
        return res.status(403).json({ error: 'You can only delete users in your own hostel' });
      }
      if (targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'WARDEN_ADMIN') {
        return res.status(403).json({ error: 'Wardens cannot delete other admins' });
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

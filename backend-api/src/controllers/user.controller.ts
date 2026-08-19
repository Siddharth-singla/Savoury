import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db';

const listUsersSchema = z.object({
  role: z.string().optional(),
  hostelId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['STUDENT', 'MESS_COMMITTEE', 'WARDEN_ADMIN', 'COUNTER_STAFF', 'SUPER_ADMIN']),
});

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, hostelId, page = '1', limit = '50' } = listUsersSchema.parse(req.query);
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

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true,
          hostelId: true, rollNo: true, phone: true, createdAt: true,
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

    // Prevent deleting oneself
    if (req.user!.userId === id) {
      return res.status(400).json({ error: "You cannot delete yourself." });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

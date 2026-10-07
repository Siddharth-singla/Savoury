import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../db';
import {
  ALL_ROLES,
  isHostelAdmin,
  canManageMessStaff,
  isStudentRole,
} from '../constants/roles';

const ROLE_ENUM = z.enum(ALL_ROLES as unknown as [string, ...string[]]);

const listUsersSchema = z.object({
  role: z.string().optional(),
  hostelId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

const updateRoleSchema = z.object({
  role: ROLE_ENUM,
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().endsWith('@thapar.edu', 'College email (@thapar.edu) is required').optional(),
  rollNo: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  roomNo: z.string().optional().nullable(),
  role: ROLE_ENUM.optional(),
  password: z.string().min(6).optional(),
});

const base64ImageRegex = /^data:image\/(jpeg|png|webp|jpg);base64,[A-Za-z0-9+/=]+$/;

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  roomNo: z.string().optional().nullable(),
  rollNo: z.string().optional().nullable(),
  avatarBase64: z.string().regex(base64ImageRegex, 'Invalid image format. Only JPEG, PNG, and WEBP are allowed.').optional().nullable(),
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().endsWith('@thapar.edu', 'College email (@thapar.edu) is required'),
  password: z.string().min(6),
  role: ROLE_ENUM.default('STUDENT'),
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

    // Hostel admins (Warden/Co-Warden/Caretaker) are always scoped to their own
    // hostel, ignoring any hostelId param.
    if (isHostelAdmin(callerRole)) {
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

    let targetHostelId = data.hostelId ?? null;

    // ── Authorization: who can create which role ──────────────────
    if (isHostelAdmin(callerRole)) {
      // Hostel admins always create within their OWN hostel.
      targetHostelId = callerHostelId;

      // The only account type a hostel admin may create is Mess Staff
      // (COUNTER_STAFF) — and only Warden/Co-Warden can, not Caretaker.
      if (data.role !== 'COUNTER_STAFF') {
        return res.status(403).json({
          error: 'You can only add Mess Staff accounts. Wardens, co-wardens, caretakers and students are managed elsewhere.',
        });
      }
      if (!canManageMessStaff(callerRole)) {
        return res.status(403).json({ error: 'Caretakers cannot add Mess Staff.' });
      }
    } else if (callerRole !== 'SUPER_ADMIN') {
      // Any other role has no business creating users.
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    // ── hostelId requirement for hostel-bound roles ───────────────
    const HOSTEL_BOUND_ROLES = ['WARDEN_ADMIN', 'CO_WARDEN', 'CARETAKER', 'COUNTER_STAFF', 'MESS_COMMITTEE', 'STUDENT'];
    if (data.role !== 'SUPER_ADMIN' && HOSTEL_BOUND_ROLES.includes(data.role) && !targetHostelId) {
      return res.status(400).json({ error: 'A hostel must be selected for this role.' });
    }

    // ── Per-hostel caps: exactly 1 Warden + 1 Co-Warden ───────────
    if ((data.role === 'WARDEN_ADMIN' || data.role === 'CO_WARDEN') && targetHostelId) {
      const existing = await prisma.user.count({
        where: { hostelId: targetHostelId, role: data.role as Role },
      });
      if (existing >= 1) {
        const label = data.role === 'WARDEN_ADMIN' ? 'Warden' : 'Co-Warden';
        return res.status(409).json({ error: `This hostel already has a ${label}. Remove the existing one first.` });
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
        role: data.role as Role,
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

    if (isHostelAdmin(callerRole)) {
      if (targetUser.hostelId !== callerHostelId) {
        return res.status(403).json({ error: 'You can only manage users in your own hostel' });
      }
      // Hostel admins (Warden/Co-Warden/Caretaker) cannot manage each other
      // or themselves — only the Super Admin can touch those accounts.
      if (isHostelAdmin(targetUser.role)) {
        return res.status(403).json({ error: 'Only a Super Admin can manage wardens, co-wardens, and caretakers.' });
      }
      // They may only assign student-type roles or Mess Staff — never
      // elevate anyone to an admin role.
      if (data.role !== undefined && !isStudentRole(data.role) && data.role !== 'COUNTER_STAFF') {
        return res.status(403).json({ error: 'You cannot assign that role.' });
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

    // Hostel admins (Warden/Co-Warden/Caretaker) may only toggle students
    // between STUDENT and MESS_COMMITTEE, within their own hostel. They
    // cannot touch other admins or assign privileged roles.
    if (isHostelAdmin(callerRole)) {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { hostelId: true, role: true },
      });
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.hostelId !== callerHostelId) {
        return res.status(403).json({ error: 'You can only manage users in your own hostel' });
      }
      if (isHostelAdmin(targetUser.role)) {
        return res.status(403).json({ error: 'Only a Super Admin can manage wardens, co-wardens, and caretakers.' });
      }
      // The inline role control is only for toggling students ↔ mess committee.
      if (!isStudentRole(targetUser.role) || !isStudentRole(role)) {
        return res.status(403).json({ error: 'You can only switch student accounts between Student and Mess Committee.' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
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

    if (isHostelAdmin(callerRole)) {
      if (targetUser.hostelId !== callerHostelId) {
        return res.status(403).json({ error: 'You can only delete users in your own hostel' });
      }
      // Hostel admins cannot delete Super Admins or other hostel admins
      // (Warden/Co-Warden/Caretaker) — only the Super Admin can.
      if (targetUser.role === 'SUPER_ADMIN' || isHostelAdmin(targetUser.role)) {
        return res.status(403).json({ error: 'Only a Super Admin can delete wardens, co-wardens, and caretakers.' });
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

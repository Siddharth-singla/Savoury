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
  role: ROLE_ENUM.optional(),
  hostelId: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  search: z.string().max(100).optional(),
});

const optText = (max: number) => z.string().trim().max(max).optional().nullable();
const ROLL_NO = z.string().trim().max(20).regex(/^[A-Za-z0-9-]*$/, 'Roll Number may only contain letters, digits and dashes').optional().nullable();
const PHONE = z.string().trim().regex(/^(\d{10})?$/, 'Phone must be exactly 10 digits').optional().nullable();

// ~300 KB of base64 is a ~220 KB image: plenty for an avatar.
const MAX_AVATAR_CHARS = 300_000;

const updateRoleSchema = z.object({
  role: ROLE_ENUM,
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(254).endsWith('@thapar.edu', 'College email (@thapar.edu) is required').optional(),
  rollNo: ROLL_NO,
  phone: PHONE,
  roomNo: optText(20),
  role: ROLE_ENUM.optional(),
  password: z.string().min(6).max(128).optional(),
});

const base64ImageRegex = /^data:image\/(jpeg|png|webp|jpg);base64,[A-Za-z0-9+/=]+$/;

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: PHONE,
  roomNo: optText(20),
  rollNo: ROLL_NO,
  avatarBase64: z.string()
    .max(MAX_AVATAR_CHARS, 'Profile picture is too large. Please use an image under 200 KB.')
    .regex(base64ImageRegex, 'Invalid image format. Only JPEG, PNG, and WEBP are allowed.')
    .optional().nullable(),
});

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).endsWith('@thapar.edu', 'College email (@thapar.edu) is required'),
  password: z.string().min(6).max(128),
  role: ROLE_ENUM.default('STUDENT'),
  hostelId: z.string().max(50).optional().nullable(),
  rollNo: ROLL_NO,
  phone: PHONE,
  roomNo: optText(20),
});

const audit = (actorId: string, action: string, entityId: string, oldValue: unknown, newValue: unknown) =>
  prisma.auditLog.create({
    data: { actorId, action, entity: 'User', entityId, oldValue: oldValue as any, newValue: newValue as any },
  }).catch((e) => console.error('[audit] failed to write log', e));

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

    // Roll number is what counter staff identify students by. Once set it can
    // only be changed by a warden, so nobody can impersonate another student.
    if (data.rollNo !== undefined) {
      const current = await prisma.user.findUnique({ where: { id: userId }, select: { rollNo: true } });
      const requested = data.rollNo || null;
      if (current?.rollNo && requested !== current.rollNo) {
        return res.status(403).json({ error: 'Your roll number cannot be changed. Ask your warden to update it.' });
      }
      if (!requested) delete data.rollNo; // don't clear an empty value
    }

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
    const { role, hostelId, page, limit, search } = listUsersSchema.parse(req.query);
    const skip = (page - 1) * limit;
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
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({ users, total, page, limit });
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
        // Accounts created by an admin are vouched for by that admin.
        emailVerified: true,
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
    const { hostelId: callerHostelId, role: callerRole, userId: callerId } = req.user!;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, hostelId: true, role: true, email: true },
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Same rule as the role control: a Mess Staff account's role is fixed.
    if (data.role !== undefined && targetUser.role === 'COUNTER_STAFF' && data.role !== 'COUNTER_STAFF') {
      return res.status(403).json({ error: "A Mess Staff account's role cannot be changed. Delete and recreate it instead." });
    }

    if (callerRole === 'SUPER_ADMIN') {
      // A hostel-bound role needs a hostel, otherwise the account would have
      // no hostel scope at all.
      if (data.role !== undefined && data.role !== 'SUPER_ADMIN' && !isStudentRole(data.role) && !targetUser.hostelId) {
        return res.status(400).json({ error: 'Assign this user to a hostel before giving them this role.' });
      }
    } else if (isHostelAdmin(callerRole)) {
      if (targetUser.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only a Super Admin can manage Super Admin accounts.' });
      }
      if (!callerHostelId || targetUser.hostelId !== callerHostelId) {
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
      // Turning someone into Mess Staff = adding Mess Staff, which Caretakers can't do.
      if (data.role === 'COUNTER_STAFF' && targetUser.role !== 'COUNTER_STAFF' && !canManageMessStaff(callerRole)) {
        return res.status(403).json({ error: 'Caretakers cannot add Mess Staff.' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
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

    if (data.role !== undefined && data.role !== targetUser.role) {
      audit(callerId, 'ROLE_CHANGE', id, { role: targetUser.role }, { role: data.role });
    }
    if (data.password) audit(callerId, 'PASSWORD_RESET', id, null, null);
    if (data.email !== undefined && data.email !== targetUser.email) {
      audit(callerId, 'EMAIL_CHANGE', id, { email: targetUser.email }, { email: data.email });
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = updateRoleSchema.parse(req.body);
    const { hostelId: callerHostelId, role: callerRole, userId: callerId } = req.user!;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { hostelId: true, role: true },
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Mess Staff (COUNTER_STAFF) are added independently and have a fixed role —
    // their role cannot be changed from the role control by anyone. To re-assign,
    // delete and recreate the account.
    if (targetUser.role === 'COUNTER_STAFF') {
      return res.status(403).json({ error: "A Mess Staff account's role cannot be changed. Delete and recreate it instead." });
    }

    // Hostel admins (Warden/Co-Warden/Caretaker) may only toggle students
    // between STUDENT and MESS_COMMITTEE, within their own hostel. They
    // cannot touch other admins or assign privileged roles.
    if (callerRole === 'SUPER_ADMIN') {
      if (role !== 'SUPER_ADMIN' && !isStudentRole(role) && !targetUser.hostelId) {
        return res.status(400).json({ error: 'Assign this user to a hostel before giving them this role.' });
      }
    } else if (isHostelAdmin(callerRole)) {
      if (!callerHostelId || targetUser.hostelId !== callerHostelId) {
        return res.status(403).json({ error: 'You can only manage users in your own hostel' });
      }
      if (targetUser.role === 'SUPER_ADMIN' || isHostelAdmin(targetUser.role)) {
        return res.status(403).json({ error: 'Only a Super Admin can manage wardens, co-wardens, and caretakers.' });
      }
      // The inline role control is only for toggling students ↔ mess committee.
      if (!isStudentRole(targetUser.role) || !isStudentRole(role)) {
        return res.status(403).json({ error: 'You can only switch student accounts between Student and Mess Committee.' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: { id: true, name: true, email: true, role: true, hostelId: true },
    });

    if (role !== targetUser.role) audit(callerId, 'ROLE_CHANGE', id, { role: targetUser.role }, { role });

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
      if (!callerHostelId || targetUser.hostelId !== callerHostelId) {
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
    audit(userId, 'USER_DELETE', id, { role: targetUser.role, hostelId: targetUser.hostelId }, null);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

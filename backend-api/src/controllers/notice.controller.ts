import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import prisma from '../db';

const createNoticeSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  targetRole: z.enum(['STUDENT', 'MESS_COMMITTEE', 'WARDEN_ADMIN', 'COUNTER_STAFF', 'SUPER_ADMIN']).nullable().optional(),
});

/**
 * GET /notices
 * Returns notices visible to the requesting user, newest first.
 * - targetRole=null notices are visible to everyone
 * - targetRole-specific notices are visible only to users with that role (or WARDEN_ADMIN/SUPER_ADMIN who can always see all)
 * Supports ?cursor=<id>&limit=<n> for pagination.
 */
export const listNotices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;
    const userRole = req.user!.role as Role;

    // Build visibility filter
    const roleFilter =
      userRole === 'WARDEN_ADMIN' || userRole === 'SUPER_ADMIN'
        ? {} // admins see everything
        : {
            OR: [
              { targetRole: null },       // public notices
              { targetRole: userRole },   // notices for my role
            ],
          };

    const notices = await prisma.notice.findMany({
      where: {
        ...roleFilter,
        ...(cursor ? { createdAt: { lt: (await prisma.notice.findUnique({ where: { id: cursor } }))?.createdAt } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // fetch one extra to determine hasMore
      include: {
        postedBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    const hasMore = notices.length > limit;
    const data = hasMore ? notices.slice(0, limit) : notices;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    res.json({ notices: data, nextCursor, hasMore });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /notices/latest-timestamp
 * Returns the createdAt of the most recent notice visible to this user.
 * Used by mobile clients for cheap polling to detect new notices.
 */
export const latestTimestamp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user!.role as Role;
    const roleFilter =
      userRole === 'WARDEN_ADMIN' || userRole === 'SUPER_ADMIN'
        ? {}
        : { OR: [{ targetRole: null }, { targetRole: userRole }] };

    const latest = await prisma.notice.findFirst({
      where: roleFilter,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    res.json({ latestTimestamp: latest?.createdAt?.toISOString() ?? null });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /notices
 * Create a new notice. Only MESS_COMMITTEE and WARDEN_ADMIN can create.
 */
export const createNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, body, targetRole } = createNoticeSchema.parse(req.body);
    const userId = req.user!.userId;

    const notice = await prisma.notice.create({
      data: {
        title,
        body,
        targetRole: targetRole ?? null,
        postedById: userId,
      },
      include: {
        postedBy: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json(notice);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /notices/:id
 * Delete a notice. WARDEN_ADMIN can delete any, MESS_COMMITTEE can only delete their own.
 */
export const deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;

    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    if (role !== 'WARDEN_ADMIN' && role !== 'SUPER_ADMIN' && notice.postedById !== userId) {
      return res.status(403).json({ error: 'You can only delete your own notices' });
    }

    await prisma.notice.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

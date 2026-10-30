import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as attendanceService from '../services/attendance.service';
import prisma from '../db';

const getRosterSchema = z.object({
  mealTypeId: z.string().min(1),
  date: z.string().datetime(),
});

export const getRoster = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mealTypeId, date } = getRosterSchema.parse(req.query);
    const { hostelId, role } = req.user!;

    // SUPER_ADMIN may optionally pass a hostelId query param to scope the view
    let effectiveHostelId = hostelId;
    if (role === 'SUPER_ADMIN') {
      const qHostelId = req.query.hostelId as string | undefined;
      if (qHostelId) {
        effectiveHostelId = qHostelId;
      } else {
        // Default to first hostel for SUPER_ADMIN if none specified
        const fallback = await prisma.hostel.findFirst({ orderBy: { name: 'asc' } });
        if (!fallback) return res.status(400).json({ error: 'No hostels found in the system' });
        effectiveHostelId = fallback.id;
      }
    }

    if (!effectiveHostelId) {
      return res.status(403).json({ error: 'Your account is not assigned to a hostel. Contact your administrator.' });
    }

    const d = new Date(date);
    const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const roster = await attendanceService.getRoster(effectiveHostelId, mealTypeId, normalizedDate);
    res.status(200).json({ success: true, roster });
  } catch (err) {
    next(err);
  }
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const GRACE_MIN = 60;

/**
 * Meals can only be marked served for TODAY (IST) and around the meal's
 * serving window. Without this, anyone with check-in access could "serve"
 * a student for every past/future day and drain their wallet.
 * Returns an error message, or null if serving is allowed right now.
 */
async function checkServableNow(mealTypeId: string, normalizedDate: Date): Promise<{ status: number; error: string } | null> {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const istToday = istNow.toISOString().slice(0, 10);
  if (normalizedDate.toISOString().slice(0, 10) !== istToday) {
    return { status: 400, error: "Students can only be checked in for today's meals." };
  }

  const mealType = await prisma.mealType.findUnique({
    where: { id: mealTypeId },
    select: { displayName: true, servingStart: true, servingEnd: true },
  });
  if (!mealType) return { status: 404, error: 'Meal type not found' };

  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const start = toMin(mealType.servingStart);
  const end = toMin(mealType.servingEnd);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null; // unusual config (crosses midnight): date check only
  const nowMin = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
  if (nowMin < start - GRACE_MIN || nowMin > end + GRACE_MIN) {
    return {
      status: 400,
      error: `${mealType.displayName} check-in is only open from ${mealType.servingStart} to ${mealType.servingEnd} (±${GRACE_MIN} min).`,
    };
  }
  return null;
}

const markServedSchema = z.object({
  studentId: z.string().min(1),
  mealTypeId: z.string().min(1),
  date: z.string().datetime(),
});

export const markServed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, mealTypeId, date } = markServedSchema.parse(req.body);
    const staffId = req.user!.userId;
    const { hostelId: staffHostelId, role } = req.user!;

    // Hostel guard: ensure the student belongs to the same hostel as the staff member
    if (role !== 'SUPER_ADMIN') {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { hostelId: true } });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (!staffHostelId || student.hostelId !== staffHostelId) {
        return res.status(403).json({ error: 'You can only serve students from your own hostel' });
      }
    }

    const d = new Date(date);
    const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    const notServable = await checkServableNow(mealTypeId, normalizedDate);
    if (notServable) return res.status(notServable.status).json({ error: notServable.error });

    const attendanceRecord = await attendanceService.markServed(studentId, mealTypeId, normalizedDate, staffId);
    
    const { booking, ...attendance } = attendanceRecord as any;
    
    res.status(200).json({ 
      success: true, 
      attendance,
      booking: booking ? {
        ...booking,
        mealType: booking.mealType ? { name: booking.mealType.displayName } : undefined
      } : undefined,
      student: booking?.student
    });
  } catch (err: any) {
    if (err.status === 409) {
      return res.status(200).json({ 
        success: true, 
        attendance: { result: 'DUPLICATE' }
      });
    }
    next(err);
  }
};

const overrideSchema = z.object({
  studentId: z.string().min(1),
  mealTypeId: z.string().min(1),
  date: z.string().datetime(),
  reason: z.string().trim().min(1).max(500),
});

export const overrideAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, mealTypeId, date, reason } = overrideSchema.parse(req.body);
    const staffId = req.user!.userId;
    const { hostelId: staffHostelId, role } = req.user!;

    // Hostel guard
    if (role !== 'SUPER_ADMIN') {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { hostelId: true } });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (!staffHostelId || student.hostelId !== staffHostelId) {
        return res.status(403).json({ error: 'You can only override attendance for students in your hostel' });
      }
    }

    const d = new Date(date);
    const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    const notServable = await checkServableNow(mealTypeId, normalizedDate);
    if (notServable) return res.status(notServable.status).json({ error: notServable.error });

    const attendanceRecord = await attendanceService.createOverride(studentId, mealTypeId, normalizedDate, staffId, reason);

    await prisma.auditLog.create({
      data: {
        actorId: staffId,
        action: 'MANUAL_ATTENDANCE_OVERRIDE',
        entity: 'Attendance',
        entityId: (attendanceRecord as any).id,
        newValue: { studentId, mealTypeId, date: normalizedDate.toISOString(), reason },
      },
    }).catch((e) => console.error('[audit] failed to write log', e));
    
    const { booking, ...attendance } = attendanceRecord as any;
    
    res.status(200).json({ 
      success: true, 
      attendance,
      booking: booking ? {
        ...booking,
        mealType: booking.mealType ? { name: booking.mealType.displayName } : undefined
      } : undefined,
      student: booking?.student
    });
  } catch (err) {
    next(err);
  }
};

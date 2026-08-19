import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bookingService from '../services/booking.service';
import prisma from '../db';
import { computeCutoffMoment } from '../utils/cutoff';

const getBookingsSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const toggleBookingSchema = z.object({
  mealTypeId: z.string().min(1),
  date: z.coerce.date(),
  status: z.enum(['OPTED_IN', 'OPTED_OUT']),
});

export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = getBookingsSchema.parse(req.query);
    const studentId = req.user!.userId;

    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    const normStart = new Date(Date.UTC(dStart.getUTCFullYear(), dStart.getUTCMonth(), dStart.getUTCDate()));
    const normEnd = new Date(Date.UTC(dEnd.getUTCFullYear(), dEnd.getUTCMonth(), dEnd.getUTCDate(), 23, 59, 59, 999));

    const bookings = await bookingService.getUserBookings(studentId, normStart, normEnd);
    res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
};

export const toggleBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mealTypeId, date, status } = toggleBookingSchema.parse(req.body);
    const studentId = req.user!.userId;

    const d = new Date(date);
    const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    const booking = await bookingService.toggleBooking(studentId, mealTypeId, normalizedDate, status);
    res.status(200).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

const headcountSchema = z.object({
  date: z.coerce.date(),
});

export const getHeadcount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = headcountSchema.parse(req.query);
    const targetDate = new Date(date);
    const dayStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

    // Scope to the caller's hostel (SUPER_ADMIN can pass ?hostelId= override)
    const { hostelId: callerHostelId, role } = req.user!;
    let effectiveHostelId = callerHostelId;
    if (role === 'SUPER_ADMIN') {
      const qHostelId = req.query.hostelId as string | undefined;
      if (qHostelId) {
        effectiveHostelId = qHostelId;
      } else {
        const fallback = await prisma.hostel.findFirst({ orderBy: { name: 'asc' } });
        effectiveHostelId = fallback?.id ?? null;
      }
    }

    const mealTypes = await prisma.mealType.findMany({ orderBy: { servingStart: 'asc' } });
    const now = new Date();

    // Total students in the hostel — the baseline for implicit opt-in
    const totalStudents = effectiveHostelId
      ? await prisma.user.count({ where: { hostelId: effectiveHostelId, role: { in: ['STUDENT', 'MESS_COMMITTEE'] } } })
      : 0;

    const results = await Promise.all(
      mealTypes.map(async (mt) => {
        // Count students who explicitly opted OUT — everyone else is implicitly opted in
        const optedOutCount = effectiveHostelId
          ? await prisma.booking.count({
              where: {
                mealTypeId: mt.id,
                date: { gte: dayStart, lte: dayEnd },
                status: 'OPTED_OUT',
                student: { hostelId: effectiveHostelId },
              },
            })
          : 0;

        const count = totalStudents - optedOutCount;
        const cutoffMoment = computeCutoffMoment(mt, targetDate);
        return {
          mealTypeId: mt.id,
          mealTypeName: mt.displayName,
          count,
          totalStudents,
          optedOutCount,
          locked: now > cutoffMoment,
          cutoffAt: cutoffMoment.toISOString(),
        };
      })
    );

    res.status(200).json({ date: targetDate.toISOString(), headcounts: results });
  } catch (err) {
    next(err);
  }
};

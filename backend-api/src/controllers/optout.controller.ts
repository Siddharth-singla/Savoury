import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { computeCutoffMoment } from '../utils/cutoff';

function normalizeToUTCDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ----------------------------------------------------------------
// GET /api/opt-outs?startDate=&endDate=
// Returns all opt-out records for the authenticated student in range
// ----------------------------------------------------------------

const getRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const getOptOuts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.userId;
    const { startDate, endDate } = getRangeSchema.parse(req.query);

    const normStart = normalizeToUTCDate(startDate);
    const normEnd = normalizeToUTCDate(endDate);

    const optOuts = await prisma.mealOptOut.findMany({
      where: {
        studentId,
        date: { gte: normStart, lte: normEnd },
      },
      orderBy: { date: 'asc' },
    });

    res.status(200).json({ success: true, optOuts });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/opt-outs  body: { startDate, endDate }
// Opts out all eligible meals in [startDate, endDate] that are before cutoff
// Uses high-performance batch DB queries to avoid connection timeouts.
// ----------------------------------------------------------------

const setOptOutsSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const setOptOuts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.userId;
    const { startDate, endDate } = setOptOutsSchema.parse(req.body);

    const normStart = normalizeToUTCDate(startDate);
    const normEnd = normalizeToUTCDate(endDate);

    if (normEnd < normStart) {
      return res.status(400).json({ error: 'End date must be on or after start date.' });
    }

    // 1. Fetch meal types and existing bookings for the entire range in 2 queries
    const [mealTypes, existingBookings] = await Promise.all([
      prisma.mealType.findMany({ orderBy: { servingStart: 'asc' } }),
      prisma.booking.findMany({
        where: {
          studentId,
          date: { gte: normStart, lte: normEnd },
        },
      }),
    ]);

    // Map existing bookings by "mealTypeId_YYYY-MM-DD"
    const bookingMap = new Map<string, (typeof existingBookings)[0]>();
    for (const b of existingBookings) {
      const dateKey = formatDateKey(b.date);
      bookingMap.set(`${b.mealTypeId}_${dateKey}`, b);
    }

    const now = new Date();
    const daysToOptOut: Date[] = [];
    const bookingIdsToUpdate: string[] = [];
    const bookingsToCreate: { studentId: string; mealTypeId: string; date: Date; status: 'OPTED_OUT' }[] = [];
    let updatedMealsCount = 0;
    let skippedClosedMealsCount = 0;

    const cursor = new Date(normStart);
    while (cursor <= normEnd) {
      const dayDate = new Date(cursor);
      const dateKey = formatDateKey(dayDate);
      let dayHasEligibleMeal = false;

      for (const mt of mealTypes) {
        const cutoffMoment = computeCutoffMoment(mt, dayDate);
        const isCutoffPassed = now.getTime() > cutoffMoment.getTime();
        const existing = bookingMap.get(`${mt.id}_${dateKey}`);

        const isLocked = isCutoffPassed || !!existing?.lockedAt || existing?.status === 'LOCKED';

        if (isLocked) {
          skippedClosedMealsCount++;
        } else {
          if (existing) {
            bookingIdsToUpdate.push(existing.id);
          } else {
            bookingsToCreate.push({
              studentId,
              mealTypeId: mt.id,
              date: dayDate,
              status: 'OPTED_OUT',
            });
          }
          updatedMealsCount++;
          dayHasEligibleMeal = true;
        }
      }

      if (dayHasEligibleMeal) {
        daysToOptOut.push(dayDate);
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (updatedMealsCount === 0 && skippedClosedMealsCount > 0) {
      return res.status(400).json({
        error: 'All meals for the selected dates have already passed their cutoff time and cannot be opted out.',
      });
    }

    if (daysToOptOut.length === 0) {
      return res.status(400).json({
        error: 'No open meals available to opt out in the selected range.',
      });
    }

    // 2. Execute batch updates and creations in parallel transactions
    const dbOperations: any[] = [];

    if (bookingIdsToUpdate.length > 0) {
      dbOperations.push(
        prisma.booking.updateMany({
          where: { id: { in: bookingIdsToUpdate } },
          data: { status: 'OPTED_OUT' },
        })
      );
    }

    if (bookingsToCreate.length > 0) {
      dbOperations.push(
        prisma.booking.createMany({
          data: bookingsToCreate,
          skipDuplicates: true,
        })
      );
    }

    if (daysToOptOut.length > 0) {
      dbOperations.push(
        prisma.mealOptOut.createMany({
          data: daysToOptOut.map((d) => ({ studentId, date: d })),
          skipDuplicates: true,
        })
      );
    }

    await prisma.$transaction(dbOperations);

    res.status(201).json({
      success: true,
      count: daysToOptOut.length,
      mealsOptedOut: updatedMealsCount,
      skippedClosedMeals: skippedClosedMealsCount,
      dates: daysToOptOut.map(formatDateKey),
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// DELETE /api/opt-outs/:date  (date in YYYY-MM-DD format)
// Re-opts-in all open meals on that date that are before cutoff
// ----------------------------------------------------------------

export const removeOptOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.userId;
    const rawDate = req.params.date;

    const parsed = new Date(rawDate + 'T00:00:00.000Z');
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    const targetDate = normalizeToUTCDate(parsed);
    const dateKey = formatDateKey(targetDate);

    const [mealTypes, existingBookings] = await Promise.all([
      prisma.mealType.findMany(),
      prisma.booking.findMany({
        where: { studentId, date: targetDate },
      }),
    ]);

    const bookingMap = new Map<string, (typeof existingBookings)[0]>();
    for (const b of existingBookings) {
      bookingMap.set(b.mealTypeId, b);
    }

    const now = new Date();
    const bookingIdsToUpdate: string[] = [];
    const bookingsToCreate: { studentId: string; mealTypeId: string; date: Date; status: 'OPTED_IN' }[] = [];
    let reOptedInCount = 0;

    for (const mt of mealTypes) {
      const cutoffMoment = computeCutoffMoment(mt, targetDate);
      const isCutoffPassed = now.getTime() > cutoffMoment.getTime();
      const existing = bookingMap.get(mt.id);

      const isLocked = isCutoffPassed || !!existing?.lockedAt || existing?.status === 'LOCKED';

      if (!isLocked) {
        if (existing) {
          bookingIdsToUpdate.push(existing.id);
        } else {
          bookingsToCreate.push({
            studentId,
            mealTypeId: mt.id,
            date: targetDate,
            status: 'OPTED_IN',
          });
        }
        reOptedInCount++;
      }
    }

    const dbOperations: any[] = [];
    if (bookingIdsToUpdate.length > 0) {
      dbOperations.push(
        prisma.booking.updateMany({
          where: { id: { in: bookingIdsToUpdate } },
          data: { status: 'OPTED_IN' },
        })
      );
    }
    if (bookingsToCreate.length > 0) {
      dbOperations.push(
        prisma.booking.createMany({
          data: bookingsToCreate,
          skipDuplicates: true,
        })
      );
    }
    dbOperations.push(
      prisma.mealOptOut.deleteMany({
        where: { studentId, date: targetDate },
      })
    );

    await prisma.$transaction(dbOperations);

    res.status(200).json({ success: true, reOptedInMeals: reOptedInCount });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// DELETE /api/opt-outs  body: { startDate, endDate }
// Re-opts-in all open meals across a date range in batch
// ----------------------------------------------------------------

const removeOptOutRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const removeOptOutRange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.userId;
    const { startDate, endDate } = removeOptOutRangeSchema.parse(req.body);

    const normStart = normalizeToUTCDate(startDate);
    const normEnd = normalizeToUTCDate(endDate);

    if (normEnd < normStart) {
      return res.status(400).json({ error: 'End date must be on or after start date.' });
    }

    const [mealTypes, existingBookings] = await Promise.all([
      prisma.mealType.findMany(),
      prisma.booking.findMany({
        where: {
          studentId,
          date: { gte: normStart, lte: normEnd },
        },
      }),
    ]);

    const bookingMap = new Map<string, (typeof existingBookings)[0]>();
    for (const b of existingBookings) {
      bookingMap.set(`${b.mealTypeId}_${formatDateKey(b.date)}`, b);
    }

    const now = new Date();
    let reOptedInCount = 0;
    const processedDates: string[] = [];
    const bookingIdsToUpdate: string[] = [];
    const bookingsToCreate: { studentId: string; mealTypeId: string; date: Date; status: 'OPTED_IN' }[] = [];

    const cursor = new Date(normStart);
    while (cursor <= normEnd) {
      const targetDate = new Date(cursor);
      const dateKey = formatDateKey(targetDate);

      for (const mt of mealTypes) {
        const cutoffMoment = computeCutoffMoment(mt, targetDate);
        const isCutoffPassed = now.getTime() > cutoffMoment.getTime();
        const existing = bookingMap.get(`${mt.id}_${dateKey}`);

        const isLocked = isCutoffPassed || !!existing?.lockedAt || existing?.status === 'LOCKED';

        if (!isLocked) {
          if (existing) {
            bookingIdsToUpdate.push(existing.id);
          } else {
            bookingsToCreate.push({
              studentId,
              mealTypeId: mt.id,
              date: targetDate,
              status: 'OPTED_IN',
            });
          }
          reOptedInCount++;
        }
      }

      processedDates.push(dateKey);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const dbOperations: any[] = [];
    if (bookingIdsToUpdate.length > 0) {
      dbOperations.push(
        prisma.booking.updateMany({
          where: { id: { in: bookingIdsToUpdate } },
          data: { status: 'OPTED_IN' },
        })
      );
    }
    if (bookingsToCreate.length > 0) {
      dbOperations.push(
        prisma.booking.createMany({
          data: bookingsToCreate,
          skipDuplicates: true,
        })
      );
    }
    dbOperations.push(
      prisma.mealOptOut.deleteMany({
        where: {
          studentId,
          date: { gte: normStart, lte: normEnd },
        },
      })
    );

    await prisma.$transaction(dbOperations);

    res.status(200).json({
      success: true,
      reOptedInMeals: reOptedInCount,
      daysReOptedIn: processedDates.length,
      dates: processedDates,
    });
  } catch (err) {
    next(err);
  }
};

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db';

const SEMESTER_END_KEY = 'semester_end_date';

// ----------------------------------------------------------------
// GET /api/config/semester-end  — any authenticated user
// ----------------------------------------------------------------

export const getSemesterEnd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    let semesterEndDate: string | null = null;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { hostelId: true },
      });

      if (user?.hostelId) {
        const feePlan = await prisma.hostelFeePlan.findFirst({
          where: { hostelId: user.hostelId, semesterEndDate: { not: null } },
          orderBy: { createdAt: 'desc' },
        });
        if (feePlan?.semesterEndDate) {
          semesterEndDate = feePlan.semesterEndDate.toISOString().split('T')[0];
        }
      }
    }

    if (!semesterEndDate) {
      const config = await prisma.systemConfig.findUnique({
        where: { key: SEMESTER_END_KEY },
      });
      semesterEndDate = config?.value ?? null;
    }

    res.status(200).json({
      success: true,
      semesterEndDate,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PUT /api/config/semester-end  — SUPER_ADMIN only
// body: { date: "YYYY-MM-DD" }
// ----------------------------------------------------------------

const setSemesterEndSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export const setSemesterEnd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = setSemesterEndSchema.parse(req.body);

    // Validate it's actually a valid calendar date
    const parsed = new Date(date + 'T00:00:00.000Z');
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid date value.' });
    }

    const config = await prisma.systemConfig.upsert({
      where:  { key: SEMESTER_END_KEY },
      update: { value: date },
      create: { key: SEMESTER_END_KEY, value: date },
    });

    res.status(200).json({ success: true, semesterEndDate: config.value });
  } catch (err) {
    next(err);
  }
};

import prisma from '../db';
import { computeCutoffMoment } from '../utils/cutoff';

export const getUserBookings = async (studentId: string, startDate: Date, endDate: Date) => {
  return prisma.booking.findMany({
    where: {
      studentId,
      date: { gte: startDate, lte: endDate },
    },
    include: { mealType: true },
    orderBy: { date: 'asc' },
  });
};

export const toggleBooking = async (
  studentId: string,
  mealTypeId: string,
  date: Date,
  targetStatus: 'OPTED_IN' | 'OPTED_OUT'
) => {
  const mealType = await prisma.mealType.findUnique({ where: { id: mealTypeId } });

  if (!mealType) {
    const error = new Error('MealType not found');
    (error as any).status = 404;
    throw error;
  }

  const cutoffMoment = computeCutoffMoment(mealType, date);
  if (Date.now() > cutoffMoment.getTime()) {
    const error = new Error('Cutoff time has passed for this meal');
    (error as any).status = 400;
    throw error;
  }

  const existingBooking = await prisma.booking.findUnique({
    where: {
      studentId_mealTypeId_date: { studentId, mealTypeId, date },
    },
  });

  if (existingBooking?.lockedAt) {
    const error = new Error('Booking is already locked by the system');
    (error as any).status = 400;
    throw error;
  }

  return prisma.booking.upsert({
    where: {
      studentId_mealTypeId_date: { studentId, mealTypeId, date },
    },
    update: { status: targetStatus },
    create: { studentId, mealTypeId, date, status: targetStatus },
  });
};

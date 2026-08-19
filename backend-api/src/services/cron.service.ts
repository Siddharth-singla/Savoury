import cron from 'node-cron';
import prisma from '../db';
import { computeCutoffMoment } from '../utils/cutoff';

export const initCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const mealTypes = await prisma.mealType.findMany();
      const now = new Date();
      // Force "today" to be UTC midnight
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

      for (const date of [today, tomorrow]) {
        for (const mt of mealTypes) {
          const cutoff = computeCutoffMoment(mt, date);
          if (now.getTime() > cutoff.getTime()) {
            await prisma.booking.updateMany({
              where: {
                mealTypeId: mt.id,
                date: date,
                lockedAt: null,
                status: 'OPTED_IN',
              },
              data: {
                lockedAt: now,
                status: 'LOCKED',
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('[Cron] booking-locker error:', err);
    }
  });
};

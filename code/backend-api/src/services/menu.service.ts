import prisma from '../db';
import { Prisma } from '@prisma/client';

export const fetchMenus = async (messId: string, startDate: Date, endDate: Date) => {
  const mealTypesRaw = await prisma.mealType.findMany();

  const menus = await prisma.menu.findMany({
    where: {
      messId,
      date: { gte: startDate, lte: endDate },
    },
    include: { mealType: true },
  });

  // Alias displayName→name and defaultCutoffTime→cutoffTime so that
  // mobile and web clients (which use .name / .cutoffTime) work correctly.
  const mealTypes = mealTypesRaw.map((mt) => ({
    ...mt,
    name: mt.displayName,
    cutoffTime: mt.defaultCutoffTime,
  }));

  return { mealTypes, menus };
};

export interface UpsertMenuData {
  messId: string;
  mealTypeId: string;
  date: Date;
  items: Prisma.InputJsonValue;
}

export const upsertMenus = async (menusToUpsert: UpsertMenuData[]) => {
  const results: Prisma.MenuGetPayload<{}>[] = [];

  // A full week is ~21 sequential round trips to the DB; Prisma's default 5s
  // interactive-transaction timeout is too tight for that over the network.
  await prisma.$transaction(async (tx) => {
    for (const menu of menusToUpsert) {
      const upserted = await tx.menu.upsert({
        where: {
          messId_mealTypeId_date: {
            messId: menu.messId,
            mealTypeId: menu.mealTypeId,
            date: menu.date,
          },
        },
        update: { items: menu.items },
        create: {
          messId: menu.messId,
          mealTypeId: menu.mealTypeId,
          date: menu.date,
          items: menu.items,
        },
      });
      results.push(upserted);
    }
  }, { maxWait: 10_000, timeout: 30_000 });

  return results;
};

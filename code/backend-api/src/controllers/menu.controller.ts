import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import * as menuService from '../services/menu.service';
import prisma from '../db';

const getMenuSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const upsertMenuSchema = z.object({
  menus: z.array(
    z.object({
      mealTypeId: z.string().min(1),
      date: z.coerce.date(),
      items: z.record(z.any()),
    })
  ),
});

/**
 * Resolve the mess for a given request, scoped to the caller's hostel.
 * SUPER_ADMIN can optionally pass ?hostelId= to scope to a specific hostel;
 * if not provided, defaults to the first hostel alphabetically.
 */
async function resolveMessForRequest(req: Request): Promise<{ id: string } | null> {
  const { hostelId, role } = req.user!;

  if (role === 'SUPER_ADMIN') {
    const targetHostelId = (req.query.hostelId as string) || (req.body?.hostelId as string) || null;
    if (targetHostelId) {
      return prisma.mess.findUnique({ where: { hostelId: targetHostelId } });
    }
    return prisma.mess.findFirst({ orderBy: { name: 'asc' } });
  }

  if (!hostelId) return null;
  return prisma.mess.findUnique({ where: { hostelId } });
}

export const getMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = getMenuSchema.parse(req.query);

    const mess = await resolveMessForRequest(req);
    if (!mess) {
      return res.status(404).json({ error: 'No mess found for your hostel. Contact your administrator.' });
    }

    const result = await menuService.fetchMenus(mess.id, startDate, endDate);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const updateMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { menus } = upsertMenuSchema.parse(req.body);

    const mess = await resolveMessForRequest(req);
    if (!mess) {
      return res.status(404).json({ error: 'No mess found for your hostel. Contact your administrator.' });
    }

    const formattedMenus = menus.map((m: { mealTypeId: string; date: Date; items: Record<string, unknown> }) => ({
      messId: mess.id,
      mealTypeId: m.mealTypeId,
      date: m.date,
      items: m.items as Prisma.InputJsonValue,
    }));

    const result = await menuService.upsertMenus(formattedMenus);
    res.status(200).json({ success: true, menus: result });
  } catch (err) {
    next(err);
  }
};

export const getMealTypes = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const mealTypes = await prisma.mealType.findMany({ orderBy: { slot: 'asc' } });
    const mapped = mealTypes.map(mt => ({
      ...mt,
      name: mt.displayName,
      cutoffTime: mt.defaultCutoffTime,
    }));
    res.status(200).json({ mealTypes: mapped });
  } catch (err) {
    next(err);
  }
};

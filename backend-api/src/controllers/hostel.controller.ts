import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db';

const hostelSchema = z.object({
  name: z.string().min(2),
});

export const listHostels = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hostels = await prisma.hostel.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json({ hostels });
  } catch (err) {
    next(err);
  }
};

export const createHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = hostelSchema.parse(req.body);

    // Create hostel and automatically create a Mess for it
    const hostel = await prisma.hostel.create({
      data: {
        name,
        mess: {
          create: {
            name: `Sodexo`,
          },
        },
      },
    });

    res.status(201).json({ success: true, hostel });
  } catch (err) {
    next(err);
  }
};

export const updateHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = hostelSchema.parse(req.body);

    const hostel = await prisma.hostel.update({
      where: { id },
      data: { name },
    });

    res.status(200).json({ success: true, hostel });
  } catch (err) {
    next(err);
  }
};

export const deleteHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Prisma will cascade delete Messes, Users (if setup correctly), etc. 
    // Wait, let's just delete the hostel and rely on cascades or delete related records if needed.
    // Given Prisma relations in this project, Mess, Users, FeePlans will cascade.
    await prisma.hostel.delete({ where: { id } });

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

const feePlanSchema = z.object({
  semesterLabel: z.string().min(1),
  totalFee: z.number().positive(),
});

export const setFeePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { semesterLabel, totalFee } = feePlanSchema.parse(req.body);

    const feePlan = await prisma.hostelFeePlan.upsert({
      where: {
        hostelId_semesterLabel: {
          hostelId: id,
          semesterLabel,
        }
      },
      update: {
        totalFee,
      },
      create: {
        hostelId: id,
        semesterLabel,
        totalFee,
      }
    });

    res.status(200).json({ success: true, feePlan });
  } catch (err) {
    next(err);
  }
};

export const listFeePlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feePlans = await prisma.hostelFeePlan.findMany({
      include: { hostel: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, feePlans });
  } catch (err) {
    next(err);
  }
};

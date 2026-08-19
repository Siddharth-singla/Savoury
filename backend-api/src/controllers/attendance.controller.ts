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
    if (role !== 'SUPER_ADMIN' && staffHostelId) {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { hostelId: true } });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (student.hostelId !== staffHostelId) {
        return res.status(403).json({ error: 'You can only serve students from your own hostel' });
      }
    }

    const d = new Date(date);
    const normalizedDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

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
  reason: z.string().min(1),
});

export const overrideAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, mealTypeId, date, reason } = overrideSchema.parse(req.body);
    const staffId = req.user!.userId;
    const { hostelId: staffHostelId, role } = req.user!;

    // Hostel guard
    if (role !== 'SUPER_ADMIN' && staffHostelId) {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { hostelId: true } });
      if (!student) return res.status(404).json({ error: 'Student not found' });
      if (student.hostelId !== staffHostelId) {
        return res.status(403).json({ error: 'You can only override attendance for students in your hostel' });
      }
    }

    const attendanceRecord = await attendanceService.createOverride(studentId, mealTypeId, new Date(date), staffId, reason);
    
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

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import prisma from '../db';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  hostelId: z.string().optional(),
  rollNo: z.string().regex(/^\d{10}$/, 'Roll Number must be exactly 10 digits').optional(),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional(),
});

/**
 * GET /auth/setup-status
 * Returns whether initial SUPER_ADMIN setup is needed.
 * Used by the web app to show Setup vs Login page.
 */
export const checkSetupStatus = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const adminExists = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    res.status(200).json({ setupRequired: !adminExists });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/setup
 * One-time endpoint: create the first SUPER_ADMIN.
 * Disabled automatically once any SUPER_ADMIN exists.
 */
export const setupSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const result = await authService.registerSuperAdmin(name, email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.registerUser(data as any);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginUser(data.email, data.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

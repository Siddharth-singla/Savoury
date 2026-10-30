import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import prisma from '../db';
import { verifyEmailToken } from '../services/verification.service';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).endsWith('@thapar.edu', 'College email (@thapar.edu) is required'),
  password: z.string().min(6).max(128),
  hostelId: z.string().max(50).optional(),
  rollNo: z.string().trim().max(20, 'Roll Number must be at most 20 characters').regex(/^[A-Za-z0-9-]*$/, 'Roll Number may only contain letters, digits and dashes').optional(),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional(),
  roomNo: z.string().trim().max(20).optional(),
});

const setupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).endsWith('@thapar.edu', 'College email (@thapar.edu) is required'),
  password: z.string().min(8).max(128),
  setupToken: z.string().min(1, 'Setup code is required').max(256),
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
    const { name, email, password, setupToken } = setupSchema.parse(req.body);
    const result = await authService.registerSuperAdmin(name, email, password, setupToken);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const loginSchema = z.object({
  email: z.string().trim().email().max(254).endsWith('@thapar.edu', 'College email (@thapar.edu) is required'),
  password: z.string().min(1).max(128),
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

const verifyPage = (ok: boolean) => {
  const title = ok ? 'Email verified' : 'Link invalid or expired';
  const msg = ok
    ? 'Your Savoury account is active. You can now log in from the app.'
    : 'This verification link is invalid or has expired. Log in from the app and we will email you a new link.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Savoury</title></head>
<body style="margin:0;background:#f5f0eb;font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:16px;padding:36px 32px;max-width:420px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.06)">
<div style="font-size:44px">${ok ? '&#9989;' : '&#9888;&#65039;'}</div>
<h1 style="color:#2d1b0e;font-size:22px">${title}</h1>
<p style="color:#5c4a38;line-height:1.5">${msg}</p></div></body></html>`;
};

/**
 * GET /auth/verify-email?token=...
 * Opened from the link in the verification email; returns a small HTML page.
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const ok = await verifyEmailToken(token);
    res.status(ok ? 200 : 400).type('html').send(verifyPage(ok));
  } catch (err) {
    next(err);
  }
};

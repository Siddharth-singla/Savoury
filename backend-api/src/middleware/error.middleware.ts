import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`),
    });
  }

  // Handle Prisma unique constraint violations globally
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this data already exists.' });
  }

  if (err.status && err.message) {
    return res.status(err.status as number).json({ error: err.message as string });
  }

  console.error('[Unhandled Error]', err);
  return res.status(500).json({ error: 'Internal Server Error' });
};

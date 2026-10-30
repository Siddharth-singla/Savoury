import { Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { verifyToken, passwordFingerprint } from '../utils/token';
import { isStudentRole } from '../constants/roles';

/**
 * Verifies the JWT, then loads the user's CURRENT role and hostel from the
 * database. The token only proves identity; it is never trusted for
 * permissions. This means:
 *  - deleted users are locked out immediately,
 *  - role / hostel changes take effect on the next request,
 *  - changing a password invalidates all existing sessions (fingerprint check).
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  let payload;
  try {
    payload = verifyToken(authHeader.slice(7));
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, hostelId: true, passwordHash: true },
    });
    if (!user || !payload.pv || payload.pv !== passwordFingerprint(user.passwordHash)) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    // Staff roles are always hostel-scoped. A staff account without a hostel
    // would otherwise slip past every "same hostel" check, so block it.
    if (user.role !== 'SUPER_ADMIN' && !isStudentRole(user.role) && !user.hostelId) {
      return res.status(403).json({ error: 'Your account is not assigned to a hostel. Contact your administrator.' });
    }

    req.user = { userId: user.id, role: user.role, hostelId: user.hostelId };
    next();
  } catch (err) {
    next(err);
  }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const KNOWN_WEAK_SECRETS = new Set(['dev_jwt_secret_please_set_in_env', 'secret', 'changeme']);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}
if (KNOWN_WEAK_SECRETS.has(JWT_SECRET)) {
  throw new Error('FATAL: JWT_SECRET is a known default value. Set a long random secret.');
}
if (JWT_SECRET.length < 32) {
  console.warn('[security] JWT_SECRET is shorter than 32 characters. Use a long random value.');
}

export const TOKEN_TTL = '7d';

/**
 * Short fingerprint of the user's password hash. It is embedded in the JWT and
 * re-checked on every request, so changing a password logs out every existing
 * session for that account. The bcrypt hash is salted, so this reveals nothing.
 */
export const passwordFingerprint = (passwordHash: string): string =>
  crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);

export interface TokenPayload {
  userId: string;
  role: string;
  hostelId: string | null;
  pv: string;
}

export const signToken = (user: { id: string; role: string; hostelId: string | null; passwordHash: string }) =>
  jwt.sign(
    { userId: user.id, role: user.role, hostelId: user.hostelId, pv: passwordFingerprint(user.passwordHash) },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL, algorithm: 'HS256' }
  );

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;

import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_taller_secret_v1').digest('hex');

export const SESSION_COOKIE_NAME = 'taller_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

export interface SessionPayload {
  userId: string;
  email: string;
  nombre: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  adminUser?: SessionPayload;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function signSessionToken(user: { id: string; email: string; nombre: string }): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  }

  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies[SESSION_COOKIE_NAME];
  }

  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: 'Sesión no válida o expirada. Iniciá sesión para continuar.' });
    return;
  }

  req.adminUser = session;
  next();
}

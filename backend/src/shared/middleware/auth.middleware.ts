import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  type: 'access';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token');
  }
  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== 'access') throw new Error('wrong token type');
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * صلاحيات وفق مبدأ أقل صلاحية: admin يفعل كل شيء، operator يشغّل/يوقف
 * ويشغّل عمليات السحب لكن لا يحذف حسابات، viewer قراءة فقط.
 */
export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!allowed.includes(req.user.role)) {
      throw new ForbiddenError(`This action requires one of the following roles: ${allowed.join(', ')}`);
    }
    next();
  };
}

/** يستخدمها socket.ts للتحقق من التوكن أثناء المصافحة (handshake) */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (payload.type !== 'access') throw new Error('wrong token type');
  return payload;
}

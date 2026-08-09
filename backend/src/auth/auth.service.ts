import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../shared/utils/errors.js';
import { recordAuditLog } from '../shared/services/auditLog.service.js';
import type { UserRole } from '../shared/middleware/auth.middleware.js';

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: UserRole };
}

function signAccessToken(user: { id: string; email: string; role: UserRole }) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

function signRefreshToken(user: { id: string }) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export async function login(
  email: string,
  password: string,
  meta: { ipAddress?: string; userAgent?: string },
): Promise<AuthResult> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !user.isActive || !passwordMatches) {
    await recordAuditLog({
      action: 'auth.login_failed',
      entityType: 'user',
      userEmail: email,
      details: { reason: !user ? 'no_such_user' : !user.isActive ? 'inactive' : 'bad_password' },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  await recordAuditLog({
    action: 'auth.login_success',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    userEmail: user.email,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const publicUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  return {
    accessToken: signAccessToken(publicUser),
    refreshToken: signRefreshToken(publicUser),
    user: publicUser,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  let payload: { sub: string; type: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string; type: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  if (payload.type !== 'refresh') throw new UnauthorizedError('Invalid token type');

  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

  return { accessToken: signAccessToken({ id: user.id, email: user.email, role: user.role }) };
}

export async function getCurrentUser(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new UnauthorizedError('User not found');
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

import type { Request, Response } from 'express';
import { asyncHandler } from '../shared/utils/asyncHandler.js';
import * as authService from './auth.service.js';
import { UnauthorizedError } from '../shared/utils/errors.js';

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: result });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json({ success: true, data: result });
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const user = await authService.getCurrentUser(req.user.sub);
  res.json({ success: true, data: user });
});

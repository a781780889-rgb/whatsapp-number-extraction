import { Router } from 'express';
import { validate } from '../shared/middleware/validate.middleware.js';
import { authRateLimiter } from '../shared/middleware/rateLimit.middleware.js';
import { requireAuth } from '../shared/middleware/auth.middleware.js';
import { loginSchema, refreshSchema } from './auth.schema.js';
import { loginHandler, refreshHandler, meHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', authRateLimiter, validate({ body: loginSchema }), loginHandler);
authRouter.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), refreshHandler);
authRouter.get('/me', requireAuth, meHandler);

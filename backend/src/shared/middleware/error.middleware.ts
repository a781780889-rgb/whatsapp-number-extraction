import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { childLogger } from '../../config/logger.js';
import { systemLog } from '../services/systemLog.service.js';

const log = childLogger('error-handler');

/**
 * معالج أخطاء مركزي واحد: أي خطأ في أي قسم يُحتوى هنا ولا يُسقط الخادم أبداً
 * ("يمنع توقف النظام بسبب خطأ في قسم واحد"). يفرّق بين أخطاء تشغيلية متوقعة
 * (AppError/Zod) وأخطاء برمجية غير متوقعة، ويُخفي تفاصيل الأخيرة عن العميل.
 */
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.flatten() },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      log.error({ err, path: req.path }, err.message);
      systemLog.error(err.message, { module: 'api', context: { path: req.path } });
    }
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // خطأ غير متوقع تماماً — نسجّله كاملاً في السيرفر لكن لا نكشف تفاصيله للعميل
  const error = err as Error;
  log.error({ err: error, path: req.path }, 'Unhandled error');
  systemLog.error(`Unhandled error on ${req.method} ${req.path}: ${error.message}`, { module: 'api' });

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` },
  });
}

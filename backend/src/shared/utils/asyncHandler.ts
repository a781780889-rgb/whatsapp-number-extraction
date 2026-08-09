import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * يمنع الحاجة لكتابة try/catch في كل controller — أي خطأ أو Promise مرفوض
 * يُمرَّر تلقائياً إلى error.middleware بدل أن يُسقط الطلب أو يُعلّق الخادم.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

import { Router } from 'express';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.middleware.js';
import { validate } from '../../../shared/middleware/validate.middleware.js';
import * as accountCtrl from '../controllers/account.controller.js';
import * as extractionCtrl from '../controllers/extraction.controller.js';
import * as numbersCtrl from '../controllers/numbers.controller.js';
import * as statsCtrl from '../controllers/stats.controller.js';
import {
  createAccountSchema,
  updateAccountSchema,
  accountIdParamSchema,
  numbersQuerySchema,
  logsQuerySchema,
} from '../validators/schemas.js';

export const numberExtractionRouter = Router();

// كل مسارات هذا القسم تتطلب مصادقة — "منع الوصول غير المصرح به إلى أي قسم"
numberExtractionRouter.use(requireAuth);

/* ---- الحسابات (إضافة/حذف/تعديل/تشغيل/إيقاف) ---- */
numberExtractionRouter.get('/accounts', accountCtrl.listAccountsHandler);
numberExtractionRouter.get(
  '/accounts/:id',
  validate({ params: accountIdParamSchema }),
  accountCtrl.getAccountHandler,
);
numberExtractionRouter.post(
  '/accounts',
  requireRole('admin', 'operator'),
  validate({ body: createAccountSchema }),
  accountCtrl.createAccountHandler,
);
numberExtractionRouter.patch(
  '/accounts/:id',
  requireRole('admin', 'operator'),
  validate({ params: accountIdParamSchema, body: updateAccountSchema }),
  accountCtrl.updateAccountHandler,
);
numberExtractionRouter.delete(
  '/accounts/:id',
  requireRole('admin'),
  validate({ params: accountIdParamSchema }),
  accountCtrl.deleteAccountHandler,
);
numberExtractionRouter.post(
  '/accounts/:id/start',
  requireRole('admin', 'operator'),
  validate({ params: accountIdParamSchema }),
  accountCtrl.startAccountHandler,
);
numberExtractionRouter.post(
  '/accounts/:id/stop',
  requireRole('admin', 'operator'),
  validate({ params: accountIdParamSchema }),
  accountCtrl.stopAccountHandler,
);
numberExtractionRouter.get(
  '/accounts/:id/jobs',
  validate({ params: accountIdParamSchema }),
  accountCtrl.getAccountJobsHandler,
);
numberExtractionRouter.get(
  '/accounts/:id/logs',
  validate({ params: accountIdParamSchema }),
  accountCtrl.getAccountLogsHandler,
);
numberExtractionRouter.post(
  '/accounts/:id/extract',
  requireRole('admin', 'operator'),
  validate({ params: accountIdParamSchema }),
  extractionCtrl.triggerExtractionHandler,
);

/* ---- الأرقام المستخرجة ---- */
numberExtractionRouter.get('/numbers', validate({ query: numbersQuerySchema }), numbersCtrl.listNumbersHandler);

/* ---- لوحة المراقبة اللحظية ---- */
numberExtractionRouter.get('/stats/overview', statsCtrl.overviewHandler);
numberExtractionRouter.get('/stats/logs', validate({ query: logsQuerySchema }), statsCtrl.recentLogsHandler);
numberExtractionRouter.get('/stats/jobs', statsCtrl.activeJobsHandler);

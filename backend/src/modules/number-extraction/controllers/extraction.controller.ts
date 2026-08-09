import type { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { UnauthorizedError } from '../../../shared/utils/errors.js';
import { enqueueExtractionJob } from '../queue/extraction.queue.js';
import { recordAuditLog } from '../../../shared/services/auditLog.service.js';

export const triggerExtractionHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const accountId = req.params.id as string;

  const job = await enqueueExtractionJob(accountId, 'manual', req.user.sub);

  await recordAuditLog({
    action: 'extraction.manual_trigger',
    entityType: 'extraction_account',
    entityId: accountId,
    userId: req.user.sub,
    userEmail: req.user.email,
  });

  res.status(202).json({ success: true, data: job });
});

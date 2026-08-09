import type { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import * as statsService from '../services/stats.service.js';

export const overviewHandler = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await statsService.getOverviewStats();
  res.json({ success: true, data: stats });
});

export const recentLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  const logs = await statsService.getRecentLogs(limit);
  res.json({ success: true, data: logs });
});

export const activeJobsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const jobs = await statsService.getActiveJobs();
  res.json({ success: true, data: jobs });
});

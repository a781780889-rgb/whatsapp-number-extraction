import type { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { UnauthorizedError } from '../../../shared/utils/errors.js';
import * as accountService from '../services/account.service.js';

function actorFrom(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.sub, email: req.user.email };
}

export const listAccountsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const accounts = await accountService.listAccounts();
  res.json({ success: true, data: accounts });
});

export const getAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  const account = await accountService.getAccountById(req.params.id as string);
  res.json({ success: true, data: account });
});

export const createAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  const account = await accountService.createAccount(req.body, actorFrom(req));
  res.status(201).json({ success: true, data: account });
});

export const updateAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  const account = await accountService.updateAccount(req.params.id as string, req.body, actorFrom(req));
  res.json({ success: true, data: account });
});

export const deleteAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  await accountService.deleteAccount(req.params.id as string, actorFrom(req));
  res.status(204).send();
});

export const startAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  await accountService.startAccountAction(req.params.id as string, actorFrom(req));
  res.json({ success: true });
});

export const stopAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  await accountService.stopAccountAction(req.params.id as string, actorFrom(req));
  res.json({ success: true });
});

export const getAccountJobsHandler = asyncHandler(async (req: Request, res: Response) => {
  const jobs = await accountService.getAccountJobs(req.params.id as string);
  res.json({ success: true, data: jobs });
});

export const getAccountLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const logs = await accountService.getAccountLogs(req.params.id as string);
  res.json({ success: true, data: logs });
});

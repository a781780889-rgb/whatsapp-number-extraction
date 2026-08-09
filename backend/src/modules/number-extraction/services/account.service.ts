import { eq, desc } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { extractionAccounts, extractionJobs, systemLogs } from '../../../db/schema.js';
import { NotFoundError } from '../../../shared/utils/errors.js';
import { recordAuditLog } from '../../../shared/services/auditLog.service.js';
import { emitToDashboard, RealtimeEvents } from '../../../shared/services/socket.service.js';
import { systemLog } from '../../../shared/services/systemLog.service.js';
import {
  connectAccount,
  stopAccount as stopAccountConnection,
  startAccount as startAccountConnection,
  logoutAccount,
} from './whatsappConnection.service.js';

interface Actor {
  userId: string;
  email: string;
}

export interface CreateAccountInput {
  name: string;
  description?: string;
}

export interface UpdateAccountInput {
  name?: string;
  description?: string;
}

export async function listAccounts() {
  return db.query.extractionAccounts.findMany({ orderBy: desc(extractionAccounts.createdAt) });
}

export async function getAccountById(id: string) {
  const account = await db.query.extractionAccounts.findFirst({ where: eq(extractionAccounts.id, id) });
  if (!account) throw new NotFoundError('الحساب غير موجود');
  return account;
}

export async function createAccount(input: CreateAccountInput, actor: Actor) {
  const [account] = await db
    .insert(extractionAccounts)
    .values({ name: input.name, description: input.description, createdBy: actor.userId })
    .returning();

  if (!account) throw new Error('Failed to create account');

  await recordAuditLog({
    action: 'extraction_account.create',
    entityType: 'extraction_account',
    entityId: account.id,
    userId: actor.userId,
    userEmail: actor.email,
    details: { name: input.name },
  });

  emitToDashboard(RealtimeEvents.ACCOUNT_UPDATED, account);
  systemLog.info(`تمت إضافة حساب سحب جديد: ${input.name}`, { accountId: account.id, module: 'accounts' });

  // بدء الاتصال فوراً (سيولّد رمز QR للمسح عبر الأحداث اللحظية)
  connectAccount(account.id).catch((err) => {
    systemLog.error(`فشل بدء اتصال الحساب الجديد: ${(err as Error).message}`, {
      accountId: account.id,
      module: 'accounts',
    });
  });

  return account;
}

export async function updateAccount(id: string, patch: UpdateAccountInput, actor: Actor) {
  await getAccountById(id);

  const [updated] = await db
    .update(extractionAccounts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(extractionAccounts.id, id))
    .returning();

  await recordAuditLog({
    action: 'extraction_account.update',
    entityType: 'extraction_account',
    entityId: id,
    userId: actor.userId,
    userEmail: actor.email,
    details: { ...patch },
  });

  emitToDashboard(RealtimeEvents.ACCOUNT_UPDATED, updated);
  return updated!;
}

export async function deleteAccount(id: string, actor: Actor) {
  const account = await getAccountById(id);

  try {
    await logoutAccount(id);
  } catch (err) {
    systemLog.warn(`تعذّر تسجيل الخروج بشكل نظيف من واتساب أثناء الحذف: ${(err as Error).message}`, {
      accountId: id,
      module: 'accounts',
    });
  }

  await db.delete(extractionAccounts).where(eq(extractionAccounts.id, id));

  await recordAuditLog({
    action: 'extraction_account.delete',
    entityType: 'extraction_account',
    entityId: id,
    userId: actor.userId,
    userEmail: actor.email,
    details: { name: account.name },
  });

  emitToDashboard(RealtimeEvents.ACCOUNT_DELETED, { id });
  systemLog.warn(`تم حذف الحساب: ${account.name}`, { module: 'accounts' });
}

export async function startAccountAction(id: string, actor: Actor) {
  await getAccountById(id);
  await startAccountConnection(id);
  await recordAuditLog({
    action: 'extraction_account.start',
    entityType: 'extraction_account',
    entityId: id,
    userId: actor.userId,
    userEmail: actor.email,
  });
}

export async function stopAccountAction(id: string, actor: Actor) {
  await getAccountById(id);
  await stopAccountConnection(id);
  await recordAuditLog({
    action: 'extraction_account.stop',
    entityType: 'extraction_account',
    entityId: id,
    userId: actor.userId,
    userEmail: actor.email,
  });
}

export async function getAccountJobs(accountId: string, limit = 20) {
  return db.query.extractionJobs.findMany({
    where: eq(extractionJobs.accountId, accountId),
    orderBy: desc(extractionJobs.queuedAt),
    limit,
  });
}

export async function getAccountLogs(accountId: string, limit = 50) {
  return db.query.systemLogs.findMany({
    where: eq(systemLogs.accountId, accountId),
    orderBy: desc(systemLogs.createdAt),
    limit,
  });
}

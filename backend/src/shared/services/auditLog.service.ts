import { db } from '../../db/index.js';
import { auditLogs } from '../../db/schema.js';
import { childLogger } from '../../config/logger.js';

const log = childLogger('audit-log');

export interface AuditEntryInput {
  userId?: string | null;
  userEmail?: string | null;
  action: string; // e.g. 'account.create', 'account.stop', 'numbers.reset'
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * كل عملية مهمة (إضافة/حذف/تعديل حساب، بدء/إيقاف سحب، إعادة تعيين أرقام...)
 * تُسجَّل هنا. هذا الجدول لا يُستخدم للتصحيح التقني (ذلك دور systemLog) بل
 * كسجل تدقيق ثابت: من فعل ماذا ومتى.
 */
export async function recordAuditLog(entry: AuditEntryInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      userEmailSnapshot: entry.userEmail ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details ?? {},
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    // سجل التدقيق لا يجب أن يُسقط العملية الأساسية إن فشل هو نفسه بالكتابة
    log.error({ err, entry }, 'Failed to write audit log entry');
  }
}

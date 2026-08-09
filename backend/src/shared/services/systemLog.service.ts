import { db } from '../../db/index.js';
import { systemLogs } from '../../db/schema.js';
import { childLogger } from '../../config/logger.js';
import { getIO } from './socket.service.js';

const log = childLogger('system-log');

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SystemLogInput {
  level: LogLevel;
  message: string;
  module?: string;
  accountId?: string | null;
  context?: Record<string, unknown>;
}

/**
 * يكتب سطراً في "سجل الأحداث المباشر" و"سجل الأخطاء" اللذين تعرضهما
 * لوحة المراقبة، ويبثّه فورياً عبر Socket.IO، بالإضافة إلى الطباعة في
 * الكونسول عبر pino. مصمَّم ليكون "fire and forget" حتى لا يبطئ العمليات
 * الأساسية (السحب) بانتظار كتابة السجل.
 */
export function writeSystemLog(input: SystemLogInput): void {
  const { level, message, module = 'number-extraction', accountId = null, context } = input;

  log[level]({ module, accountId, context }, message);

  // نبثّ فوراً بدون انتظار الكتابة في قاعدة البيانات لضمان "لحظية" السجل
  try {
    getIO()?.to('dashboard').emit('log:new', {
      level,
      module,
      message,
      accountId,
      context,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // socket غير جاهز بعد (مثلاً أثناء seed/migrate) - غير حرج
  }

  db.insert(systemLogs)
    .values({ level, module, message, accountId, context: context ?? {} })
    .catch((err) => {
      log.error({ err }, 'Failed to persist system log entry');
    });
}

export const systemLog = {
  info: (message: string, opts?: Omit<SystemLogInput, 'level' | 'message'>) =>
    writeSystemLog({ level: 'info', message, ...opts }),
  warn: (message: string, opts?: Omit<SystemLogInput, 'level' | 'message'>) =>
    writeSystemLog({ level: 'warn', message, ...opts }),
  error: (message: string, opts?: Omit<SystemLogInput, 'level' | 'message'>) =>
    writeSystemLog({ level: 'error', message, ...opts }),
  debug: (message: string, opts?: Omit<SystemLogInput, 'level' | 'message'>) =>
    writeSystemLog({ level: 'debug', message, ...opts }),
};

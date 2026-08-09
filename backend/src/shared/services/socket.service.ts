import type { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

export function getIO(): Server | null {
  return ioInstance;
}

/**
 * كل الأحداث اللحظية التي تبثها الخلفية إلى لوحة التحكم تمر من هنا حتى لا
 * تتكرر أسماء الأحداث أو تتضارب الصيغ بين مكان وآخر في الكود.
 */
export const RealtimeEvents = {
  ACCOUNT_UPDATED: 'account:updated',
  ACCOUNT_STATUS: 'account:status',
  ACCOUNT_QR: 'account:qr',
  ACCOUNT_DELETED: 'account:deleted',
  JOB_STARTED: 'job:started',
  JOB_PROGRESS: 'job:progress',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
  LOG_NEW: 'log:new',
  STATS_OVERVIEW: 'stats:overview',
  SYSTEM_RESOURCES: 'system:resources',
} as const;

export function emitToDashboard(event: string, payload: unknown) {
  ioInstance?.to('dashboard').emit(event, payload);
}

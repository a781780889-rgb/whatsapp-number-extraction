import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { extractionAccounts, type ExtractionAccount } from '../../../db/schema.js';
import { useDbAuthState, clearSession } from '../db/authState.js';
import { emitToDashboard, RealtimeEvents } from '../../../shared/services/socket.service.js';
import { systemLog } from '../../../shared/services/systemLog.service.js';
import { childLogger } from '../../../config/logger.js';
import { enqueueExtractionJob } from '../queue/extraction.queue.js';

const log = childLogger('wa-connection');
// Baileys نفسه مطوّل جداً في سجلاته؛ ما يهم المستخدم يُنشر عبر systemLog أدناه
const baileysLogger = P({ level: 'silent' });

interface ManagedConnection {
  socket: WASocket;
  accountId: string;
  reconnectAttempts: number;
  intentionallyStopped: boolean;
}

const connections = new Map<string, ManagedConnection>();
const MAX_RECONNECT_ATTEMPTS = 5;
const RESUMABLE_STATUSES: ExtractionAccount['status'][] = [
  'connected',
  'connecting',
  'disconnected',
  'awaiting_qr',
  'pending',
];

export function getActiveSocket(accountId: string): WASocket | null {
  return connections.get(accountId)?.socket ?? null;
}

export function isAccountConnected(accountId: string): boolean {
  const conn = connections.get(accountId);
  return !!conn && conn.socket.user != null;
}

export function getManagedAccountIds(): string[] {
  return Array.from(connections.keys());
}

async function updateAccountRow(accountId: string, patch: Partial<ExtractionAccount>) {
  await db
    .update(extractionAccounts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(extractionAccounts.id, accountId));
  const updated = await db.query.extractionAccounts.findFirst({
    where: eq(extractionAccounts.id, accountId),
  });
  if (updated) emitToDashboard(RealtimeEvents.ACCOUNT_UPDATED, updated);
  return updated;
}

export async function connectAccount(accountId: string): Promise<void> {
  if (connections.has(accountId)) {
    log.warn({ accountId }, 'connectAccount called while a connection already exists — ignoring');
    return;
  }

  await updateAccountRow(accountId, { status: 'connecting', connectionStatus: 'connecting' });

  const { state, saveCreds } = await useDbAuthState(accountId);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    browser: Browsers.ubuntu('Chrome'),
    logger: baileysLogger,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  const managed: ManagedConnection = {
    socket,
    accountId,
    reconnectAttempts: 0,
    intentionallyStopped: false,
  };
  connections.set(accountId, managed);

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr);
      await updateAccountRow(accountId, {
        status: 'awaiting_qr',
        connectionStatus: 'awaiting_qr',
        qrCode: qrDataUrl,
      });
      emitToDashboard(RealtimeEvents.ACCOUNT_QR, { accountId, qrCode: qrDataUrl });
    }

    if (connection === 'open') {
      managed.reconnectAttempts = 0;
      const phoneNumber = socket.user?.id?.split(':')[0]?.split('@')[0] ?? null;
      await updateAccountRow(accountId, {
        status: 'connected',
        connectionStatus: 'connected',
        qrCode: null,
        phoneNumber,
        lastConnectedAt: new Date(),
        lastActivityAt: new Date(),
      });
      systemLog.info('تم ربط الحساب بنجاح / Account connected successfully', {
        accountId,
        module: 'whatsapp-connection',
      });

      // "بعد إضافة حساب... يقوم النظام تلقائياً بـ..." — تشغيل تلقائي لعملية السحب عند نجاح الاتصال
      enqueueExtractionJob(accountId, 'auto_on_connect').catch((err) => {
        log.error({ err, accountId }, 'Failed to auto-enqueue extraction job on connect');
      });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const restartRequired = statusCode === DisconnectReason.restartRequired;

      connections.delete(accountId);

      if (loggedOut) {
        await clearSession(accountId);
        await updateAccountRow(accountId, { status: 'logged_out', connectionStatus: 'logged_out', qrCode: null });
        systemLog.warn('تم تسجيل الخروج من واتساب — يلزم مسح QR من جديد', {
          accountId,
          module: 'whatsapp-connection',
        });
        return;
      }

      if (restartRequired) {
        // رمز طبيعي أثناء إتمام أول اقتران — إعادة اتصال فورية بدون تأخير
        connectAccount(accountId).catch((err) => log.error({ err, accountId }, 'Restart-required reconnect failed'));
        return;
      }

      if (managed.intentionallyStopped) {
        await updateAccountRow(accountId, { status: 'stopped', connectionStatus: 'stopped' });
        return;
      }

      await updateAccountRow(accountId, { status: 'disconnected', connectionStatus: 'disconnected' });

      if (managed.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        managed.reconnectAttempts += 1;
        const delayMs = Math.min(2 ** managed.reconnectAttempts * 1000, 30_000);
        systemLog.warn(
          `انقطع الاتصال، إعادة المحاولة خلال ${Math.round(delayMs / 1000)} ثانية (محاولة ${managed.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
          { accountId, module: 'whatsapp-connection' },
        );
        setTimeout(() => {
          connectAccount(accountId).catch((err) => log.error({ err, accountId }, 'Reconnect attempt failed'));
        }, delayMs);
      } else {
        await updateAccountRow(accountId, { status: 'error', connectionStatus: 'error' });
        systemLog.error('تجاوز الحساب الحد الأقصى لمحاولات إعادة الاتصال، يلزم تدخّل يدوي', {
          accountId,
          module: 'whatsapp-connection',
        });
      }
    }
  });
}

export async function stopAccount(accountId: string): Promise<void> {
  const conn = connections.get(accountId);
  if (conn) {
    conn.intentionallyStopped = true;
    conn.socket.end(undefined);
    connections.delete(accountId);
  }
  await updateAccountRow(accountId, { status: 'stopped', connectionStatus: 'stopped', isEnabled: false });
}

export async function startAccount(accountId: string): Promise<void> {
  await db
    .update(extractionAccounts)
    .set({ isEnabled: true, updatedAt: new Date() })
    .where(eq(extractionAccounts.id, accountId));
  await connectAccount(accountId);
}

export async function logoutAccount(accountId: string): Promise<void> {
  const conn = connections.get(accountId);
  if (conn) {
    conn.intentionallyStopped = true;
    try {
      await conn.socket.logout();
    } catch {
      conn.socket.end(undefined);
    }
    connections.delete(accountId);
  }
  await clearSession(accountId);
}

export function disconnectInMemoryOnly(accountId: string): void {
  const conn = connections.get(accountId);
  if (conn) {
    conn.intentionallyStopped = true;
    conn.socket.end(undefined);
    connections.delete(accountId);
  }
}

/**
 * يحاول حل رقم هاتف حقيقي من مشارك بصيغة LID (نظام الخصوصية الجديد في
 * واتساب) عبر خرائط الحل المتاحة داخلياً في Baileys إن وُجدت لهذا الإصدار.
 * إن تعذّر الحل (لا توجد خريطة، أو المستخدم مخفي تماماً) تُعاد null، ويُصنَّف
 * المشارك عندئذٍ ضمن "الأرقام المحذوفة" بدل تخزين قيمة LID كأنها رقم هاتف.
 */
export async function tryResolveLidToPhoneNumber(accountId: string, lidJid: string): Promise<string | null> {
  const socket = getActiveSocket(accountId);
  if (!socket) return null;
  try {
    const repo = (socket as unknown as { signalRepository?: { lidMapping?: unknown } }).signalRepository;
    const lidMapping = repo?.lidMapping as { getPNForLID?: (lid: string) => Promise<string | null> } | undefined;
    if (lidMapping?.getPNForLID) {
      return (await lidMapping.getPNForLID(lidJid)) ?? null;
    }
  } catch (err) {
    log.debug({ err, accountId, lidJid }, 'LID resolution unavailable on this Baileys version');
  }
  return null;
}

/**
 * "استعادة جميع العمليات بعد إعادة تشغيل السيرفر" — يُستدعى مرة واحدة عند
 * إقلاع الخادم لإعادة ربط كل الحسابات التي كانت متصلة أو بصدد الاتصال قبل
 * إعادة التشغيل (باستثناء ما أوقفه المستخدم يدوياً أو سُجّل خروجه فعلياً).
 */
export async function resumeActiveConnections(): Promise<void> {
  const accounts = await db.query.extractionAccounts.findMany({
    where: (fields, { eq: eqOp, and, inArray }) =>
      and(eqOp(fields.isEnabled, true), inArray(fields.status, RESUMABLE_STATUSES)),
  });

  if (accounts.length === 0) return;

  systemLog.info(`استئناف ${accounts.length} حساب(ات) بعد إعادة تشغيل الخادم`, { module: 'whatsapp-connection' });

  for (const account of accounts) {
    connectAccount(account.id).catch((err) => {
      log.error({ err, accountId: account.id }, 'Failed to resume connection on boot');
    });
  }
}

export async function shutdownAllConnections(): Promise<void> {
  for (const [accountId, conn] of connections) {
    conn.intentionallyStopped = true;
    try {
      conn.socket.end(undefined);
    } catch (err) {
      log.warn({ err, accountId }, 'Error while closing connection during shutdown');
    }
  }
  connections.clear();
}

import {
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { whatsappSessions } from '../../../db/schema.js';
import { encrypt, decrypt } from '../../../shared/services/encryption.service.js';
import { childLogger } from '../../../config/logger.js';

const log = childLogger('wa-auth-state');

type KeyStoreMap = Record<string, unknown>;

/**
 * بديل عن useMultiFileAuthState الافتراضي في Baileys (الذي يكتب مئات الملفات
 * على القرص). هنا نخزّن creds + signal keys كـ JSON مشفّر بـ AES-256-GCM في
 * PostgreSQL، بنفس بنية بيانات useMultiFileAuthState القياسية، بحيث:
 *   - الجلسة تبقى محفوظة عبر عمليات إعادة النشر على Railway (لا تعتمد على
 *     تخزين محلي غير دائم).
 *   - "تشفير الجلسات والمفاتيح باستخدام خوارزميات قوية" مُطبَّق فعلياً.
 */

async function persistCreds(accountId: string, creds: AuthenticationCreds) {
  const serialized = encrypt(JSON.stringify(creds, BufferJSON.replacer));
  await db
    .insert(whatsappSessions)
    .values({ accountId, encryptedCreds: serialized, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: whatsappSessions.accountId,
      set: { encryptedCreds: serialized, updatedAt: new Date() },
    });
}

async function persistKeys(accountId: string, keyStore: KeyStoreMap) {
  const serialized = encrypt(JSON.stringify(keyStore, BufferJSON.replacer));
  await db
    .insert(whatsappSessions)
    .values({ accountId, encryptedKeys: serialized, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: whatsappSessions.accountId,
      set: { encryptedKeys: serialized, updatedAt: new Date() },
    });
}

export async function useDbAuthState(accountId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const row = await db.query.whatsappSessions.findFirst({
    where: eq(whatsappSessions.accountId, accountId),
  });

  let creds: AuthenticationCreds;
  let keyStore: KeyStoreMap = {};

  if (row?.encryptedCreds) {
    try {
      creds = JSON.parse(decrypt(row.encryptedCreds), BufferJSON.reviver) as AuthenticationCreds;
    } catch (err) {
      log.error({ err, accountId }, 'Failed to decrypt stored credentials — starting a fresh session');
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  if (row?.encryptedKeys) {
    try {
      keyStore = JSON.parse(decrypt(row.encryptedKeys), BufferJSON.reviver) as KeyStoreMap;
    } catch (err) {
      log.error({ err, accountId }, 'Failed to decrypt stored signal keys — starting a fresh key store');
      keyStore = {};
    }
  }

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const data: { [id: string]: SignalDataTypeMap[T] } = {};
        for (const id of ids) {
          let value = keyStore[`${type}-${id}`];
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
          }
          if (value !== undefined) {
            data[id] = value as SignalDataTypeMap[T];
          }
        }
        return data;
      },
      set: async (data) => {
        for (const category of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          const categoryData = data[category];
          if (!categoryData) continue;
          for (const id of Object.keys(categoryData)) {
            const value = categoryData[id as keyof typeof categoryData];
            const key = `${category}-${id}`;
            if (value) {
              keyStore[key] = value;
            } else {
              delete keyStore[key];
            }
          }
        }
        await persistKeys(accountId, keyStore);
      },
    },
  };

  const saveCreds = () => persistCreds(accountId, state.creds);

  return { state, saveCreds };
}

export async function clearSession(accountId: string) {
  await db.delete(whatsappSessions).where(eq(whatsappSessions.accountId, accountId));
}

export async function hasStoredSession(accountId: string): Promise<boolean> {
  const row = await db.query.whatsappSessions.findFirst({
    where: eq(whatsappSessions.accountId, accountId),
    columns: { accountId: true, encryptedCreds: true },
  });
  return !!row?.encryptedCreds;
}

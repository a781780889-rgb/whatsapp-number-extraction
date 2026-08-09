import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';

vi.mock('../modules/number-extraction/services/whatsappConnection.service.js', () => ({
  getActiveSocket: vi.fn(),
  tryResolveLidToPhoneNumber: vi.fn(),
}));

import {
  getActiveSocket,
  tryResolveLidToPhoneNumber,
} from '../modules/number-extraction/services/whatsappConnection.service.js';
import { runExtractionJob } from '../modules/number-extraction/services/extraction.service.js';
import { db, queryClient } from '../db/index.js';
import { extractionAccounts, extractionJobs, extractionGroups, extractedNumbers } from '../db/schema.js';

const TEST_PHONE_A = '+966501111111';
const TEST_PHONE_B = '+966502222222';
const GROUP_A_JID = '120363000000000010@g.us';
const GROUP_B_JID = '120363000000000011@g.us';

function buildFakeSocket() {
  return {
    groupFetchAllParticipating: vi.fn().mockResolvedValue({
      groupA: {
        id: GROUP_A_JID,
        subject: 'Group A',
        participants: [
          { id: '966501111111@s.whatsapp.net' }, // جديد
          { id: '966501111111@s.whatsapp.net' }, // مكرر داخل نفس المجموعة
          { id: '184926592942@lid' }, // LID غير قابل للحل -> محذوف
          { id: 'status@broadcast' }, // ليس مستخدماً -> محذوف
        ],
      },
      groupB: {
        id: GROUP_B_JID,
        subject: 'Group B',
        participants: [
          { id: '966501111111@s.whatsapp.net' }, // مكرر عبر مجموعة مختلفة
          { id: '966502222222@s.whatsapp.net' }, // جديد
        ],
      },
    }),
  };
}

describe('extraction.service.runExtractionJob (mocked Baileys socket, real PostgreSQL)', () => {
  let accountId: string;
  let jobId: string;

  beforeAll(async () => {
    await queryClient`select 1`;
  });

  beforeEach(async () => {
    vi.mocked(tryResolveLidToPhoneNumber).mockResolvedValue(null);
    vi.mocked(getActiveSocket).mockReturnValue(buildFakeSocket() as never);

    const [account] = await db.insert(extractionAccounts).values({ name: 'حساب اختبار السحب' }).returning();
    accountId = account!.id;

    const [job] = await db
      .insert(extractionJobs)
      .values({ accountId, status: 'queued', triggerType: 'manual' })
      .returning();
    jobId = job!.id;
  });

  afterEach(async () => {
    await db.delete(extractedNumbers).where(sql`phone_number in (${TEST_PHONE_A}, ${TEST_PHONE_B})`);
    await db.delete(extractionGroups).where(sql`group_jid in (${GROUP_A_JID}, ${GROUP_B_JID})`);
    if (accountId) {
      await db.delete(extractionJobs).where(eq(extractionJobs.accountId, accountId));
      await db.delete(extractionAccounts).where(eq(extractionAccounts.id, accountId));
    }
    vi.clearAllMocks();
  });

  it('extracts, dedupes across groups, ignores LID/broadcast, and reports correct counts', async () => {
    const result = await runExtractionJob(jobId, accountId);

    expect(result.totalGroups).toBe(2);
    expect(result.processedGroups).toBe(2);
    expect(result.newNumbers).toBe(2); // TEST_PHONE_A أول ظهور + TEST_PHONE_B
    expect(result.duplicateNumbers).toBe(2); // TEST_PHONE_A مرتين إضافيتين
    expect(result.deletedNumbers).toBe(2); // LID + broadcast
    expect(result.totalExtracted).toBe(4);

    const numbers = await db.select().from(extractedNumbers).where(eq(extractedNumbers.accountId, accountId));
    expect(numbers).toHaveLength(2); // رقمان فريدان فقط رغم 4 ظهورات صالحة

    const phoneA = numbers.find((n) => n.phoneNumber === TEST_PHONE_A);
    expect(phoneA?.occurrenceCount).toBe(3); // ظهر 3 مرات صالحة إجمالاً (مرتين بمجموعة A، مرة بمجموعة B)
    expect(phoneA?.countryNameAr).toBe('السعودية');

    const savedGroups = await db.select().from(extractionGroups).where(eq(extractionGroups.accountId, accountId));
    expect(savedGroups).toHaveLength(2);

    const jobRow = await db.query.extractionJobs.findFirst({ where: eq(extractionJobs.id, jobId) });
    expect(jobRow?.status).toBe('completed');
    expect(jobRow?.processedGroups).toBe(2);

    const accountRow = await db.query.extractionAccounts.findFirst({ where: eq(extractionAccounts.id, accountId) });
    expect(accountRow?.groupsCount).toBe(2);
    expect(accountRow?.membersCount).toBe(6);
    expect(accountRow?.newCount).toBe(2);
    expect(accountRow?.duplicateCount).toBe(2);
    expect(accountRow?.deletedCount).toBe(2);
  });

  it('marks the job as failed and rethrows when the account has no active connection', async () => {
    vi.mocked(getActiveSocket).mockReturnValue(null);

    await expect(runExtractionJob(jobId, accountId)).rejects.toThrow();

    const jobRow = await db.query.extractionJobs.findFirst({ where: eq(extractionJobs.id, jobId) });
    expect(jobRow?.status).toBe('failed');
    expect(jobRow?.errorMessage).toBeTruthy();
  });
});

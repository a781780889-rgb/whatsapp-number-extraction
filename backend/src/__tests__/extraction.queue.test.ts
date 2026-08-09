import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { extractionAccounts, extractionJobs } from '../db/schema.js';
import { enqueueExtractionJob, extractionQueue } from '../modules/number-extraction/queue/extraction.queue.js';

describe('extraction.queue — "منع تنفيذ العملية نفسها أكثر من مرة في الوقت ذاته"', () => {
  let accountId: string;

  beforeAll(async () => {
    const [account] = await db.insert(extractionAccounts).values({ name: 'حساب اختبار الطابور' }).returning();
    accountId = account!.id;
  });

  afterEach(async () => {
    await db.delete(extractionJobs).where(eq(extractionJobs.accountId, accountId));
  });

  it('creates a queued job for a fresh account', async () => {
    const job = await enqueueExtractionJob(accountId, 'manual');
    expect(job.status).toBe('queued');
    expect(job.accountId).toBe(accountId);

    const queuedBullJob = await extractionQueue.getJob(job.id);
    expect(queuedBullJob).toBeTruthy();
  });

  it('rejects a second enqueue while one is already queued/processing for the same account', async () => {
    await enqueueExtractionJob(accountId, 'manual');
    await expect(enqueueExtractionJob(accountId, 'manual')).rejects.toThrow(/توجد بالفعل عملية سحب جارية/);
  });

  it('allows a new job once the previous one has completed', async () => {
    const first = await enqueueExtractionJob(accountId, 'manual');
    await db.update(extractionJobs).set({ status: 'completed' }).where(eq(extractionJobs.id, first.id));

    const second = await enqueueExtractionJob(accountId, 'manual');
    expect(second.id).not.toBe(first.id);
  });
});

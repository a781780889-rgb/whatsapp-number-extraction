import { Worker, type Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { extractionRedisConnection, EXTRACTION_QUEUE_NAME } from './extraction.queue.js';
import { runExtractionJob } from '../services/extraction.service.js';
import { childLogger } from '../../../config/logger.js';
import { db } from '../../../db/index.js';
import { extractionJobs } from '../../../db/schema.js';
import { emitToDashboard, RealtimeEvents } from '../../../shared/services/socket.service.js';
import type { ExtractionQueueJobData } from '../types/index.js';

const log = childLogger('extraction-worker');

let worker: Worker<ExtractionQueueJobData> | null = null;

/**
 * كل العمليات الطويلة (سحب الأرقام) تعمل هنا في الخلفية بمعزل تام عن
 * طلبات الـ API، فلا تُجمّد واجهة لوحة التحكم مهما طالت. concurrency=5
 * يسمح بسحب عدة حسابات بالتوازي. إعادة المحاولة التلقائية والتراجع
 * الأسي (exponential backoff) مضبوطان على مستوى الطابور نفسه.
 */
export function startExtractionWorker(): Worker<ExtractionQueueJobData> {
  if (worker) return worker;

  worker = new Worker<ExtractionQueueJobData>(
    EXTRACTION_QUEUE_NAME,
    async (job: Job<ExtractionQueueJobData>) => {
      const { accountId, jobId } = job.data;
      await db
        .update(extractionJobs)
        .set({ attempts: job.attemptsMade + 1 })
        .where(eq(extractionJobs.id, jobId));
      return runExtractionJob(jobId, accountId);
    },
    {
      connection: extractionRedisConnection,
      concurrency: 5,
      stalledInterval: 30_000,
      maxStalledCount: 2,
    },
  );

  worker.on('failed', (job, err) => {
    log.error({ err, jobId: job?.data?.jobId, accountId: job?.data?.accountId }, 'Extraction job failed');
    if (job?.data) {
      emitToDashboard(RealtimeEvents.JOB_FAILED, {
        jobId: job.data.jobId,
        accountId: job.data.accountId,
        error: err.message,
      });
    }
  });

  worker.on('completed', (job) => {
    log.info({ jobId: job.data.jobId, accountId: job.data.accountId }, 'Extraction job completed');
  });

  worker.on('error', (err) => {
    log.error({ err }, 'Extraction worker connection error');
  });

  log.info('Extraction worker started (concurrency=5)');
  return worker;
}

export async function stopExtractionWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

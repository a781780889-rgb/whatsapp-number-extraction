import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { and, eq, inArray } from 'drizzle-orm';
import { env } from '../../../config/env.js';
import { db } from '../../../db/index.js';
import { extractionJobs } from '../../../db/schema.js';
import { ConflictError } from '../../../shared/utils/errors.js';
import type { ExtractionQueueJobData } from '../types/index.js';

export const extractionRedisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // مطلوب من BullMQ لاتصالات الـ Worker
});

export const EXTRACTION_QUEUE_NAME = 'number-extraction';

/**
 * الطابور مسؤول فقط عن الاستمرارية وإعادة المحاولة ("Queue لإدارة العمليات
 * الطويلة")، وهو ما يضمن استئناف مهام السحب تلقائياً بعد إعادة تشغيل الخادم
 * (Redis + BullMQ تحتفظان بالمهام المعلّقة/الجارية).
 */
export const extractionQueue = new Queue<ExtractionQueueJobData>(EXTRACTION_QUEUE_NAME, {
  connection: extractionRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 86400 },
  },
});

/**
 * "منع تنفيذ العملية نفسها أكثر من مرة في الوقت ذاته": قبل جدولة مهمة سحب
 * جديدة لحساب معيّن، نتحقق من قاعدة البيانات أنه لا توجد مهمة أخرى قيد
 * الانتظار أو التنفيذ لنفس الحساب. (ملاحظة: خلال نافذة زمنية قصيرة جداً أثناء
 * إعادة محاولة BullMQ التلقائية بين محاولة فاشلة وأخرى، قد تسمح هذه الفحوصة
 * نظرياً بتكرار نادر جداً؛ آلية upsertExtractedNumber المتزامنة الآمنة تحمي
 * البيانات النهائية من أي تأثير حتى في تلك الحالة النادرة.)
 */
export async function enqueueExtractionJob(
  accountId: string,
  triggerType: 'manual' | 'auto_on_connect',
  triggeredBy?: string,
) {
  const existingActive = await db.query.extractionJobs.findFirst({
    where: and(eq(extractionJobs.accountId, accountId), inArray(extractionJobs.status, ['queued', 'processing'])),
  });

  if (existingActive) {
    throw new ConflictError('توجد بالفعل عملية سحب جارية لهذا الحساب');
  }

  const [job] = await db
    .insert(extractionJobs)
    .values({ accountId, status: 'queued', triggerType, triggeredBy: triggeredBy ?? null })
    .returning();

  if (!job) throw new Error('Failed to create extraction job record');

  await extractionQueue.add('extract', { accountId, jobId: job.id, triggerType }, { jobId: job.id });

  return job;
}

export async function closeExtractionQueue() {
  await extractionQueue.close();
  await extractionRedisConnection.quit();
}

import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { extractionAccounts, extractionGroups, extractionJobs } from '../../../db/schema.js';
import { getActiveSocket, tryResolveLidToPhoneNumber } from './whatsappConnection.service.js';
import { classifyJid, extractDigitsFromPhoneJid, parsePhoneDetails } from '../../../shared/utils/phoneParser.js';
import { upsertExtractedNumber } from './deduplication.service.js';
import { emitToDashboard, RealtimeEvents } from '../../../shared/services/socket.service.js';
import { systemLog } from '../../../shared/services/systemLog.service.js';
import { childLogger } from '../../../config/logger.js';
import { NotFoundError, ConflictError } from '../../../shared/utils/errors.js';
import type { ExtractionJobResult, GroupExtractionProgress } from '../types/index.js';

const log = childLogger('extraction-service');

/**
 * ينفّذ آلية العمل الموصوفة في القسم الأول بالكامل:
 * قراءة جميع المجموعات -> استخراج جميع الأعضاء -> استخراج أرقام الهواتف فقط
 * -> تجاهل من لا رقم له -> حذف أي تكرار -> حفظ مرة واحدة فقط -> تحديث
 * الإحصائيات لحظياً عبر Socket.IO مع كل مجموعة تتم معالجتها.
 */
export async function runExtractionJob(jobId: string, accountId: string): Promise<ExtractionJobResult> {
  const startedAt = Date.now();

  let newNumbers = 0;
  let duplicateNumbers = 0;
  let deletedNumbers = 0;
  let processedGroups = 0;
  let totalMembersSeen = 0;

  // كل شيء — بما في ذلك فحوصات ما قبل التنفيذ (الاتصال، وجود الحساب) — داخل
  // try/catch واحد، حتى يُسجَّل أي فشل مهما كان مصدره كحالة "failed" واضحة
  // في extractionJobs بدل أن يبقى السجل عالقاً على "queued/processing" للأبد.
  try {
    const socket = getActiveSocket(accountId);
    if (!socket) {
      throw new ConflictError('الحساب غير متصل حالياً، لا يمكن بدء عملية السحب');
    }

    const account = await db.query.extractionAccounts.findFirst({ where: eq(extractionAccounts.id, accountId) });
    if (!account) throw new NotFoundError('الحساب غير موجود');

    await db
      .update(extractionJobs)
      .set({ status: 'processing', startedAt: new Date() })
      .where(eq(extractionJobs.id, jobId));
    emitToDashboard(RealtimeEvents.JOB_STARTED, { jobId, accountId, startedAt: new Date().toISOString() });
    systemLog.info(`بدء عملية سحب الأرقام لحساب: ${account.name}`, { accountId, module: 'extraction' });

    const allGroups = await socket.groupFetchAllParticipating();
    const groupEntries = Object.values(allGroups);
    const totalGroups = groupEntries.length;

    await db.update(extractionJobs).set({ totalGroups }).where(eq(extractionJobs.id, jobId));

    for (const group of groupEntries) {
      const groupJid = group.id;
      const groupName = group.subject?.trim() || groupJid;
      const participants = group.participants ?? [];
      totalMembersSeen += participants.length;

      const [groupRow] = await db
        .insert(extractionGroups)
        .values({
          accountId,
          accountNameSnapshot: account.name,
          groupJid,
          groupName,
          memberCount: participants.length,
          lastScannedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [extractionGroups.accountId, extractionGroups.groupJid],
          set: { groupName, memberCount: participants.length, lastScannedAt: new Date() },
        })
        .returning();

      for (const participant of participants) {
        const jid = participant.id;
        const kind = classifyJid(jid);

        let digits: string | null = null;

        if (kind === 'phone') {
          digits = extractDigitsFromPhoneJid(jid);
        } else if (kind === 'lid') {
          // نظام الخصوصية الجديد في واتساب (LID) يخفي الرقم الحقيقي؛ نحاول
          // الحل عبر خرائط Baileys الداخلية إن كانت متاحة لهذا الإصدار
          const resolved = await tryResolveLidToPhoneNumber(accountId, jid);
          if (resolved) {
            const fallbackDigits = resolved.replace(/[^0-9]/g, '');
            digits = extractDigitsFromPhoneJid(resolved) ?? (fallbackDigits.length > 0 ? fallbackDigits : null);
          }
        }

        if (!digits) {
          // "تجاهل الحسابات التي لا تحتوي على رقم" — LID غير قابل للحل أو صيغة غير صالحة
          deletedNumbers += 1;
          continue;
        }

        const details = parsePhoneDetails(digits);
        if (!details) {
          deletedNumbers += 1;
          continue;
        }

        const result = await upsertExtractedNumber({
          phoneNumber: details.e164,
          countryCode: details.countryCallingCode,
          countryIso: details.countryIso,
          countryNameEn: details.countryNameEn,
          countryNameAr: details.countryNameAr,
          groupId: groupRow?.id ?? null,
          groupJidSnapshot: groupJid,
          groupNameSnapshot: groupName,
          accountId,
          accountNameSnapshot: account.name,
        });

        if (result.isNew) newNumbers += 1;
        else duplicateNumbers += 1;
      }

      processedGroups += 1;

      const elapsedMs = Date.now() - startedAt;
      const totalSoFar = newNumbers + duplicateNumbers;
      const speedPerMinute = elapsedMs > 0 ? Math.round((totalSoFar / elapsedMs) * 60_000) : 0;
      const avgMsPerGroup = processedGroups > 0 ? elapsedMs / processedGroups : 0;
      const estimatedRemainingMs =
        totalGroups > processedGroups ? Math.round(avgMsPerGroup * (totalGroups - processedGroups)) : 0;

      await db
        .update(extractionJobs)
        .set({
          processedGroups,
          newNumbers,
          duplicateNumbers,
          deletedNumbers,
          totalExtracted: totalSoFar,
          speedPerMinute,
        })
        .where(eq(extractionJobs.id, jobId));

      const progress: GroupExtractionProgress = {
        jobId,
        accountId,
        totalGroups,
        processedGroups,
        currentGroupName: groupName,
        newNumbers,
        duplicateNumbers,
        deletedNumbers,
        elapsedMs,
        estimatedRemainingMs,
        speedPerMinute,
      };
      emitToDashboard(RealtimeEvents.JOB_PROGRESS, progress);
    }

    const durationMs = Date.now() - startedAt;
    const totalExtracted = newNumbers + duplicateNumbers;
    const speedPerMinute = durationMs > 0 ? Math.round((totalExtracted / durationMs) * 60_000) : 0;

    await db
      .update(extractionJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        speedPerMinute,
        processedGroups,
        newNumbers,
        duplicateNumbers,
        deletedNumbers,
        totalExtracted,
      })
      .where(eq(extractionJobs.id, jobId));

    await db
      .update(extractionAccounts)
      .set({
        groupsCount: totalGroups,
        membersCount: totalMembersSeen,
        extractedCount: totalExtracted,
        newCount: newNumbers,
        duplicateCount: duplicateNumbers,
        deletedCount: deletedNumbers,
        lastExtractionSpeed: speedPerMinute,
        lastExtractionDurationMs: durationMs,
        lastActivityAt: new Date(),
        lastOperationAt: new Date(),
        lastOperationType: 'extraction_completed',
      })
      .where(eq(extractionAccounts.id, accountId));

    const result: ExtractionJobResult = {
      totalGroups,
      processedGroups,
      newNumbers,
      duplicateNumbers,
      deletedNumbers,
      totalExtracted,
      durationMs,
      speedPerMinute,
    };

    emitToDashboard(RealtimeEvents.JOB_COMPLETED, { jobId, accountId, ...result });
    systemLog.info(
      `اكتمل السحب لحساب ${account.name}: ${newNumbers} رقم جديد، ${duplicateNumbers} مكرر، ${deletedNumbers} محذوف من أصل ${totalGroups} مجموعة`,
      { accountId, module: 'extraction' },
    );

    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = (err as Error).message;

    await db
      .update(extractionJobs)
      .set({ status: 'failed', completedAt: new Date(), durationMs, errorMessage: message })
      .where(eq(extractionJobs.id, jobId));

    await db
      .update(extractionAccounts)
      .set({ lastOperationAt: new Date(), lastOperationType: 'extraction_failed' })
      .where(eq(extractionAccounts.id, accountId));

    emitToDashboard(RealtimeEvents.JOB_FAILED, { jobId, accountId, error: message });
    systemLog.error(`فشلت عملية السحب: ${message}`, { accountId, module: 'extraction' });
    log.error({ err, accountId, jobId }, 'Extraction job failed');

    throw err;
  }
}

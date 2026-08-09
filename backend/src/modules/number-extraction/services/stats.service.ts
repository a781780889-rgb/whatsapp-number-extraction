import { count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { extractionAccounts, extractedNumbers, extractionJobs, systemLogs } from '../../../db/schema.js';

/**
 * يغذّي "اللوحة الأولى: لوحة سحب الأرقام" من مواصفة القسم الأول — كل الحقول
 * المطلوبة هناك (عدد الحسابات، النشطة، المتوقفة، المجموعات، الأعضاء،
 * الأرقام الجديدة/المكررة/المحذوفة، إلخ) تُشتق من هنا في استعلام واحد مجمَّع.
 */
export async function getOverviewStats() {
  const accounts = await db.query.extractionAccounts.findMany();

  const activeAccounts = accounts.filter((a) => a.status === 'connected').length;
  const stoppedAccounts = accounts.filter((a) => a.status === 'stopped' || !a.isEnabled).length;
  const totalGroups = accounts.reduce((sum, a) => sum + a.groupsCount, 0);
  const totalMembers = accounts.reduce((sum, a) => sum + a.membersCount, 0);
  const newNumbersLastRun = accounts.reduce((sum, a) => sum + a.newCount, 0);
  const duplicateNumbersLastRun = accounts.reduce((sum, a) => sum + a.duplicateCount, 0);
  const deletedNumbersLastRun = accounts.reduce((sum, a) => sum + a.deletedCount, 0);

  const [totalExtractedRow] = await db.select({ value: count() }).from(extractedNumbers);

  // كل مهمة "processing" تعالج مجموعة واحدة بالضبط في تلك اللحظة (المعالجة
  // داخل كل مهمة تسلسلية)، لذا فعدد المهام الجارية = عدد المجموعات قيد الفحص الآن
  const [processingJobsRow] = await db
    .select({ value: count() })
    .from(extractionJobs)
    .where(eq(extractionJobs.status, 'processing'));

  const byCountry = await db
    .select({
      countryIso: extractedNumbers.countryIso,
      countryNameAr: extractedNumbers.countryNameAr,
      total: count(),
    })
    .from(extractedNumbers)
    .groupBy(extractedNumbers.countryIso, extractedNumbers.countryNameAr)
    .orderBy(desc(count()))
    .limit(15);

  return {
    totalAccounts: accounts.length,
    activeAccounts,
    stoppedAccounts,
    totalGroups,
    groupsCurrentlyScanning: processingJobsRow?.value ?? 0,
    totalMembers,
    totalExtractedNumbers: totalExtractedRow?.value ?? 0,
    newNumbersLastRun,
    duplicateNumbersLastRun,
    deletedNumbersLastRun,
    byCountry,
  };
}

export async function getRecentLogs(limit = 50) {
  return db.query.systemLogs.findMany({ orderBy: desc(systemLogs.createdAt), limit });
}

export async function getActiveJobs() {
  return db.query.extractionJobs.findMany({
    where: inArray(extractionJobs.status, ['queued', 'processing']),
    orderBy: desc(extractionJobs.queuedAt),
  });
}

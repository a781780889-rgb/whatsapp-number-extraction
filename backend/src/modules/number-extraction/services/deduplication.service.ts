import { eq, sql } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { extractedNumbers } from '../../../db/schema.js';

export interface UpsertNumberInput {
  phoneNumber: string;
  countryCode: string | null;
  countryIso: string | null;
  countryNameEn: string | null;
  countryNameAr: string | null;
  groupId: string | null;
  groupJidSnapshot: string | null;
  groupNameSnapshot: string | null;
  accountId: string | null;
  accountNameSnapshot: string | null;
}

export interface UpsertNumberResult {
  isNew: boolean;
  id: string;
}

/**
 * "حذف التكرار": يبقى سجل واحد فقط لكل رقم داخل قاعدة البيانات مهما تكرر
 * ظهوره — بنفس المجموعة، أو مجموعات مختلفة، أو عبر عدة حسابات. القيد الفريد
 * على phone_number في المخطط هو ما يضمن ذلك فعلياً على مستوى القاعدة، وليس
 * فقط على مستوى الكود.
 *
 * أول ظهور لرقم يُنشئ السجل ويبقى "مصدر الاستخراج" (account/group) ثابتاً
 * فيه للتدقيق. أي ظهور لاحق (نفس الرقم من أي مصدر) لا يُنشئ سجلاً جديداً،
 * بل يزيد occurrenceCount ويحدّث lastSeenAt فقط — تنفَّذ العملية عبر
 * INSERT ... ON CONFLICT لتبقى آمنة عند التزامن العالي (عدة حسابات تسحب
 * بالتوازي وتصادف نفس الرقم في نفس اللحظة تقريباً).
 */
export async function upsertExtractedNumber(input: UpsertNumberInput): Promise<UpsertNumberResult> {
  const inserted = await db
    .insert(extractedNumbers)
    .values({
      phoneNumber: input.phoneNumber,
      countryCode: input.countryCode,
      countryIso: input.countryIso,
      countryNameEn: input.countryNameEn,
      countryNameAr: input.countryNameAr,
      groupId: input.groupId,
      groupJidSnapshot: input.groupJidSnapshot,
      groupNameSnapshot: input.groupNameSnapshot,
      accountId: input.accountId,
      accountNameSnapshot: input.accountNameSnapshot,
      occurrenceCount: 1,
    })
    .onConflictDoNothing({ target: extractedNumbers.phoneNumber })
    .returning({ id: extractedNumbers.id });

  const insertedRow = inserted[0];
  if (insertedRow) {
    return { isNew: true, id: insertedRow.id };
  }

  const updated = await db
    .update(extractedNumbers)
    .set({
      occurrenceCount: sql`${extractedNumbers.occurrenceCount} + 1`,
      lastSeenAt: new Date(),
    })
    .where(eq(extractedNumbers.phoneNumber, input.phoneNumber))
    .returning({ id: extractedNumbers.id });

  const updatedRow = updated[0];
  if (!updatedRow) {
    // حالة نادرة جداً: تعارض حذف متزامن بين محاولة الإدراج والتحديث — نعيد المحاولة مرة واحدة
    return upsertExtractedNumber(input);
  }

  return { isNew: false, id: updatedRow.id };
}

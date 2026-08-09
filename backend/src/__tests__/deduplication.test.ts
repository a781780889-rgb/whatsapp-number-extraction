import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { db, queryClient } from '../db/index.js';
import { extractedNumbers } from '../db/schema.js';
import { upsertExtractedNumber } from '../modules/number-extraction/services/deduplication.service.js';

const baseInput = {
  countryCode: '966',
  countryIso: 'SA',
  countryNameEn: 'Saudi Arabia',
  countryNameAr: 'السعودية',
  groupId: null,
  groupJidSnapshot: '120363000000000001@g.us',
  groupNameSnapshot: 'مجموعة اختبار 1',
  accountId: null,
  accountNameSnapshot: 'حساب اختبار',
};

describe('deduplication.service (requires live PostgreSQL)', () => {
  beforeAll(async () => {
    await queryClient`select 1`; // fail fast with a clear error if no DB is reachable
  });

  beforeEach(async () => {
    await db.delete(extractedNumbers).where(sql`phone_number like '+9665%test%'`);
    await db.delete(extractedNumbers).where(sql`phone_number in ('+966500000001','+966500000002')`);
  });

  afterAll(async () => {
    await db.delete(extractedNumbers).where(sql`phone_number in ('+966500000001','+966500000002')`);
  });

  it('creates exactly one row on first sighting (isNew=true)', async () => {
    const result = await upsertExtractedNumber({ ...baseInput, phoneNumber: '+966500000001' });
    expect(result.isNew).toBe(true);

    const rows = await db
      .select()
      .from(extractedNumbers)
      .where(sql`phone_number = '+966500000001'`);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.occurrenceCount).toBe(1);
  });

  it('does NOT create a second row for the same number seen again — even from a different group/account', async () => {
    await upsertExtractedNumber({ ...baseInput, phoneNumber: '+966500000002' });

    const second = await upsertExtractedNumber({
      ...baseInput,
      phoneNumber: '+966500000002',
      groupJidSnapshot: '120363000000000002@g.us', // مجموعة مختلفة تماماً
      groupNameSnapshot: 'مجموعة اختبار 2',
      accountNameSnapshot: 'حساب اختبار آخر',
    });
    expect(second.isNew).toBe(false);

    const third = await upsertExtractedNumber({ ...baseInput, phoneNumber: '+966500000002' });
    expect(third.isNew).toBe(false);

    const rows = await db
      .select()
      .from(extractedNumbers)
      .where(sql`phone_number = '+966500000002'`);

    // "يبقى سجل واحد فقط داخل قاعدة البيانات" — بغض النظر عن عدد الظهورات
    expect(rows).toHaveLength(1);
    expect(rows[0]?.occurrenceCount).toBe(3);
    // مصدر أول استخراج يبقى كما هو (لا يتغيّر مع كل ظهور لاحق)
    expect(rows[0]?.groupNameSnapshot).toBe('مجموعة اختبار 1');
  });

  it('handles concurrent upserts of the same new number without creating duplicate rows', async () => {
    const phoneNumber = '+966500000099';
    await db.delete(extractedNumbers).where(sql`phone_number = ${phoneNumber}`);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => upsertExtractedNumber({ ...baseInput, phoneNumber })),
    );

    const newCount = results.filter((r) => r.isNew).length;
    expect(newCount).toBe(1); // مرة واحدة فقط "جديد"، البقية "مكرر"

    const rows = await db
      .select()
      .from(extractedNumbers)
      .where(sql`phone_number = ${phoneNumber}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.occurrenceCount).toBe(10);

    await db.delete(extractedNumbers).where(sql`phone_number = ${phoneNumber}`);
  });
});

import { and, count, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../../../db/index.js';
import { extractedNumbers } from '../../../db/schema.js';

export interface NumbersQuery {
  page: number;
  pageSize: number;
  accountId?: string;
  countryIso?: string;
  status?: 'active' | 'invalid' | 'blocked';
  search?: string;
}

export async function queryNumbers(query: NumbersQuery) {
  const offset = (query.page - 1) * query.pageSize;

  const conditions: SQL[] = [];
  if (query.accountId) conditions.push(eq(extractedNumbers.accountId, query.accountId));
  if (query.countryIso) conditions.push(eq(extractedNumbers.countryIso, query.countryIso));
  if (query.status) conditions.push(eq(extractedNumbers.status, query.status));
  if (query.search) conditions.push(ilike(extractedNumbers.phoneNumber, `%${query.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db.query.extractedNumbers.findMany({
      where,
      orderBy: desc(extractedNumbers.extractedAt),
      limit: query.pageSize,
      offset,
    }),
    db.select({ value: count() }).from(extractedNumbers).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;

  return {
    items: rows,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

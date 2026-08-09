import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير جداً').max(255),
  description: z.string().trim().max(2000).optional(),
});

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'لا توجد حقول للتحديث' });

export const accountIdParamSchema = z.object({
  id: z.string().uuid('معرّف الحساب غير صالح'),
});

export const numbersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  accountId: z.string().uuid().optional(),
  countryIso: z
    .string()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional(),
  status: z.enum(['active', 'invalid', 'blocked']).optional(),
  search: z.string().trim().max(32).optional(),
});

export const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

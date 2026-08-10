import { z } from "zod";
export const idParamSchema = z.object({ id: z.string().uuid() });
export const createCampaignSchema = z
  .object({
    name: z.string().trim().min(2).max(255),
    accountIds: z.array(z.string().uuid()).min(1),
    templateIds: z.array(z.string().uuid()).min(1),
    distribution: z
      .enum(["balanced", "sequential", "priority", "random"])
      .default("balanced"),
    minIntervalSeconds: z.number().int().min(30).max(86400).default(60),
    maxIntervalSeconds: z.number().int().min(30).max(86400).default(120),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .default([0, 1, 2, 3, 4, 5, 6]),
    dailyTimes: z
      .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
      .default(["09:00"]),
    durationType: z
      .enum(["day", "week", "month", "year", "unlimited"])
      .default("unlimited"),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine((v) => v.maxIntervalSeconds >= v.minIntervalSeconds, {
    message: "الحد الأقصى للفاصل يجب أن يكون أكبر من الحد الأدنى",
  });
export const deliveriesQuerySchema = z.object({
  campaignId: z.string().uuid().optional(),
  status: z
    .enum([
      "pending",
      "sent",
      "delivered",
      "read",
      "failed",
      "skipped",
      "blocked",
      "invalid_number",
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const createAccountSchema = z.object({
  name: z.string().trim().min(2).max(255),
  phoneNumber: z.string().trim().min(8).max(32),
  phoneNumberId: z.string().trim().min(2).max(128),
  businessAccountId: z.string().trim().min(2).max(128),
  accessToken: z.string().trim().min(20),
});

export const embeddedSignupSchema = z.object({
  code: z.string().trim().min(8).max(4096),
  name: z.string().trim().min(2).max(255),
  phoneNumber: z.string().trim().min(8).max(32),
  phoneNumberId: z.string().trim().min(2).max(128),
  businessAccountId: z.string().trim().min(2).max(128),
});

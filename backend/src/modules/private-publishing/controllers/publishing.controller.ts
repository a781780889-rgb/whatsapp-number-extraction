import type { Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  extractedNumbers,
  publishingAccounts,
  publishingCampaignAccounts,
  publishingCampaignTemplates,
  publishingCampaigns,
  publishingDeliveries,
  publishingTemplates,
} from "../../../db/schema.js";
import { env } from "../../../config/env.js";
import { encryptSecret } from "../../number-extraction/services/crypto.service.js";

export async function overview(_req: Request, res: Response) {
  const [numbers, contacted, accounts, campaigns, pending, sent, failed] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(extractedNumbers)
        .where(
          and(
            eq(extractedNumbers.countryIso, "SA"),
            eq(extractedNumbers.status, "active"),
          ),
        ),
      db
        .select({
          count: sql<number>`count(distinct ${publishingDeliveries.extractedNumberId})`,
        })
        .from(publishingDeliveries)
        .where(
          sql`${publishingDeliveries.status} in ('sent','delivered','read')`,
        ),
      db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) filter (where ${publishingAccounts.status} = 'connected')`,
        })
        .from(publishingAccounts),
      db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) filter (where ${publishingCampaigns.status} in ('scheduled','running','paused'))`,
        })
        .from(publishingCampaigns),
      db
        .select({ count: sql<number>`count(*)` })
        .from(publishingDeliveries)
        .where(eq(publishingDeliveries.status, "pending")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(publishingDeliveries)
        .where(
          sql`${publishingDeliveries.status} in ('sent','delivered','read')`,
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(publishingDeliveries)
        .where(eq(publishingDeliveries.status, "failed")),
    ]);
  const total = Number(numbers[0]?.count ?? 0);
  const used = Number(contacted[0]?.count ?? 0);
  res.json({
    success: true,
    data: {
      totalNumbers: total,
      contactedNumbers: used,
      remainingNumbers: Math.max(total - used, 0),
      activeAccounts: Number(accounts[0]?.active ?? 0),
      totalAccounts: Number(accounts[0]?.total ?? 0),
      activeCampaigns: Number(campaigns[0]?.active ?? 0),
      totalCampaigns: Number(campaigns[0]?.total ?? 0),
      pending: Number(pending[0]?.count ?? 0),
      sent: Number(sent[0]?.count ?? 0),
      failed: Number(failed[0]?.count ?? 0),
    },
  });
}
export async function listAccounts(_req: Request, res: Response) {
  res.json({
    success: true,
    data: await db
      .select({
        id: publishingAccounts.id,
        name: publishingAccounts.name,
        phoneNumber: publishingAccounts.phoneNumber,
        status: publishingAccounts.status,
        sentCount: publishingAccounts.sentCount,
        successCount: publishingAccounts.successCount,
        failedCount: publishingAccounts.failedCount,
        dailyLimit: publishingAccounts.dailyLimit,
        lastActivityAt: publishingAccounts.lastActivityAt,
        priority: publishingAccounts.priority,
      })
      .from(publishingAccounts)
      .orderBy(desc(publishingAccounts.createdAt)),
  });
}
export async function createAccount(req: Request, res: Response) {
  const body = req.body;
  const [row] = await db
    .insert(publishingAccounts)
    .values({
      ...body,
      accessTokenEncrypted: encryptSecret(body.accessToken),
      createdBy: req.user?.sub,
    })
    .returning({
      id: publishingAccounts.id,
      name: publishingAccounts.name,
      phoneNumber: publishingAccounts.phoneNumber,
      status: publishingAccounts.status,
    });
  res.status(201).json({ success: true, data: row });
}
export async function listCampaigns(_req: Request, res: Response) {
  res.json({
    success: true,
    data: await db
      .select()
      .from(publishingCampaigns)
      .orderBy(desc(publishingCampaigns.createdAt)),
  });
}
export async function createCampaign(req: Request, res: Response) {
  const b = req.body;
  const [campaign] = await db
    .insert(publishingCampaigns)
    .values({
      name: b.name,
      distribution: b.distribution,
      minIntervalSeconds: b.minIntervalSeconds,
      maxIntervalSeconds: b.maxIntervalSeconds,
      weekdays: b.weekdays,
      dailyTimes: b.dailyTimes,
      durationType: b.durationType,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      createdBy: req.user?.sub,
      totalRecipients: 0,
    })
    .returning();
  await db
    .insert(publishingCampaignAccounts)
    .values(
      b.accountIds.map((accountId: string) => ({
        campaignId: campaign.id,
        accountId,
      })),
    );
  await db
    .insert(publishingCampaignTemplates)
    .values(
      b.templateIds.map((templateId: string) => ({
        campaignId: campaign.id,
        templateId,
      })),
    );
  res.status(201).json({ success: true, data: campaign });
}
export async function controlCampaign(req: Request, res: Response) {
  const status = req.path.endsWith("/start")
    ? "scheduled"
    : req.path.endsWith("/pause")
      ? "paused"
      : req.path.endsWith("/resume")
        ? "running"
        : "cancelled";
  const [row] = await db
    .update(publishingCampaigns)
    .set({ status, updatedAt: new Date() })
    .where(eq(publishingCampaigns.id, req.params.id))
    .returning();
  res.json({ success: true, data: row });
}
export async function listDeliveries(req: Request, res: Response) {
  const q = req.query as {
    campaignId?: string;
    status?: string;
    limit?: string;
  };
  const filters = [];
  if (q.campaignId)
    filters.push(eq(publishingDeliveries.campaignId, q.campaignId));
  if (q.status)
    filters.push(eq(publishingDeliveries.status, q.status as never));
  res.json({
    success: true,
    data: await db
      .select()
      .from(publishingDeliveries)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(publishingDeliveries.createdAt))
      .limit(Number(q.limit ?? 50)),
  });
}
export async function listTemplates(_req: Request, res: Response) {
  res.json({
    success: true,
    data: await db
      .select()
      .from(publishingTemplates)
      .orderBy(desc(publishingTemplates.createdAt)),
  });
}
export async function health(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      provider: process.env.WHATSAPP_API_VERSION ? "cloud-api" : "not-configured",
      optInRequired: true,
    },
  });
}

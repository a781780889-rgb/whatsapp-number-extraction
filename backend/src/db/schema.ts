import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ============================================================================
 * ENUMS
 * ========================================================================== */

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "operator",
  "viewer",
]);

// حالة الحساب / account lifecycle status
export const accountStatusEnum = pgEnum("account_status", [
  "pending", // تمت إضافته ولم يربط بعد
  "awaiting_qr", // بانتظار مسح رمز QR
  "connecting",
  "connected",
  "stopped", // أوقفه المستخدم يدوياً (الجلسة محفوظة)
  "disconnected", // انقطع الاتصال (سيعاد المحاولة تلقائياً)
  "logged_out", // تم تسجيل الخروج من واتساب فعلياً، يلزم مسح QR من جديد
  "error",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const numberStatusEnum = pgEnum("number_status", [
  "active",
  "invalid",
  "blocked",
]);

export const logLevelEnum = pgEnum("log_level", [
  "info",
  "warn",
  "error",
  "debug",
]);

/* ============================================================================
 * USERS  (auth + least-privilege RBAC — shared/dashboard-wide concern, kept
 * minimal here since it only needs to gate Section 1's endpoints for now)
 * ========================================================================== */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ============================================================================
 * SECTION 1 — سحب الأرقام / Number Extraction
 * ========================================================================== */

// حسابات واتساب الخاصة بقسم السحب فقط (مستقلة تماماً عن حسابات الإرسال)
export const extractionAccounts = pgTable("extraction_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  phoneNumber: varchar("phone_number", { length: 32 }),

  status: accountStatusEnum("status").notNull().default("pending"),
  connectionStatus: varchar("connection_status", { length: 50 })
    .notNull()
    .default("disconnected"),
  qrCode: text("qr_code"), // data URL لآخر QR تم توليده (مؤقت، يُمسح بعد الربط)

  // إحصائيات لحظية يحدّثها extraction.service أثناء العمل
  groupsCount: integer("groups_count").notNull().default(0),
  membersCount: integer("members_count").notNull().default(0),
  extractedCount: integer("extracted_count").notNull().default(0),
  newCount: integer("new_count").notNull().default(0),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  deletedCount: integer("deleted_count").notNull().default(0),

  lastExtractionSpeed: integer("last_extraction_speed"), // أرقام/دقيقة
  lastExtractionDurationMs: integer("last_extraction_duration_ms"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),
  lastOperationAt: timestamp("last_operation_at", { withTimezone: true }),
  lastOperationType: varchar("last_operation_type", { length: 100 }),

  isEnabled: boolean("is_enabled").notNull().default(true), // false = أوقفه المستخدم عمداً (تشغيل/إيقاف)
  autoReconnect: boolean("auto_reconnect").notNull().default(true),

  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// جلسة Baileys مشفّرة (AES-256-GCM) — منفصلة عن جدول الحسابات لتقليل حجم القراءة المتكرر
export const whatsappSessions = pgTable("whatsapp_sessions", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => extractionAccounts.id, { onDelete: "cascade" }),
  encryptedCreds: text("encrypted_creds"),
  encryptedKeys: text("encrypted_keys"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// المجموعات المكتشفة لكل حساب
export const extractionGroups = pgTable(
  "extraction_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").references(() => extractionAccounts.id, {
      onDelete: "set null",
    }),
    accountNameSnapshot: varchar("account_name_snapshot", { length: 255 }),

    groupJid: varchar("group_jid", { length: 128 }).notNull(),
    groupName: varchar("group_name", { length: 255 }),
    memberCount: integer("member_count").notNull().default(0),

    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqAccountGroup: uniqueIndex("uniq_account_group").on(
      table.accountId,
      table.groupJid,
    ),
    groupJidIdx: index("idx_group_jid").on(table.groupJid),
  }),
);

// جدول الأرقام المستخرجة — القيد الفريد على phone_number هو ما يضمن "سجل واحد فقط"
export const extractedNumbers = pgTable(
  "extracted_numbers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull().unique(),

    countryCode: varchar("country_code", { length: 8 }),
    countryIso: varchar("country_iso", { length: 4 }),
    countryNameEn: varchar("country_name_en", { length: 100 }),
    countryNameAr: varchar("country_name_ar", { length: 100 }),

    // مصدر أول استخراج (لا يتغيّر) — للتدقيق والأرشفة
    groupId: uuid("group_id").references(() => extractionGroups.id, {
      onDelete: "set null",
    }),
    groupJidSnapshot: varchar("group_jid_snapshot", { length: 128 }),
    groupNameSnapshot: varchar("group_name_snapshot", { length: 255 }),
    accountId: uuid("account_id").references(() => extractionAccounts.id, {
      onDelete: "set null",
    }),
    accountNameSnapshot: varchar("account_name_snapshot", { length: 255 }),

    extractedAt: timestamp("extracted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    occurrenceCount: integer("occurrence_count").notNull().default(1),

    status: numberStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
  },
  (table) => ({
    countryIdx: index("idx_number_country").on(table.countryIso),
    statusIdx: index("idx_number_status").on(table.status),
    accountIdx: index("idx_number_account").on(table.accountId),
    groupIdx: index("idx_number_group").on(table.groupId),
    extractedAtIdx: index("idx_number_extracted_at").on(table.extractedAt),
  }),
);

// كل تشغيلة سحب (job) — تُستخدم للـ Queue وللوحة المراقبة اللحظية والاستئناف بعد إعادة التشغيل
export const extractionJobs = pgTable(
  "extraction_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => extractionAccounts.id, { onDelete: "cascade" }),
    status: jobStatusEnum("status").notNull().default("queued"),

    totalGroups: integer("total_groups").notNull().default(0),
    processedGroups: integer("processed_groups").notNull().default(0),

    totalExtracted: integer("total_extracted").notNull().default(0),
    newNumbers: integer("new_numbers").notNull().default(0),
    duplicateNumbers: integer("duplicate_numbers").notNull().default(0),
    deletedNumbers: integer("deleted_numbers").notNull().default(0),

    queuedAt: timestamp("queued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    speedPerMinute: integer("speed_per_minute"),

    attempts: integer("attempts").notNull().default(0),
    errorMessage: text("error_message"),

    triggeredBy: uuid("triggered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    triggerType: varchar("trigger_type", { length: 30 })
      .notNull()
      .default("manual"), // manual | auto_on_connect
  },
  (table) => ({
    accountIdx: index("idx_job_account").on(table.accountId),
    statusIdx: index("idx_job_status").on(table.status),
  }),
);

/* ============================================================================
 * SHARED / CROSS-CUTTING — Audit + System logs (apply to Section 1 now,
 * designed so other future sections can reuse the same tables)
 * ========================================================================== */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    userEmailSnapshot: varchar("user_email_snapshot", { length: 255 }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: varchar("entity_id", { length: 100 }),
    details: jsonb("details"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actionIdx: index("idx_audit_action").on(table.action),
    createdAtIdx: index("idx_audit_created").on(table.createdAt),
    userIdx: index("idx_audit_user").on(table.userId),
  }),
);

export const systemLogs = pgTable(
  "system_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    level: logLevelEnum("level").notNull().default("info"),
    module: varchar("module", { length: 100 })
      .notNull()
      .default("number-extraction"),
    message: text("message").notNull(),
    context: jsonb("context"),
    accountId: uuid("account_id").references(() => extractionAccounts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    levelIdx: index("idx_log_level").on(table.level),
    createdAtIdx: index("idx_log_created").on(table.createdAt),
    accountIdx: index("idx_log_account").on(table.accountId),
  }),
);

/* ============================================================================
 * SECTION 2 — النشر ع الخاص / Private Publishing (official WhatsApp Cloud API)
 * ========================================================================== */
export const publishingCampaignStatusEnum = pgEnum(
  "publishing_campaign_status",
  [
    "draft",
    "scheduled",
    "running",
    "paused",
    "completed",
    "cancelled",
    "failed",
  ],
);
export const publishingDeliveryStatusEnum = pgEnum(
  "publishing_delivery_status",
  [
    "pending",
    "sent",
    "delivered",
    "read",
    "failed",
    "skipped",
    "blocked",
    "invalid_number",
  ],
);
export const publishingDistributionEnum = pgEnum("publishing_distribution", [
  "balanced",
  "sequential",
  "priority",
  "random",
]);
export const publishingAccountStatusEnum = pgEnum("publishing_account_status", [
  "pending",
  "connected",
  "disconnected",
  "paused",
  "blocked",
  "error",
]);

export const publishingAccounts = pgTable(
  "publishing_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
    phoneNumberId: varchar("phone_number_id", { length: 128 })
      .notNull()
      .unique(),
    businessAccountId: varchar("business_account_id", {
      length: 128,
    }).notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    connectionProvider: varchar("connection_provider", { length: 40 }).notNull().default("meta_embedded_signup"),
    sessionKeyEncrypted: text("session_key_encrypted"),
    lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
    status: publishingAccountStatusEnum("status").notNull().default("pending"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    sentCount: integer("sent_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    dailyLimit: integer("daily_limit").notNull().default(100),
    priority: integer("priority").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_publishing_account_status").on(table.status),
  }),
);

export const publishingTemplates = pgTable(
  "publishing_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => publishingAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    language: varchar("language", { length: 20 }).notNull().default("ar"),
    category: varchar("category", { length: 30 })
      .notNull()
      .default("MARKETING"),
    bodyText: text("body_text").notNull(),
    mediaUrl: text("media_url"),
    mediaType: varchar("media_type", { length: 20 }),
    isApproved: boolean("is_approved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    accountIdx: index("idx_publishing_template_account").on(table.accountId),
  }),
);

export const publishingCampaigns = pgTable(
  "publishing_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    status: publishingCampaignStatusEnum("status").notNull().default("draft"),
    distribution: publishingDistributionEnum("distribution")
      .notNull()
      .default("balanced"),
    minIntervalSeconds: integer("min_interval_seconds").notNull().default(60),
    maxIntervalSeconds: integer("max_interval_seconds").notNull().default(120),
    weekdays: integer("weekdays").array().notNull().default([]),
    dailyTimes: varchar("daily_times", { length: 5 })
      .array()
      .notNull()
      .default([]),
    durationType: varchar("duration_type", { length: 20 })
      .notNull()
      .default("unlimited"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    totalRecipients: integer("total_recipients").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    deliveredCount: integer("delivered_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_publishing_campaign_status").on(table.status),
  }),
);

export const publishingCampaignAccounts = pgTable(
  "publishing_campaign_accounts",
  {
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => publishingCampaigns.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => publishingAccounts.id, { onDelete: "cascade" }),
    messageQuota: integer("message_quota").notNull().default(0),
    priority: integer("priority").notNull().default(0),
    assignedCount: integer("assigned_count").notNull().default(0),
  },
  (table) => ({
    pk: uniqueIndex("pk_publishing_campaign_account").on(
      table.campaignId,
      table.accountId,
    ),
  }),
);

export const publishingCampaignTemplates = pgTable(
  "publishing_campaign_templates",
  {
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => publishingCampaigns.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => publishingTemplates.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: uniqueIndex("pk_publishing_campaign_template").on(
      table.campaignId,
      table.templateId,
    ),
  }),
);

export const publishingDeliveries = pgTable(
  "publishing_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => publishingCampaigns.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => publishingAccounts.id, { onDelete: "restrict" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => publishingTemplates.id, { onDelete: "restrict" }),
    extractedNumberId: uuid("extracted_number_id")
      .notNull()
      .references(() => extractedNumbers.id, { onDelete: "restrict" }),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
    status: publishingDeliveryStatusEnum("status").notNull().default("pending"),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    attempt: integer("attempt").notNull().default(0),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    dedupeIdx: uniqueIndex("uniq_publishing_campaign_number_template").on(
      table.campaignId,
      table.extractedNumberId,
      table.templateId,
    ),
    statusIdx: index("idx_publishing_delivery_status").on(table.status),
    campaignIdx: index("idx_publishing_delivery_campaign").on(table.campaignId),
  }),
);

/* ============================================================================
 * RELATIONS (for ergonomic Drizzle relational queries)
 * ========================================================================== */

export const usersRelations = relations(users, ({ many }) => ({
  createdAccounts: many(extractionAccounts),
  auditLogs: many(auditLogs),
}));

export const extractionAccountsRelations = relations(
  extractionAccounts,
  ({ one, many }) => ({
    session: one(whatsappSessions, {
      fields: [extractionAccounts.id],
      references: [whatsappSessions.accountId],
    }),
    groups: many(extractionGroups),
    jobs: many(extractionJobs),
    numbers: many(extractedNumbers),
    createdByUser: one(users, {
      fields: [extractionAccounts.createdBy],
      references: [users.id],
    }),
  }),
);

export const whatsappSessionsRelations = relations(
  whatsappSessions,
  ({ one }) => ({
    account: one(extractionAccounts, {
      fields: [whatsappSessions.accountId],
      references: [extractionAccounts.id],
    }),
  }),
);

export const extractionGroupsRelations = relations(
  extractionGroups,
  ({ one, many }) => ({
    account: one(extractionAccounts, {
      fields: [extractionGroups.accountId],
      references: [extractionAccounts.id],
    }),
    numbers: many(extractedNumbers),
  }),
);

export const extractedNumbersRelations = relations(
  extractedNumbers,
  ({ one }) => ({
    group: one(extractionGroups, {
      fields: [extractedNumbers.groupId],
      references: [extractionGroups.id],
    }),
    account: one(extractionAccounts, {
      fields: [extractedNumbers.accountId],
      references: [extractionAccounts.id],
    }),
  }),
);

export const extractionJobsRelations = relations(extractionJobs, ({ one }) => ({
  account: one(extractionAccounts, {
    fields: [extractionJobs.accountId],
    references: [extractionAccounts.id],
  }),
  triggeredByUser: one(users, {
    fields: [extractionJobs.triggeredBy],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ExtractionAccount = typeof extractionAccounts.$inferSelect;
export type NewExtractionAccount = typeof extractionAccounts.$inferInsert;
export type ExtractionGroup = typeof extractionGroups.$inferSelect;
export type ExtractedNumber = typeof extractedNumbers.$inferSelect;
export type NewExtractedNumber = typeof extractedNumbers.$inferInsert;
export type ExtractionJob = typeof extractionJobs.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;

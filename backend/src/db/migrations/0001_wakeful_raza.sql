CREATE TYPE "public"."publishing_account_status" AS ENUM('pending', 'connected', 'disconnected', 'paused', 'blocked', 'error');--> statement-breakpoint
CREATE TYPE "public"."publishing_campaign_status" AS ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."publishing_delivery_status" AS ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'skipped', 'blocked', 'invalid_number');--> statement-breakpoint
CREATE TYPE "public"."publishing_distribution" AS ENUM('balanced', 'sequential', 'priority', 'random');--> statement-breakpoint
CREATE TABLE "publishing_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone_number" varchar(32) NOT NULL,
	"phone_number_id" varchar(128) NOT NULL,
	"business_account_id" varchar(128) NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"status" "publishing_account_status" DEFAULT 'pending' NOT NULL,
	"last_activity_at" timestamp with time zone,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"daily_limit" integer DEFAULT 100 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishing_accounts_phone_number_id_unique" UNIQUE("phone_number_id")
);
--> statement-breakpoint
CREATE TABLE "publishing_campaign_accounts" (
	"campaign_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"message_quota" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"assigned_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing_campaign_templates" (
	"campaign_id" uuid NOT NULL,
	"template_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "publishing_campaign_status" DEFAULT 'draft' NOT NULL,
	"distribution" "publishing_distribution" DEFAULT 'balanced' NOT NULL,
	"min_interval_seconds" integer DEFAULT 60 NOT NULL,
	"max_interval_seconds" integer DEFAULT 120 NOT NULL,
	"weekdays" integer[] DEFAULT '{}' NOT NULL,
	"daily_times" varchar(5)[] DEFAULT '{}' NOT NULL,
	"duration_type" varchar(20) DEFAULT 'unlimited' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"extracted_number_id" uuid NOT NULL,
	"phone_number" varchar(32) NOT NULL,
	"status" "publishing_delivery_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" varchar(255),
	"attempt" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(100),
	"error_message" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"language" varchar(20) DEFAULT 'ar' NOT NULL,
	"category" varchar(30) DEFAULT 'MARKETING' NOT NULL,
	"body_text" text NOT NULL,
	"media_url" text,
	"media_type" varchar(20),
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "publishing_accounts" ADD CONSTRAINT "publishing_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_campaign_accounts" ADD CONSTRAINT "publishing_campaign_accounts_campaign_id_publishing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."publishing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_campaign_accounts" ADD CONSTRAINT "publishing_campaign_accounts_account_id_publishing_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."publishing_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_campaign_templates" ADD CONSTRAINT "publishing_campaign_templates_campaign_id_publishing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."publishing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_campaign_templates" ADD CONSTRAINT "publishing_campaign_templates_template_id_publishing_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."publishing_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_campaigns" ADD CONSTRAINT "publishing_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_deliveries" ADD CONSTRAINT "publishing_deliveries_campaign_id_publishing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."publishing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_deliveries" ADD CONSTRAINT "publishing_deliveries_account_id_publishing_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."publishing_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_deliveries" ADD CONSTRAINT "publishing_deliveries_template_id_publishing_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."publishing_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_deliveries" ADD CONSTRAINT "publishing_deliveries_extracted_number_id_extracted_numbers_id_fk" FOREIGN KEY ("extracted_number_id") REFERENCES "public"."extracted_numbers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_templates" ADD CONSTRAINT "publishing_templates_account_id_publishing_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."publishing_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_publishing_account_status" ON "publishing_accounts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pk_publishing_campaign_account" ON "publishing_campaign_accounts" USING btree ("campaign_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pk_publishing_campaign_template" ON "publishing_campaign_templates" USING btree ("campaign_id","template_id");--> statement-breakpoint
CREATE INDEX "idx_publishing_campaign_status" ON "publishing_campaigns" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_publishing_campaign_number_template" ON "publishing_deliveries" USING btree ("campaign_id","extracted_number_id","template_id");--> statement-breakpoint
CREATE INDEX "idx_publishing_delivery_status" ON "publishing_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_publishing_delivery_campaign" ON "publishing_deliveries" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_publishing_template_account" ON "publishing_templates" USING btree ("account_id");
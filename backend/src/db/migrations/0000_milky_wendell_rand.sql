CREATE TYPE "public"."account_status" AS ENUM('pending', 'awaiting_qr', 'connecting', 'connected', 'stopped', 'disconnected', 'logged_out', 'error');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('info', 'warn', 'error', 'debug');--> statement-breakpoint
CREATE TYPE "public"."number_status" AS ENUM('active', 'invalid', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'operator', 'viewer');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_email_snapshot" varchar(255),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" varchar(100),
	"details" jsonb,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(32) NOT NULL,
	"country_code" varchar(8),
	"country_iso" varchar(4),
	"country_name_en" varchar(100),
	"country_name_ar" varchar(100),
	"group_id" uuid,
	"group_jid_snapshot" varchar(128),
	"group_name_snapshot" varchar(255),
	"account_id" uuid,
	"account_name_snapshot" varchar(255),
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"status" "number_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "extracted_numbers_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "extraction_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"phone_number" varchar(32),
	"status" "account_status" DEFAULT 'pending' NOT NULL,
	"connection_status" varchar(50) DEFAULT 'disconnected' NOT NULL,
	"qr_code" text,
	"groups_count" integer DEFAULT 0 NOT NULL,
	"members_count" integer DEFAULT 0 NOT NULL,
	"extracted_count" integer DEFAULT 0 NOT NULL,
	"new_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"deleted_count" integer DEFAULT 0 NOT NULL,
	"last_extraction_speed" integer,
	"last_extraction_duration_ms" integer,
	"last_activity_at" timestamp with time zone,
	"last_connected_at" timestamp with time zone,
	"last_operation_at" timestamp with time zone,
	"last_operation_type" varchar(100),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"auto_reconnect" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"account_name_snapshot" varchar(255),
	"group_jid" varchar(128) NOT NULL,
	"group_name" varchar(255),
	"member_count" integer DEFAULT 0 NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"total_groups" integer DEFAULT 0 NOT NULL,
	"processed_groups" integer DEFAULT 0 NOT NULL,
	"total_extracted" integer DEFAULT 0 NOT NULL,
	"new_numbers" integer DEFAULT 0 NOT NULL,
	"duplicate_numbers" integer DEFAULT 0 NOT NULL,
	"deleted_numbers" integer DEFAULT 0 NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"speed_per_minute" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"triggered_by" uuid,
	"trigger_type" varchar(30) DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "log_level" DEFAULT 'info' NOT NULL,
	"module" varchar(100) DEFAULT 'number-extraction' NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_sessions" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"encrypted_creds" text,
	"encrypted_keys" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_numbers" ADD CONSTRAINT "extracted_numbers_group_id_extraction_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."extraction_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_numbers" ADD CONSTRAINT "extracted_numbers_account_id_extraction_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."extraction_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_accounts" ADD CONSTRAINT "extraction_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_groups" ADD CONSTRAINT "extraction_groups_account_id_extraction_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."extraction_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_account_id_extraction_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."extraction_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_account_id_extraction_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."extraction_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_account_id_extraction_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."extraction_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_number_country" ON "extracted_numbers" USING btree ("country_iso");--> statement-breakpoint
CREATE INDEX "idx_number_status" ON "extracted_numbers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_number_account" ON "extracted_numbers" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_number_group" ON "extracted_numbers" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_number_extracted_at" ON "extracted_numbers" USING btree ("extracted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_account_group" ON "extraction_groups" USING btree ("account_id","group_jid");--> statement-breakpoint
CREATE INDEX "idx_group_jid" ON "extraction_groups" USING btree ("group_jid");--> statement-breakpoint
CREATE INDEX "idx_job_account" ON "extraction_jobs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_job_status" ON "extraction_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_log_level" ON "system_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_log_created" ON "system_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_log_account" ON "system_logs" USING btree ("account_id");
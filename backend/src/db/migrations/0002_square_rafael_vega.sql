ALTER TABLE "publishing_accounts" ADD COLUMN "connection_provider" varchar(40) DEFAULT 'meta_embedded_signup' NOT NULL;--> statement-breakpoint
ALTER TABLE "publishing_accounts" ADD COLUMN "session_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "publishing_accounts" ADD COLUMN "last_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "publishing_accounts" ADD COLUMN "disconnected_at" timestamp with time zone;
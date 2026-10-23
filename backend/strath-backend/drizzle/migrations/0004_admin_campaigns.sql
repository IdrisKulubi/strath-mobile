CREATE TABLE IF NOT EXISTS "admin_campaigns" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "subject" text NOT NULL,
    "preview_text" text,
    "audience" text NOT NULL,
    "channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "content_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "push_title" text,
    "push_body" text,
    "cta_url" text,
    "cta_label" text,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "email_success_count" integer DEFAULT 0 NOT NULL,
    "email_failure_count" integer DEFAULT 0 NOT NULL,
    "push_success_count" integer DEFAULT 0 NOT NULL,
    "push_failure_count" integer DEFAULT 0 NOT NULL,
    "status" text DEFAULT 'sent' NOT NULL,
    "sent_by_user_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "sent_at" timestamp
);

CREATE TABLE IF NOT EXISTS "admin_campaign_recipients" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" uuid NOT NULL,
    "user_id" text NOT NULL,
    "email" text,
    "push_token" text,
    "email_status" text DEFAULT 'skipped' NOT NULL,
    "push_status" text DEFAULT 'skipped' NOT NULL,
    "error" text,
    "sent_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
    ALTER TABLE "admin_campaigns"
        ADD CONSTRAINT "admin_campaigns_sent_by_user_id_user_id_fk"
        FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."user"("id")
        ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "admin_campaign_recipients"
        ADD CONSTRAINT "admin_campaign_recipients_campaign_id_admin_campaigns_id_fk"
        FOREIGN KEY ("campaign_id") REFERENCES "public"."admin_campaigns"("id")
        ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "admin_campaign_recipients"
        ADD CONSTRAINT "admin_campaign_recipients_user_id_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
        ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "admin_campaigns_created_at_idx" ON "admin_campaigns" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "admin_campaigns_sent_at_idx" ON "admin_campaigns" USING btree ("sent_at");
CREATE INDEX IF NOT EXISTS "admin_campaigns_audience_idx" ON "admin_campaigns" USING btree ("audience");
CREATE INDEX IF NOT EXISTS "admin_campaigns_sent_by_idx" ON "admin_campaigns" USING btree ("sent_by_user_id");
CREATE INDEX IF NOT EXISTS "admin_campaign_recipients_campaign_idx" ON "admin_campaign_recipients" USING btree ("campaign_id");
CREATE INDEX IF NOT EXISTS "admin_campaign_recipients_user_idx" ON "admin_campaign_recipients" USING btree ("user_id");

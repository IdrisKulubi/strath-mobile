CREATE TABLE "app_feature_flags" (
    "key" text PRIMARY KEY NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "description" text,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "updated_by_user_id" text
);

ALTER TABLE "app_feature_flags"
ADD CONSTRAINT "app_feature_flags_updated_by_user_id_user_id_fk"
FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "app_feature_flags_updated_by_idx" ON "app_feature_flags" USING btree ("updated_by_user_id");

INSERT INTO "app_feature_flags" ("key", "enabled", "description")
VALUES (
    'demo_login_enabled',
    false,
    'Allow the demo login button and demo session endpoint for App Review.'
)
ON CONFLICT ("key") DO NOTHING;

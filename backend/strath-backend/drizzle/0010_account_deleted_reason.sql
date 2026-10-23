ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deleted_reason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text;

ALTER TABLE "date_locations"
ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "date_locations_default_idx" ON "date_locations" ("is_default")
WHERE "is_default" = true;

ALTER TABLE "profiles"
ADD COLUMN "current_location" text;

ALTER TABLE "profiles"
ADD COLUMN "location_latitude" text;

ALTER TABLE "profiles"
ADD COLUMN "location_longitude" text;

ALTER TABLE "profiles"
ADD COLUMN "location_permission_status" text DEFAULT 'unknown';

ALTER TABLE "profiles"
ADD COLUMN "location_updated_at" timestamp;

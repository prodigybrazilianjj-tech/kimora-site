ALTER TABLE "wholesale_applications" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wholesale_applications" ALTER COLUMN "member_count" SET NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "wholesale_applications_status_idx"
ON "wholesale_applications" USING btree ("status");--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'wholesale_phone_len_chk'
      AND c.conrelid = 'wholesale_applications'::regclass
  ) THEN
    ALTER TABLE "wholesale_applications"
      ADD CONSTRAINT "wholesale_phone_len_chk"
      CHECK (length(regexp_replace("wholesale_applications"."phone", '\D', '', 'g')) >= 10);
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'wholesale_member_count_chk'
      AND c.conrelid = 'wholesale_applications'::regclass
  ) THEN
    ALTER TABLE "wholesale_applications"
      ADD CONSTRAINT "wholesale_member_count_chk"
      CHECK ("wholesale_applications"."member_count" > 0);
  END IF;
END $$;

-- 0008_wholesale_shipping_and_optional_members.sql
--
-- Run manually against Kimora Prod (Render Postgres) via SQLTools.
-- Do NOT use `npm run db:push` against prod.
--
-- ⚠️ RUN THIS BEFORE PUSHING THE CODE THAT GOES WITH IT. The new server code
-- inserts shipping_address / shipping_zip; without these columns every
-- wholesale application returns a 500. The reverse order is safe: the OLD code
-- runs fine against the NEW schema.
--
-- WHY (Alex, 2026-09-18)
--   * Shipping address becomes mandatory on both wholesale forms. It had no
--     column: the in-person tool was sending the street address as
--     `retail_setup` (varchar 32, so truncated) and never sent the ZIP.
--   * Active-member count becomes optional.
--
-- The new columns are nullable on purpose — rows before today have no address.
-- "Required" is enforced by the API for new rows.
-- wholesale_member_count_chk (member_count > 0) is kept: a CHECK passes on NULL.

BEGIN;

ALTER TABLE wholesale_applications
  ADD COLUMN IF NOT EXISTS shipping_address text,
  ADD COLUMN IF NOT EXISTS shipping_zip varchar(16);

ALTER TABLE wholesale_applications
  ALTER COLUMN member_count DROP NOT NULL;

COMMIT;

-- Verify:
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name = 'wholesale_applications'
--     AND column_name IN ('shipping_address','shipping_zip','member_count');
--   -- expect three rows, all is_nullable = YES

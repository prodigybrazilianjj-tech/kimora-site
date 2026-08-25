-- 0007_waitlist_status_and_bot_quarantine.sql
--
-- Run manually against Kimora Prod (Render Postgres) via SQLTools.
-- Do NOT use `npm run db:push` against prod.
--
-- WHY THIS EXISTS
-- Between 2026-08-01 and 2026-08-11 a distributed bot pushed 388 addresses
-- through POST /api/email-capture. Each insert fired a Resend "here's your
-- discount" email to a scraped inbox. The per-IP rate limiter never tripped
-- because the traffic was spread across many IPs.
--
-- Waitlist composition before this migration:
--   marketing-capture   388   <- the flood
--   formspree-legacy     12   <- imported old-site list
--   coming-soon           7   <- real signups (2 are Alex's own test rows)
--   ------------------------
--   TOTAL               407
--
-- The rows are QUARANTINED, not deleted: the flood is evidence, a false
-- positive stays reversible, and future breaker overflow lands in the same
-- bucket. Everything downstream filters on status.

BEGIN;

-- 1. The lifecycle flag. Existing rows default to 'active'; step 2 parks
--    the flood. New rows come in 'active' unless botGuard's breaker is open.
ALTER TABLE waitlist_emails
  ADD COLUMN IF NOT EXISTS status varchar(24) NOT NULL DEFAULT 'active';

-- 2. Park the flood.
--    Scoped by DATE as well as source, so any genuine marketing-capture
--    signup after the flood window is untouched by this migration.
UPDATE waitlist_emails
   SET status = 'quarantined'
 WHERE source = 'marketing-capture'
   AND created_at < TIMESTAMPTZ '2026-08-12 00:00:00-07'
   AND status <> 'quarantined';

-- 3. The admin list and every future send filter on status, so index it.
CREATE INDEX IF NOT EXISTS waitlist_emails_status_created_idx
  ON waitlist_emails (status, created_at DESC);

COMMIT;


-- ---------------------------------------------------------------------------
-- VERIFY (run after committing; expect 388 quarantined / 19 active)
-- ---------------------------------------------------------------------------
-- SELECT status, source, count(*)
--   FROM waitlist_emails
--  GROUP BY status, source
--  ORDER BY status, source;
--
-- SELECT count(*) AS real_people
--   FROM waitlist_emails
--  WHERE status = 'active';


-- ---------------------------------------------------------------------------
-- RESCUE a false positive (if a real person is found among the 388)
-- ---------------------------------------------------------------------------
-- UPDATE waitlist_emails
--    SET status = 'active'
--  WHERE email IN ('someone@example.com');


-- ---------------------------------------------------------------------------
-- FULL ROLLBACK of this migration
-- ---------------------------------------------------------------------------
-- UPDATE waitlist_emails SET status = 'active' WHERE status = 'quarantined';
-- DROP INDEX IF EXISTS waitlist_emails_status_created_idx;
-- ALTER TABLE waitlist_emails DROP COLUMN IF EXISTS status;


-- ---------------------------------------------------------------------------
-- HARD DELETE instead (NOT the chosen path — kept only so the option is
-- written down rather than reinvented under pressure). Irreversible.
-- ---------------------------------------------------------------------------
-- DELETE FROM waitlist_emails
--  WHERE source = 'marketing-capture'
--    AND created_at < TIMESTAMPTZ '2026-08-12 00:00:00-07';

-- ─────────────────────────────────────────────────────────────────────────────
-- Commission decline support + status history
--
-- 1. Adds 'declined' to the commission_status enum
-- 2. Adds status_note / declined_at columns to commissions
-- 3. Creates commission_events — an append-only history of every status
--    transition (approve, decline, fail, return, pay…) with notes and actor
--
-- Apply with: supabase db push   (or paste into the SQL editor)
-- The app code in src/actions/commissions.ts depends on this migration.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enum value (safe to re-run; ADD VALUE IF NOT EXISTS is idempotent)
ALTER TYPE commission_status ADD VALUE IF NOT EXISTS 'declined';

-- 2. Columns on commissions
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

-- 3. History table
CREATE TABLE IF NOT EXISTS commission_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  commission_id uuid NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  event_type  text NOT NULL,          -- approved | declined | processing | paid | failed | returned | reapproved
  from_status text,
  to_status   text,
  note        text,
  performed_by uuid,                  -- auth.users id (nullable for system events)
  performed_by_name text
);

CREATE INDEX IF NOT EXISTS idx_commission_events_commission
  ON commission_events (commission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_commission_events_company
  ON commission_events (company_id, created_at DESC);

-- RLS: staff of the company can read; writes go through the service role only
ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read own company commission events" ON commission_events;
CREATE POLICY "Staff can read own company commission events"
  ON commission_events FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_staff WHERE user_id = auth.uid()
    )
  );

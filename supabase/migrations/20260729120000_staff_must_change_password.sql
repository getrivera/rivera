-- ─────────────────────────────────────────────────────────────────────────────
-- Forced password reset for directly-created staff accounts
--
-- Used by createStaffDirect (src/actions/settings.ts) — when an admin adds a
-- staff member with the "Add user" flow, the account is created immediately
-- with a system-generated temporary password. This flag forces them to set
-- their own password before they can use the app (checked in
-- src/app/(company)/layout.tsx, cleared in resetPassword / src/actions/auth.ts).
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE company_staff
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
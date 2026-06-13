-- ─────────────────────────────────────────────────────────────────────────────
-- Performance indexes for frequently queried columns
--
-- Every list page filters by company_id and orders by created_at; lookups by
-- buyer_id / partner_id / account_number happen on the hot path (sale detail,
-- webhooks). These are all cheap composite/single-column btree indexes.
--
-- Safe to re-run (IF NOT EXISTS everywhere). Apply with supabase db push.
-- ─────────────────────────────────────────────────────────────────────────────

-- Buyers (sales lists, partner backfill)
CREATE INDEX IF NOT EXISTS idx_buyers_company_created
  ON buyers (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyers_partner
  ON buyers (partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buyers_referring_pc
  ON buyers (referring_partner_company_id) WHERE referring_partner_company_id IS NOT NULL;

-- Invoices (list page, sale detail lookup, public token)
CREATE INDEX IF NOT EXISTS idx_buyer_invoices_company_created
  ON buyer_invoices (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_invoices_buyer
  ON buyer_invoices (buyer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyer_invoices_public_token
  ON buyer_invoices (public_token);

-- Receipts
CREATE INDEX IF NOT EXISTS idx_invoice_receipts_invoice
  ON invoice_receipts (buyer_invoice_id, issued_at DESC);

-- Commissions (list page, trigger lookups by buyer)
CREATE INDEX IF NOT EXISTS idx_commissions_company_status
  ON commissions (company_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_company_created
  ON commissions (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_buyer
  ON commissions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_partner
  ON commissions (partner_id);

-- Partner network
CREATE INDEX IF NOT EXISTS idx_partner_companies_company
  ON partner_companies (company_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_companies_partner
  ON partner_companies (partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_companies_invited_email
  ON partner_companies (invited_email) WHERE invited_email IS NOT NULL;

-- Listings
CREATE INDEX IF NOT EXISTS idx_listings_company_status
  ON listings (company_id, status);

-- Virtual accounts & transactions (webhook hot path)
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_account_number
  ON virtual_accounts (account_number);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_buyer
  ON virtual_accounts (buyer_id);
CREATE INDEX IF NOT EXISTS idx_va_transactions_va
  ON va_transactions (virtual_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_va_transactions_reference
  ON va_transactions (paystack_reference);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_company_created
  ON audit_log (company_id, created_at DESC);

-- Staff lookup (every server action starts with this query)
CREATE INDEX IF NOT EXISTS idx_company_staff_user
  ON company_staff (user_id);

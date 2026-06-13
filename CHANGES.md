# Rivera — Review Changes (rivera-reviewed)

Everything below was implemented and the full codebase passes `tsc --noEmit`.
`.git`, `.next` and `node_modules` are excluded from this archive — copy `src/`
and `supabase/` over your working tree (or diff them) and run `pnpm install`.

## ⚠️ Before you deploy

1. **Apply the migrations first** (Supabase SQL editor or `supabase db push`):
   - `supabase/migrations/20260611100000_commission_decline_and_events.sql` —
     adds the `declined` commission status, `status_note`/`declined_at` columns,
     and the `commission_events` history table. **The decline feature errors
     without this.** Note: Postgres requires `ALTER TYPE … ADD VALUE` to be run
     outside an explicit transaction block — run it as its own statement if the
     editor complains.
   - `supabase/migrations/20260611100001_performance_indexes.sql` — ~25 indexes
     on the hot paths (safe to run anytime, all `IF NOT EXISTS`).

2. **Business-logic change to review: unit quantity now affects money.**
   Invoices and commissions previously ignored `unit_quantity` — a 3-unit sale
   was invoiced for 1 unit's price and earned 1 unit's commission. Now:
   - `createInvoice` multiplies the total (outright price, or plan deposit +
     installments) by quantity.
   - `createCommission` multiplies both fixed (per-unit) and percentage
     commissions by quantity.
   If your intent was "fixed commission per sale regardless of units", revert
   the `* quantity` on the fixed branch in `src/actions/commissions.ts`.

3. `updateSaleStatus` marking a sale `fully_paid` still force-completes the
   invoice (existing behaviour, unchanged) — but invoices can no longer be
   regressed by "send".

---

## Bug 1 — Referral/invite link 404

**Root cause:** `invite-partner-modal.tsx` generates
`https://{host}/invite?code={companyCode}`, but no `/invite` route existed.

**Fix:**
- New `src/app/invite/page.tsx` — branded landing page that validates the code,
  shows the inviting company, and routes to partner signup or login with the
  code carried in the URL.
- Partner **signup** and **join** pages prefill the company code from `?code=`.
- Partner **login** forwards `?code=` to `/partner/join?code=…` after login.
- `joinCompanyWithCode` fixed twice:
  - A partner invited by email who joins via code now has their existing
    `invited` row **activated** instead of a duplicate row being inserted.
  - With `NEXT_PUBLIC_PARTNER_MULTI_COMPANY` off, joining your **first**
    company is now allowed (previously every code join was blocked, making
    invite links a dead end).

## Bug 2 — Invoice status not reflecting partial payments

Three compounding causes, all fixed:

1. **Webhook dropped real payments** (`src/app/api/webhooks/paystack-va/route.ts`):
   - The account number was only read from `data.dedicated_account`, which
     dedicated-NUBAN `charge.success` payloads don't reliably include — so the
     VA lookup failed and the payment was silently discarded. It's now resolved
     from `dedicated_account` → `authorization.receiver_bank_account_number` →
     `metadata.receiver_account_number`.
   - `dedicatedaccount.assign.success` (an account *assignment* event with no
     payment) was being run through the payment path. Only `charge.success`
     is processed now.
   - Inserts are error-checked; a failed transaction insert returns 500 so
     Paystack retries instead of losing the event.

2. **`sendInvoice` regressed status:** it unconditionally wrote `status='sent'`,
   wiping `partially_paid`. Now only `draft → sent`; later sends just refresh
   `sent_at`.

3. **Buyers stuck on "pending deposit":** the first payment now moves the buyer
   `pending_deposit → on_track` (both in the webhook and `recordPayment`).

`recordPayment` additionally: validates the amount (comma-safe), rejects
overpayment beyond the outstanding balance, fires commission triggers only
**after** the write succeeds (previously before), uses an optimistic-concurrency
guard so a webhook landing mid-action can't double-count, and revalidates the
sale page. The invoices list also gained a **Balance** column.

## Features

3. **Comma-formatted price inputs** — new `MoneyInput`
   (`src/components/ui/money-input.tsx`) shows `5,000,000` as you type and
   submits the raw number. Wired into: new listing (price + fixed commission),
   listing edit, installment plan deposit/amount, and the record-payment modal.
   Server-side, `parseNumberInput` (in `src/lib/utils.ts`) strips commas/₦ —
   important because `parseFloat("5,000,000")` is `5`. Applied across
   `listings.ts` and `invoices.ts`.

4. **Unit quantity on sale detail** — the Listing card now shows price *per
   unit*, the quantity, and the total value for multi-unit sales. (Plus the
   billing change in the warning above.) Quantity is validated ≥ 1 server-side.

5. **Resend invoice** — new `resendInvoice` action + "Resend invoice" menu item
   for sent / partially paid / paid invoices.

6. **Decline commission (note required)** — new `declineCommission` action.
   Declinable from `due` or `approved`; the note is mandatory (min 5 chars,
   enforced server-side and in the modal). Declined commissions can be
   re-approved, which clears the note. New `declined` status appears in the
   table, filter, and status styles.

7. **Commission history with notes** — every approve / decline / processing /
   paid / failed / returned transition is recorded in `commission_events`
   (who, when, from → to, note). Shown as a timeline in the expanded commission
   row. Failure/return notes are now **required** too, and the latest note is
   persisted on the commission (`status_note`) and shown in a banner.

8. **Invoice sending actually sends an email** — previously "Mark as sent" only
   flipped a flag. `sendInvoice`/`resendInvoice` now email the buyer a branded
   invoice (totals, paid, balance due, the public no-login link, and the
   buyer's virtual-account transfer details when one exists) via
   `src/lib/invoice-email.ts`, using the company's email identity from
   `email-config.ts`. If the buyer has no email, the invoice is still marked
   sent and the UI explains why no email went out.

## Security fixes

- **Partner listing detail was cross-tenant readable** — any partner could open
  any company's active listing by ID. Now scoped to the partner's active
  companies (`src/app/partner/(portal)/listings/[id]/page.tsx`).
- `updateSaleStatus` accepted arbitrary strings; now whitelisted to valid
  buyer statuses.
- `registerSale` / `partnerRegisterSale` now verify the chosen installment plan
  belongs to the chosen listing (and company) — previously any plan ID from any
  company was accepted, which corrupts invoice totals.
- `registerSale` also verifies the listing belongs to the staff's company.
- Webhook idempotency now uses `maybeSingle` and a unique index on
  `va_transactions.paystack_reference` (migration 2) — duplicates are blocked
  at the database level even under concurrent webhook delivery.

## Speed fixes

- **Sale detail page:** 8 sequential queries → 1 + parallel batch
  (`Promise.all`). This was the slowest page in the app.
- **Invoice detail, public invoice, partners list:** dependent fetches
  parallelized the same way.
- `getTenant()` wrapped in React `cache()` — one lookup per request.
- List queries capped at 500 rows (sales, invoices, commissions — audit already
  was) so pages don't degrade as data grows. Proper pagination is the natural
  next step when any company approaches that.
- ~25 indexes in migration 2, including `company_staff(user_id)` which every
  single server action hits.
- Invoices table rows navigate with `router.push` instead of a full page
  reload (`window.location.href`).

## UI/UX

- Modals (commission confirm, record payment, void) close on Escape and on
  clicking the backdrop.
- Required-note fields show inline validation and disable the confirm button
  until valid.
- Invoice actions show green success messages (e.g. "Invoice email re-sent"),
  and the Actions menu stays available on paid invoices (for resend) while
  hiding Void.
- "Mark as sent" relabelled "Send to buyer" since it now emails.
- Approve button reads "Re-approve" on failed/returned/declined commissions.

## Recommended next (not implemented)

- Cursor pagination on sales/invoices/commissions once any tenant nears 500 rows.
- Regenerate `src/types/supabase.ts` with the Supabase CLI — it's drifted from
  the real schema (e.g. `virtual_accounts.is_active`, `va_transactions.paystack_reference`,
  `buyers.unit_quantity` are missing), which forces the `(adminClient as any)`
  casts everywhere and hides exactly the kind of column mismatch that caused Bug 2.
- Move the buyer-status / invoice-status / receipt writes in the webhook into a
  single Postgres function for true atomicity.
- Rate-limit `/invite` code validation (it's an unauthenticated company-code oracle).

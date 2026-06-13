// ─────────────────────────────────────────────────────────────────────────────
// Rivera — Supabase Database Types
// Manually maintained until Supabase CLI is introduced.
// Keep in sync with migrations.
// ─────────────────────────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          slug: string
          address: string | null
          phone: string | null
          custom_domain: string | null
          company_code: string
          logo_url: string | null
          brand_colour: string | null
          subscription_plan: Database['public']['Enums']['subscription_plan']
          subscription_status: Database['public']['Enums']['subscription_status']
          subscription_ends_at: string | null
          rc_number: string | null
          verified_at: string | null
          show_leaderboard: boolean
          show_units_to_partners: boolean
          leaderboard_public_token: string | null
          commission_payout_mode: 'manual' | 'auto_approve'
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      company_staff: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          user_id: string
          role: Database['public']['Enums']['staff_role']
          invited_by: string | null
          status: string
        }
        Insert: Omit<Database['public']['Tables']['company_staff']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['company_staff']['Insert']>
      }
      partners: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          full_name: string
          phone: string
          email: string
          photo_url: string | null
          bvn_hash: string | null
          nin_hash: string | null
          bank_code: string | null
          bank_name: string | null
          account_number: string | null
          account_name: string | null
        }
        Insert: Omit<Database['public']['Tables']['partners']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['partners']['Insert']>
      }
      partner_companies: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          partner_id: string
          company_id: string
          status: Database['public']['Enums']['partner_status']
          join_method: Database['public']['Enums']['partner_join_method']
          invited_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['partner_companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['partner_companies']['Insert']>
      }
      listings: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          title: string
          description: string | null
          property_type: string
          gallery_urls: string[]
          location_state: string
          location_city: string
          location_address: string | null
          location_coords: unknown | null
          price_kobo: number
          unit_type: Database['public']['Enums']['unit_type']
          units_total: number
          units_allocated: number
          units_remaining: number
          commission_type: string
          commission_value: number
          commission_trigger: Database['public']['Enums']['commission_trigger']
          commission_clawback: boolean
          commission_milestone: number | null
          status: Database['public']['Enums']['listing_status']
          show_units_to_partners: boolean
        }
        Insert: Omit<Database['public']['Tables']['listings']['Row'], 'id' | 'created_at' | 'updated_at' | 'units_remaining'>
        Update: Partial<Database['public']['Tables']['listings']['Insert']>
      }
      listing_units: {
        Row: {
          id: string
          created_at: string
          listing_id: string
          company_id: string
          label: string
          status: string
        }
        Insert: Omit<Database['public']['Tables']['listing_units']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['listing_units']['Insert']>
      }
      installment_plans: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          listing_id: string
          company_id: string
          name: string
          duration_months: number
          deposit_amount_kobo: number
          deposit_percentage: number | null
          installment_count: number
          installment_amount_kobo: number
          penalty_rate: number
        }
        Insert: Omit<Database['public']['Tables']['installment_plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['installment_plans']['Insert']>
      }
      marketing_assets: {
        Row: {
          id: string
          created_at: string
          listing_id: string
          company_id: string
          file_name: string
          file_type: string
          storage_url: string
          size_bytes: number
          download_count: number
        }
        Insert: Omit<Database['public']['Tables']['marketing_assets']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['marketing_assets']['Insert']>
      }
      buyers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          partner_id: string | null
          listing_id: string
          listing_unit_id: string | null
          installment_plan_id: string
          source: Database['public']['Enums']['sale_source']
          registered_by: string
          full_name: string
          phone: string
          email: string | null
          nin: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          notes: string | null
          status: Database['public']['Enums']['buyer_status']
          referring_partner_company_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['buyers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['buyers']['Insert']>
      }
      virtual_accounts: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          buyer_id: string
          company_id: string
          account_number: string
          bank_name: string
          account_name: string
          paystack_reference: string | null
          total_amount_kobo: number
          amount_paid_kobo: number
          amount_remaining_kobo: number
          deposit_received: boolean
          status: Database['public']['Enums']['virtual_account_status']
          provisioned_at: string
        }
        Insert: Omit<Database['public']['Tables']['virtual_accounts']['Row'], 'id' | 'created_at' | 'updated_at' | 'amount_remaining_kobo'>
        Update: Partial<Database['public']['Tables']['virtual_accounts']['Insert']>
      }
      payment_schedule: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          buyer_id: string
          company_id: string
          installment_number: number
          installment_type: string
          due_date: string
          amount_kobo: number
          status: Database['public']['Enums']['payment_schedule_status']
          paid_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['payment_schedule']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payment_schedule']['Insert']>
      }
      va_transactions: {
        Row: {
          id: string
          created_at: string
          virtual_account_id: string
          buyer_id: string
          company_id: string
          amount_kobo: number
          payment_reference: string
          bank_reference: string | null
          installment_number_matched: number | null
          received_at: string
        }
        Insert: Omit<Database['public']['Tables']['va_transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['va_transactions']['Insert']>
      }
      commissions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          partner_id: string
          buyer_id: string
          listing_id: string
          amount_kobo: number
          trigger_event: Database['public']['Enums']['commission_trigger']
          status: Database['public']['Enums']['commission_status']
          triggered_at: string | null
          paid_at: string | null
          transfer_reference: string | null
          initiated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['commissions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['commissions']['Insert']>
      }
      buyer_invoices: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          buyer_id: string
          invoice_number: string
          status: Database['public']['Enums']['invoice_status']
          total_kobo: number
          amount_paid_kobo: number
          sent_at: string | null
          voided_at: string | null
          void_reason: string | null
          public_token: string
          pdf_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['buyer_invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['buyer_invoices']['Insert']>
      }
      invoice_receipts: {
        Row: {
          id: string
          created_at: string
          company_id: string
          buyer_invoice_id: string
          va_transaction_id: string
          receipt_number: string
          amount_kobo: number
          issued_at: string
          pdf_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['invoice_receipts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invoice_receipts']['Insert']>
      }
      platform_invoices: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          invoice_number: string
          period_start: string
          period_end: string
          amount_kobo: number
          status: Database['public']['Enums']['invoice_status']
          paid_at: string | null
          paystack_reference: string | null
        }
        Insert: Omit<Database['public']['Tables']['platform_invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['platform_invoices']['Insert']>
      }
      notifications_log: {
        Row: {
          id: string
          created_at: string
          company_id: string | null
          recipient_type: string
          recipient_id: string
          recipient_phone: string | null
          recipient_email: string | null
          channel: Database['public']['Enums']['notification_channel']
          trigger: string
          triggered_by: string | null
          sent_at: string
          delivery_status: Database['public']['Enums']['notification_delivery_status']
          delivery_updated_at: string | null
          provider_reference: string | null
        }
        Insert: Omit<Database['public']['Tables']['notifications_log']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications_log']['Insert']>
      }
      company_onboarding: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          company_id: string
          company_verified: boolean
          branding_complete: boolean
          first_listing_created: boolean
          first_partner_invited: boolean
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['company_onboarding']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['company_onboarding']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string
          email: string
          phone: string | null
          avatar_url: string | null
          company_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      audit_log: {
        Row: {
          id: string
          created_at: string
          company_id: string | null
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          action_type: string
          target_type: string | null
          target_id: string | null
          before_state: Json | null
          after_state: Json | null
          ip_address: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      subscription_plan: 'starter' | 'growth' | 'scale'
      subscription_status: 'trialing' | 'active' | 'past_due' | 'cancelled'
      staff_role: 'admin' | 'manager' | 'coordinator' | 'finance' | 'viewer'
      partner_status: 'invited' | 'active' | 'suspended' | 'removed'
      partner_join_method: 'email_invite' | 'link' | 'code'
      listing_status: 'draft' | 'active' | 'sold_out' | 'archived'
      unit_type: 'number' | 'acres' | 'hectares' | 'sqm' | 'sqft'
      buyer_status: 'pending_deposit' | 'on_track' | 'overdue' | 'fully_paid' | 'defaulted' | 'cancelled'
      sale_source: 'partner' | 'direct'
      commission_status: 'pending' | 'due' | 'approved' | 'processing' | 'paid' | 'failed' | 'returned' | 'clawed_back'
      commission_trigger: 'on_deposit' | 'per_installment' | 'on_full_payment' | 'on_milestone'
      invoice_status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'voided'
      notification_channel: 'sms' | 'email' | 'push'
      notification_delivery_status: 'pending' | 'sent' | 'delivered' | 'failed'
      payment_schedule_status: 'pending' | 'paid' | 'overdue'
      virtual_account_status: 'active' | 'completed' | 'closed'
    }
  }
}

// ── Convenience re-exports ─────────────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

export type Company = Tables<'companies'>
export type CompanyStaff = Tables<'company_staff'>
export type Partner = Tables<'partners'>
export type PartnerCompany = Tables<'partner_companies'>
export type Listing = Tables<'listings'>
export type ListingUnit = Tables<'listing_units'>
export type InstallmentPlan = Tables<'installment_plans'>
export type MarketingAsset = Tables<'marketing_assets'>
export type Buyer = Tables<'buyers'>
export type VirtualAccount = Tables<'virtual_accounts'>
export type PaymentSchedule = Tables<'payment_schedule'>
export type VaTransaction = Tables<'va_transactions'>
export type Commission = Tables<'commissions'>
export type BuyerInvoice = Tables<'buyer_invoices'>
export type InvoiceReceipt = Tables<'invoice_receipts'>
export type PlatformInvoice = Tables<'platform_invoices'>
export type NotificationLog = Tables<'notifications_log'>
export type AuditLog = Tables<'audit_log'>
export type CompanyOnboarding = Tables<'company_onboarding'>
export type Profile = Tables<'profiles'>
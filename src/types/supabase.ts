export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          action_type: string | null
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          after_state: Json | null
          before_state: Json | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          notes: string | null
          performed_by: string | null
          performed_by_name: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          action_type?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          action_type?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_invoices: {
        Row: {
          amount_paid_kobo: number
          buyer_id: string
          company_id: string
          created_at: string
          id: string
          invoice_number: string
          pdf_url: string | null
          public_token: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_kobo: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_paid_kobo?: number
          buyer_id: string
          company_id: string
          created_at?: string
          id?: string
          invoice_number: string
          pdf_url?: string | null
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_kobo: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_paid_kobo?: number
          buyer_id?: string
          company_id?: string
          created_at?: string
          id?: string
          invoice_number?: string
          pdf_url?: string | null
          public_token?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_kobo?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_invoices_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          installment_plan_id: string | null
          listing_id: string
          listing_unit_id: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          nin: string | null
          notes: string | null
          partner_id: string | null
          phone: string
          referring_partner_company_id: string | null
          registered_by: string
          source: Database["public"]["Enums"]["sale_source"]
          status: Database["public"]["Enums"]["buyer_status"]
          unit_quantity: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          installment_plan_id?: string | null
          listing_id: string
          listing_unit_id?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          nin?: string | null
          notes?: string | null
          partner_id?: string | null
          phone: string
          referring_partner_company_id?: string | null
          registered_by: string
          source?: Database["public"]["Enums"]["sale_source"]
          status?: Database["public"]["Enums"]["buyer_status"]
          unit_quantity?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          installment_plan_id?: string | null
          listing_id?: string
          listing_unit_id?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          nin?: string | null
          notes?: string | null
          partner_id?: string | null
          phone?: string
          referring_partner_company_id?: string | null
          registered_by?: string
          source?: Database["public"]["Enums"]["sale_source"]
          status?: Database["public"]["Enums"]["buyer_status"]
          unit_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_listing_unit_id_fkey"
            columns: ["listing_unit_id"]
            isOneToOne: false
            referencedRelation: "listing_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_referring_partner_company_id_fkey"
            columns: ["referring_partner_company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_events: {
        Row: {
          commission_id: string
          company_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          performed_by: string | null
          performed_by_name: string | null
          to_status: string | null
        }
        Insert: {
          commission_id: string
          company_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          to_status?: string | null
        }
        Update: {
          commission_id?: string
          company_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_events_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount_kobo: number
          buyer_id: string
          company_id: string
          created_at: string
          declined_at: string | null
          id: string
          initiated_by: string | null
          listing_id: string
          paid_at: string | null
          partner_id: string
          status: Database["public"]["Enums"]["commission_status"]
          status_note: string | null
          transfer_reference: string | null
          trigger_event: Database["public"]["Enums"]["commission_trigger"]
          triggered_at: string | null
          updated_at: string
        }
        Insert: {
          amount_kobo: number
          buyer_id: string
          company_id: string
          created_at?: string
          declined_at?: string | null
          id?: string
          initiated_by?: string | null
          listing_id: string
          paid_at?: string | null
          partner_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          status_note?: string | null
          transfer_reference?: string | null
          trigger_event: Database["public"]["Enums"]["commission_trigger"]
          triggered_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_kobo?: number
          buyer_id?: string
          company_id?: string
          created_at?: string
          declined_at?: string | null
          id?: string
          initiated_by?: string | null
          listing_id?: string
          paid_at?: string | null
          partner_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          status_note?: string | null
          transfer_reference?: string | null
          trigger_event?: Database["public"]["Enums"]["commission_trigger"]
          triggered_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          brand_colour: string | null
          cac_company_name: string | null
          cac_company_status: string | null
          cac_company_type: string | null
          cac_registration_date: string | null
          cac_verified: boolean
          cac_verified_at: string | null
          commission_payout_mode: string
          company_code: string
          created_at: string
          custom_domain: string | null
          custom_email_domain: string | null
          custom_email_domain_verified: boolean
          email_from_name: string | null
          id: string
          leaderboard_public_token: string | null
          logo_url: string | null
          name: string
          phone: string | null
          rc_number: string | null
          reminders_enabled: boolean
          show_leaderboard: boolean
          show_units_to_partners: boolean
          slug: string
          status: string
          subscription_ends_at: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          termii_api_key: string | null
          termii_sender_id: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          brand_colour?: string | null
          cac_company_name?: string | null
          cac_company_status?: string | null
          cac_company_type?: string | null
          cac_registration_date?: string | null
          cac_verified?: boolean
          cac_verified_at?: string | null
          commission_payout_mode?: string
          company_code: string
          created_at?: string
          custom_domain?: string | null
          custom_email_domain?: string | null
          custom_email_domain_verified?: boolean
          email_from_name?: string | null
          id?: string
          leaderboard_public_token?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          rc_number?: string | null
          reminders_enabled?: boolean
          show_leaderboard?: boolean
          show_units_to_partners?: boolean
          slug: string
          status?: string
          subscription_ends_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          termii_api_key?: string | null
          termii_sender_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          brand_colour?: string | null
          cac_company_name?: string | null
          cac_company_status?: string | null
          cac_company_type?: string | null
          cac_registration_date?: string | null
          cac_verified?: boolean
          cac_verified_at?: string | null
          commission_payout_mode?: string
          company_code?: string
          created_at?: string
          custom_domain?: string | null
          custom_email_domain?: string | null
          custom_email_domain_verified?: boolean
          email_from_name?: string | null
          id?: string
          leaderboard_public_token?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          rc_number?: string | null
          reminders_enabled?: boolean
          show_leaderboard?: boolean
          show_units_to_partners?: boolean
          slug?: string
          status?: string
          subscription_ends_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          termii_api_key?: string | null
          termii_sender_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      company_addon_charges: {
        Row: {
          charge_type: string
          company_id: string
          created_at: string
          id: string
          month: string
          rivera_invoice_id: string | null
          status: string
          total_kobo: number
          unit_price_kobo: number
          units_billed: number
          units_used: number
        }
        Insert: {
          charge_type: string
          company_id: string
          created_at?: string
          id?: string
          month: string
          rivera_invoice_id?: string | null
          status?: string
          total_kobo?: number
          unit_price_kobo?: number
          units_billed?: number
          units_used?: number
        }
        Update: {
          charge_type?: string
          company_id?: string
          created_at?: string
          id?: string
          month?: string
          rivera_invoice_id?: string | null
          status?: string
          total_kobo?: number
          unit_price_kobo?: number
          units_billed?: number
          units_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_addon_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addon_charges_rivera_invoice_id_fkey"
            columns: ["rivera_invoice_id"]
            isOneToOne: false
            referencedRelation: "rivera_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      company_onboarding: {
        Row: {
          branding_complete: boolean
          company_id: string
          company_verified: boolean
          completed_at: string | null
          created_at: string
          first_listing_created: boolean
          first_partner_invited: boolean
          id: string
          updated_at: string
        }
        Insert: {
          branding_complete?: boolean
          company_id: string
          company_verified?: boolean
          completed_at?: string | null
          created_at?: string
          first_listing_created?: boolean
          first_partner_invited?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          branding_complete?: boolean
          company_id?: string
          company_verified?: boolean
          completed_at?: string | null
          created_at?: string
          first_listing_created?: boolean
          first_partner_invited?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_onboarding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payments: {
        Row: {
          amount_kobo: number
          company_id: string
          created_at: string
          id: string
          payment_type: string
          paystack_reference: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_kobo: number
          company_id: string
          created_at?: string
          id?: string
          payment_type: string
          paystack_reference: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_kobo?: number
          company_id?: string
          created_at?: string
          id?: string
          payment_type?: string
          paystack_reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_paystack_config: {
        Row: {
          business_name: string | null
          company_id: string
          connected_at: string
          created_at: string
          id: string
          is_active: boolean
          paystack_public_key: string | null
          paystack_secret_key: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          company_id: string
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          paystack_public_key?: string | null
          paystack_secret_key: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          company_id?: string
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          paystack_public_key?: string | null
          paystack_secret_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_paystack_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_staff: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["staff_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          billing_cycle: string
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_ends_at: string | null
          id: string
          plan_slug: string
          price_kobo_per_cycle: number
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          plan_slug: string
          price_kobo_per_cycle?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          plan_slug?: string
          price_kobo_per_cycle?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_usage: {
        Row: {
          cac_verifications: number
          company_id: string
          created_at: string
          emails_sent: number
          id: string
          month: string
          sms_sent: number
          storage_bytes_used: number
          updated_at: string
        }
        Insert: {
          cac_verifications?: number
          company_id: string
          created_at?: string
          emails_sent?: number
          id?: string
          month: string
          sms_sent?: number
          storage_bytes_used?: number
          updated_at?: string
        }
        Update: {
          cac_verifications?: number
          company_id?: string
          created_at?: string
          emails_sent?: number
          id?: string
          month?: string
          sms_sent?: number
          storage_bytes_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          company_id: string
          created_at: string
          deposit_amount_kobo: number
          deposit_percentage: number | null
          duration_months: number
          id: string
          installment_amount_kobo: number
          installment_count: number
          listing_id: string
          name: string
          penalty_rate: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deposit_amount_kobo: number
          deposit_percentage?: number | null
          duration_months: number
          id?: string
          installment_amount_kobo: number
          installment_count: number
          listing_id: string
          name: string
          penalty_rate?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deposit_amount_kobo?: number
          deposit_percentage?: number | null
          duration_months?: number
          id?: string
          installment_amount_kobo?: number
          installment_count?: number
          listing_id?: string
          name?: string
          penalty_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_receipts: {
        Row: {
          amount_kobo: number
          buyer_invoice_id: string
          company_id: string
          created_at: string
          id: string
          issued_at: string
          pdf_url: string | null
          receipt_number: string
          va_transaction_id: string | null
        }
        Insert: {
          amount_kobo: number
          buyer_invoice_id: string
          company_id: string
          created_at?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          receipt_number: string
          va_transaction_id?: string | null
        }
        Update: {
          amount_kobo?: number
          buyer_invoice_id?: string
          company_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          receipt_number?: string
          va_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_receipts_buyer_invoice_id_fkey"
            columns: ["buyer_invoice_id"]
            isOneToOne: false
            referencedRelation: "buyer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_units: {
        Row: {
          company_id: string
          created_at: string
          id: string
          label: string
          listing_id: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          label: string
          listing_id: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          label?: string
          listing_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_units_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          commission_clawback: boolean
          commission_milestone: number | null
          commission_trigger: Database["public"]["Enums"]["commission_trigger"]
          commission_type: string
          commission_value: number
          company_id: string
          created_at: string
          description: string | null
          gallery_urls: string[]
          id: string
          location_address: string | null
          location_city: string
          location_coords: Json | null
          location_state: string
          price_kobo: number
          property_type: string
          show_units_to_partners: boolean
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          unit_type: Database["public"]["Enums"]["unit_type"]
          units_allocated: number
          units_remaining: number | null
          units_total: number
          updated_at: string
        }
        Insert: {
          commission_clawback?: boolean
          commission_milestone?: number | null
          commission_trigger?: Database["public"]["Enums"]["commission_trigger"]
          commission_type?: string
          commission_value?: number
          company_id: string
          created_at?: string
          description?: string | null
          gallery_urls?: string[]
          id?: string
          location_address?: string | null
          location_city: string
          location_coords?: Json | null
          location_state: string
          price_kobo: number
          property_type: string
          show_units_to_partners?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          unit_type?: Database["public"]["Enums"]["unit_type"]
          units_allocated?: number
          units_remaining?: number | null
          units_total?: number
          updated_at?: string
        }
        Update: {
          commission_clawback?: boolean
          commission_milestone?: number | null
          commission_trigger?: Database["public"]["Enums"]["commission_trigger"]
          commission_type?: string
          commission_value?: number
          company_id?: string
          created_at?: string
          description?: string | null
          gallery_urls?: string[]
          id?: string
          location_address?: string | null
          location_city?: string
          location_coords?: Json | null
          location_state?: string
          price_kobo?: number
          property_type?: string
          show_units_to_partners?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          unit_type?: Database["public"]["Enums"]["unit_type"]
          units_allocated?: number
          units_remaining?: number | null
          units_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_assets: {
        Row: {
          company_id: string
          created_at: string
          download_count: number
          file_name: string
          file_type: string
          id: string
          listing_id: string
          size_bytes: number
          storage_url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          download_count?: number
          file_name: string
          file_type: string
          id?: string
          listing_id: string
          size_bytes?: number
          storage_url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          download_count?: number
          file_name?: string
          file_type?: string
          id?: string
          listing_id?: string
          size_bytes?: number
          storage_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_assets_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          company_id: string | null
          created_at: string
          delivery_status: Database["public"]["Enums"]["notification_delivery_status"]
          delivery_updated_at: string | null
          id: string
          provider_reference: string | null
          recipient_email: string | null
          recipient_id: string
          recipient_phone: string | null
          recipient_type: string
          sent_at: string
          trigger: string
          triggered_by: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          company_id?: string | null
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["notification_delivery_status"]
          delivery_updated_at?: string | null
          id?: string
          provider_reference?: string | null
          recipient_email?: string | null
          recipient_id: string
          recipient_phone?: string | null
          recipient_type: string
          sent_at?: string
          trigger: string
          triggered_by?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          company_id?: string | null
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["notification_delivery_status"]
          delivery_updated_at?: string | null
          id?: string
          provider_reference?: string | null
          recipient_email?: string | null
          recipient_id?: string
          recipient_phone?: string | null
          recipient_type?: string
          sent_at?: string
          trigger?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          invited_email: string | null
          invited_name: string | null
          join_method: Database["public"]["Enums"]["partner_join_method"]
          partner_id: string | null
          status: Database["public"]["Enums"]["partner_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          invited_name?: string | null
          join_method?: Database["public"]["Enums"]["partner_join_method"]
          partner_id?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          invited_name?: string | null
          join_method?: Database["public"]["Enums"]["partner_join_method"]
          partner_id?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_companies_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          bank_name: string | null
          bvn_hash: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          nin_hash: string | null
          phone: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          bvn_hash?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          nin_hash?: string | null
          phone: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          bvn_hash?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          nin_hash?: string | null
          phone?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_schedule: {
        Row: {
          amount_kobo: number
          buyer_id: string
          company_id: string
          created_at: string
          due_date: string
          id: string
          installment_number: number
          installment_type: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_schedule_status"]
          updated_at: string
        }
        Insert: {
          amount_kobo: number
          buyer_id: string
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          installment_type?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_schedule_status"]
          updated_at?: string
        }
        Update: {
          amount_kobo?: number
          buyer_id?: string
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          installment_type?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_schedule_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedule_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedule_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notifications_subscribed: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          notifications_subscribed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notifications_subscribed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          buyer_id: string | null
          channel: string
          company_id: string
          created_at: string
          error: string | null
          id: string
          message: string
          recipient_phone: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          buyer_id?: string | null
          channel: string
          company_id: string
          created_at?: string
          error?: string | null
          id?: string
          message: string
          recipient_phone?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          buyer_id?: string | null
          channel?: string
          company_id?: string
          created_at?: string
          error?: string | null
          id?: string
          message?: string
          recipient_phone?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "reminder_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_templates: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          days_offset: number
          id: string
          is_active: boolean
          message_template: string
          name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          channel?: string
          company_id: string
          created_at?: string
          days_offset?: number
          id?: string
          is_active?: boolean
          message_template: string
          name: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          days_offset?: number
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rivera_announcement_reads: {
        Row: {
          announcement_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rivera_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "rivera_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      rivera_announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      rivera_invoices: {
        Row: {
          addon_amount_kobo: number
          base_amount_kobo: number
          billing_type: string
          company_id: string
          created_at: string
          due_at: string | null
          id: string
          invoice_number: string
          month: string
          paid_at: string | null
          paystack_reference: string | null
          status: string
          total_kobo: number
          updated_at: string
        }
        Insert: {
          addon_amount_kobo?: number
          base_amount_kobo?: number
          billing_type?: string
          company_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          month: string
          paid_at?: string | null
          paystack_reference?: string | null
          status?: string
          total_kobo: number
          updated_at?: string
        }
        Update: {
          addon_amount_kobo?: number
          base_amount_kobo?: number
          billing_type?: string
          company_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          month?: string
          paid_at?: string | null
          paystack_reference?: string | null
          status?: string
          total_kobo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rivera_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_documents: {
        Row: {
          buyer_id: string
          company_id: string
          created_at: string
          custom_label: string | null
          document_type: string
          file_name: string
          id: string
          size_bytes: number
          storage_path: string
          storage_url: string
          uploaded_by: string | null
        }
        Insert: {
          buyer_id: string
          company_id: string
          created_at?: string
          custom_label?: string | null
          document_type: string
          file_name: string
          id?: string
          size_bytes?: number
          storage_path: string
          storage_url: string
          uploaded_by?: string | null
        }
        Update: {
          buyer_id?: string
          company_id?: string
          created_at?: string
          custom_label?: string | null
          document_type?: string
          file_name?: string
          id?: string
          size_bytes?: number
          storage_path?: string
          storage_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_documents_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price_kobo_monthly: number
          slug: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          price_kobo_monthly: number
          slug: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price_kobo_monthly?: number
          slug?: string
        }
        Relationships: []
      }
      va_transactions: {
        Row: {
          amount_kobo: number
          bank_reference: string | null
          buyer_id: string
          company_id: string
          created_at: string
          id: string
          installment_number_matched: number | null
          narration: string | null
          paid_at: string | null
          paystack_reference: string
          virtual_account_id: string
        }
        Insert: {
          amount_kobo: number
          bank_reference?: string | null
          buyer_id: string
          company_id: string
          created_at?: string
          id?: string
          installment_number_matched?: number | null
          narration?: string | null
          paid_at?: string | null
          paystack_reference: string
          virtual_account_id: string
        }
        Update: {
          amount_kobo?: number
          bank_reference?: string | null
          buyer_id?: string
          company_id?: string
          created_at?: string
          id?: string
          installment_number_matched?: number | null
          narration?: string | null
          paid_at?: string | null
          paystack_reference?: string
          virtual_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "va_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "va_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "va_transactions_virtual_account_id_fkey"
            columns: ["virtual_account_id"]
            isOneToOne: false
            referencedRelation: "virtual_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_accounts: {
        Row: {
          bank_account_name: string
          bank_account_number: string
          amount_paid_kobo: number
          amount_remaining_kobo: number | null
          bank_name: string
          bank_slug: string | null
          buyer_id: string
          company_id: string
          created_at: string
          deposit_received: boolean
          id: string
          is_active: boolean
          paystack_account_id: string | null
          paystack_reference: string | null
          provisioned_at: string
          status: Database["public"]["Enums"]["virtual_account_status"]
          total_amount_kobo: number
          updated_at: string
        }
        Insert: {
          bank_account_name: string
          bank_account_number: string
          amount_paid_kobo?: number
          amount_remaining_kobo?: number | null
          bank_name: string
          bank_slug?: string | null
          buyer_id: string
          company_id: string
          created_at?: string
          deposit_received?: boolean
          id?: string
          is_active?: boolean
          paystack_account_id?: string | null
          paystack_reference?: string | null
          provisioned_at?: string
          status?: Database["public"]["Enums"]["virtual_account_status"]
          total_amount_kobo?: number
          updated_at?: string
        }
        Update: {
          bank_account_name?: string
          bank_account_number?: string
          amount_paid_kobo?: number
          amount_remaining_kobo?: number | null
          bank_name?: string
          bank_slug?: string | null
          buyer_id?: string
          company_id?: string
          created_at?: string
          deposit_received?: boolean
          id?: string
          is_active?: boolean
          paystack_account_id?: string | null
          paystack_reference?: string | null
          provisioned_at?: string
          status?: Database["public"]["Enums"]["virtual_account_status"]
          total_amount_kobo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_accounts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: true
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      generate_receipt_number: { Args: never; Returns: string }
      generate_rivera_invoice_number: { Args: never; Returns: string }
      get_dashboard_stats: {
        Args: { p_company_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      increment_usage: {
        Args: { p_amount?: number; p_company_id: string; p_field: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      buyer_status:
        | "pending_deposit"
        | "on_track"
        | "overdue"
        | "fully_paid"
        | "defaulted"
        | "cancelled"
      commission_status:
        | "pending"
        | "due"
        | "approved"
        | "processing"
        | "paid"
        | "failed"
        | "returned"
        | "clawed_back"
        | "declined"
      commission_trigger:
        | "on_deposit"
        | "per_installment"
        | "on_full_payment"
        | "on_milestone"
      invoice_status: "draft" | "sent" | "partially_paid" | "paid" | "voided"
      listing_status: "draft" | "active" | "sold_out" | "archived"
      notification_channel: "sms" | "email" | "push"
      notification_delivery_status: "pending" | "sent" | "delivered" | "failed"
      partner_join_method: "email_invite" | "link" | "code"
      partner_status: "invited" | "active" | "suspended" | "removed"
      payment_schedule_status: "pending" | "paid" | "overdue"
      sale_source: "partner" | "direct"
      staff_role: "admin" | "manager" | "coordinator" | "finance" | "viewer"
      subscription_plan: "starter" | "growth" | "scale"
      subscription_status: "trialing" | "active" | "past_due" | "cancelled"
      unit_type: "number" | "acres" | "hectares" | "sqm" | "sqft"
      virtual_account_status: "active" | "completed" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      buyer_status: [
        "pending_deposit",
        "on_track",
        "overdue",
        "fully_paid",
        "defaulted",
        "cancelled",
      ],
      commission_status: [
        "pending",
        "due",
        "approved",
        "processing",
        "paid",
        "failed",
        "returned",
        "clawed_back",
        "declined",
      ],
      commission_trigger: [
        "on_deposit",
        "per_installment",
        "on_full_payment",
        "on_milestone",
      ],
      invoice_status: ["draft", "sent", "partially_paid", "paid", "voided"],
      listing_status: ["draft", "active", "sold_out", "archived"],
      notification_channel: ["sms", "email", "push"],
      notification_delivery_status: ["pending", "sent", "delivered", "failed"],
      partner_join_method: ["email_invite", "link", "code"],
      partner_status: ["invited", "active", "suspended", "removed"],
      payment_schedule_status: ["pending", "paid", "overdue"],
      sale_source: ["partner", "direct"],
      staff_role: ["admin", "manager", "coordinator", "finance", "viewer"],
      subscription_plan: ["starter", "growth", "scale"],
      subscription_status: ["trialing", "active", "past_due", "cancelled"],
      unit_type: ["number", "acres", "hectares", "sqm", "sqft"],
      virtual_account_status: ["active", "completed", "closed"],
    },
  },
} as const


// ── Convenience re-exports ─────────────────────────────────────────────────
export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyStaff = Database['public']['Tables']['company_staff']['Row']
export type Partner = Database['public']['Tables']['partners']['Row']
export type PartnerCompany = Database['public']['Tables']['partner_companies']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']
export type ListingUnit = Database['public']['Tables']['listing_units']['Row']
export type InstallmentPlan = Database['public']['Tables']['installment_plans']['Row']
export type MarketingAsset = Database['public']['Tables']['marketing_assets']['Row']
export type Buyer = Database['public']['Tables']['buyers']['Row']
export type VirtualAccount = Database['public']['Tables']['virtual_accounts']['Row']
export type PaymentSchedule = Database['public']['Tables']['payment_schedule']['Row']
export type VaTransaction = Database['public']['Tables']['va_transactions']['Row']
export type Commission = Database['public']['Tables']['commissions']['Row']
export type BuyerInvoice = Database['public']['Tables']['buyer_invoices']['Row']
export type InvoiceReceipt = Database['public']['Tables']['invoice_receipts']['Row']
export type RiveraInvoice = Database['public']['Tables']['rivera_invoices']['Row']
export type NotificationLog = Database['public']['Tables']['notifications_log']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type CompanyOnboarding = Database['public']['Tables']['company_onboarding']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
import { createAdminClient } from '@/lib/supabase/admin'

type AuditAction =
  | 'staff.invited'
  | 'staff.removed'
  | 'staff.role_changed'
  | 'listing.created'
  | 'listing.updated'
  | 'listing.published'
  | 'listing.archived'
  | 'partner.invited'
  | 'partner.activated'
  | 'partner.suspended'
  | 'partner.removed'
  | 'sale.registered'
  | 'sale.status_updated'
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.voided'
  | 'invoice.payment_recorded'
  | 'commission.approved'
  | 'commission.declined'
  | 'commission.processing'
  | 'commission.paid'
  | 'commission.failed'
  | 'commission.returned'
  | 'reminder.sent'

type LogParams = {
  companyId: string
  performedBy: string
  performedByName?: string
  action: AuditAction
  entityType?: string
  entityId?: string
  entityLabel?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(params: LogParams): Promise<void> {
  try {
    const adminClient = createAdminClient()

    let performedByName = params.performedByName ?? null

    if (!performedByName && params.performedBy) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileRaw } = await (adminClient as any)
        .from('profiles')
        .select('full_name')
        .eq('id', params.performedBy)
        .single()

      const profile = profileRaw as { full_name: string } | null
      performedByName = profile?.full_name ?? null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('audit_log')
      .insert({
        company_id: params.companyId,
        performed_by: params.performedBy,
        performed_by_name: performedByName,
        action: params.action,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        entity_label: params.entityLabel ?? null,
        metadata: params.metadata ?? null,
      })
  } catch (err) {
    console.error('AUDIT LOG FAILED:', err)
  }
}
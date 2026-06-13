'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import { can, type StaffRole } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'
import { DOCUMENT_TYPES } from '@/lib/document-types'

type StaffRecord = { company_id: string; role: string }

// export const DOCUMENT_TYPES = [
//   'Certificate of Occupancy (C of O)',
//   'Deed of Assignment',
//   'Survey Plan',
//   'Letter of Allocation',
//   'Gazette',
//   'Other',
// ] as const

export async function uploadSaleDocument(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return { success: false, error: 'Not authorised' }
  const staff = staffData as StaffRecord

  if (!can.registerSale(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to upload documents' }
  }

  const buyerId = formData.get('buyer_id') as string
  const documentType = formData.get('document_type') as string
  const customLabel = (formData.get('custom_label') as string) || null
  const file = formData.get('file') as File

  if (!buyerId || !documentType || !file) {
    return { success: false, error: 'Buyer, document type and file are required' }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'File must be under 5MB' }
  }

  if (file.type !== 'application/pdf') {
    return { success: false, error: 'Only PDF files are allowed' }
  }

  // Verify buyer belongs to this company
  const { data: buyerRaw } = await supabase
    .from('buyers')
    .select('id, full_name')
    .eq('id', buyerId)
    .eq('company_id', staff.company_id)
    .single()

  if (!buyerRaw) return { success: false, error: 'Sale not found' }
  const buyer = buyerRaw as { id: string; full_name: string }

  const storagePath = `${staff.company_id}/${buyerId}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('sale-documents')
    .upload(storagePath, file, { contentType: 'application/pdf' })

  if (uploadError) {
    console.error('DOCUMENT UPLOAD FAILED:', uploadError.message)
    return { success: false, error: 'Failed to upload file. Please try again.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (adminClient as any)
    .from('sale_documents')
    .insert({
      company_id: staff.company_id,
      buyer_id: buyerId,
      document_type: documentType,
      custom_label: customLabel,
      file_name: file.name,
      storage_url: storagePath, // store path, not public URL
      storage_path: storagePath,
      size_bytes: file.size,
      uploaded_by: user.id,
    })

  if (insertError) {
    console.error('DOCUMENT INSERT FAILED:', insertError.message)
    await supabase.storage.from('sale-documents').remove([storagePath])
    return { success: false, error: 'Failed to save document record.' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'sale.registered',
    entityType: 'sale',
    entityId: buyerId,
    entityLabel: `Document uploaded for ${buyer.full_name}`,
    metadata: { document_type: documentType, file_name: file.name },
  })

  revalidatePath(`/sales/${buyerId}`)
  return { success: true, data: undefined }
}

export async function deleteSaleDocument(
  documentId: string,
  buyerId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return { success: false, error: 'Not authorised' }
  const staff = staffData as StaffRecord

  if (!can.registerSale(staff.role as StaffRole)) {
    return { success: false, error: 'You do not have permission to delete documents' }
  }

  const { data: docRaw } = await supabase
    .from('sale_documents')
    .select('id, storage_path, file_name')
    .eq('id', documentId)
    .eq('company_id', staff.company_id)
    .single()

  const doc = docRaw as { id: string; storage_path: string; file_name: string } | null
  if (!doc) return { success: false, error: 'Document not found' }

  await supabase.storage.from('sale-documents').remove([doc.storage_path])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('sale_documents')
    .delete()
    .eq('id', documentId)
    .eq('company_id', staff.company_id)

  if (error) {
    console.error('DOCUMENT DELETE FAILED:', error.message)
    return { success: false, error: 'Failed to delete document' }
  }

  await logAudit({
    companyId: staff.company_id,
    performedBy: user.id,
    action: 'sale.registered',
    entityType: 'sale',
    entityId: buyerId,
    entityLabel: `Document deleted: ${doc.file_name}`,
  })

  revalidatePath(`/sales/${buyerId}`)
  return { success: true, data: undefined }
}

export async function getDocumentSignedUrl(documentId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) return { success: false, error: 'Not authorised' }
  const staff = staffData as StaffRecord

  const { data: docRaw } = await supabase
    .from('sale_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('company_id', staff.company_id)
    .single()

  const doc = docRaw as { storage_path: string } | null
  if (!doc) return { success: false, error: 'Document not found' }

  const { data, error } = await supabase.storage
    .from('sale-documents')
    .createSignedUrl(doc.storage_path, 60 * 60) // 1 hour

  if (error || !data) return { success: false, error: 'Failed to generate download link' }

  return { success: true, data: { url: data.signedUrl } }
}
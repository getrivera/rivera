// ─────────────────────────────────────────────────────────────────────────────
// Rivera — Shared application types
// ─────────────────────────────────────────────────────────────────────────────

// Actor context injected into every audit log entry
export type AuditActor = {
  id: string
  name: string
  role: string
  ip?: string
}

// Standard server action response shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string }

// Pagination params used in list queries
export type PaginationParams = {
  page: number
  perPage: number
}

// The user's active company context (set after workspace selection)
export type ActiveWorkspace = {
  companyId: string
  companySlug: string
  companyName: string
  logoUrl: string | null
  brandColour: string | null
  role: 'admin' | 'manager' | 'coordinator' | 'finance' | 'viewer' | 'partner'
}

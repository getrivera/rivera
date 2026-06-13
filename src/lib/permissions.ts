export type StaffRole = 'admin' | 'manager' | 'coordinator' | 'finance' | 'viewer'

export const can = {
  // Listings
  manageListing: (role: StaffRole) =>
    ['admin', 'manager', 'coordinator'].includes(role),
  publishListing: (role: StaffRole) =>
    ['admin', 'manager'].includes(role),

  // Partners
  managePartners: (role: StaffRole) =>
    ['admin', 'manager'].includes(role),

  // Sales
  registerSale: (role: StaffRole) =>
    ['admin', 'manager', 'coordinator', 'finance'].includes(role),

  // Invoices
  manageInvoices: (role: StaffRole) =>
    ['admin', 'manager', 'finance'].includes(role),

  // Commissions
  approveCommissions: (role: StaffRole) =>
    ['admin', 'finance'].includes(role),

  // Admin only
  manageSettings: (role: StaffRole) => role === 'admin',
  manageStaff: (role: StaffRole) => role === 'admin',

  // Audit log
  viewAuditLog: (role: StaffRole) =>
    ['admin', 'manager'].includes(role),
} as const
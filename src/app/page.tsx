import { redirect } from 'next/navigation'

// The root domain (rivera.ng) shows the marketing/login page.
// Tenant subdomains (company.rivera.ng) are handled by middleware.
export default function RootPage() {
  redirect('/login')
}

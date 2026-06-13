import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { getAnnouncements } from '@/actions/announcements'

type CompanyData = {
  id: string
  name: string
  slug: string
  brand_colour: string | null
  logo_url: string | null
  cac_verified: boolean
  status: string
}

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: staffData } = await supabase
    .from('company_staff')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!staffData) redirect('/login')

  const staff = staffData as { company_id: string; role: string }

  const { data: companyData } = await supabase
    .from('companies')
    .select('id, name, slug, brand_colour, logo_url, cac_verified, status')
    .eq('id', staff.company_id)
    .single()

  if (!companyData) redirect('/login')

  const company = companyData as CompanyData

  // Block access if company is not active
  if (company.status !== 'active') {
    redirect('/pending')
  }

  const fullName = (user.user_metadata?.full_name as string) ?? user.email ?? 'User'

  const announcements = await getAnnouncements()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        companyName={company.name}
        userFullName={fullName}
        userRole={staff.role}
        userEmail={user.email ?? ''}
        brandColour={company.brand_colour}
        logoUrl={company.logo_url}
        isVerified={company.cac_verified}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          companyName={company.name}
          announcements={announcements}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
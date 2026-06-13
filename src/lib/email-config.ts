import { createAdminClient } from '@/lib/supabase/admin'

type EmailConfig = {
  fromAddress: string
  fromName: string
  displayFrom: string
}

type CompanyEmailRow = {
  name: string
  slug: string
  email_from_name: string | null
  custom_email_domain: string | null
  custom_email_domain_verified: boolean
}

export async function getCompanyEmailConfig(companyId: string): Promise<EmailConfig> {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companyRaw } = await (adminClient as any)
    .from('companies')
    .select('name, slug, email_from_name, custom_email_domain, custom_email_domain_verified')
    .eq('id', companyId)
    .single()

  const company = companyRaw as CompanyEmailRow | null

  if (!company) {
    return {
      fromAddress: process.env.RESEND_FROM_EMAIL ?? 'reminders@getrivera.co',
      fromName: 'Rivera',
      displayFrom: `Rivera <${process.env.RESEND_FROM_EMAIL ?? 'reminders@getrivera.co'}>`,
    }
  }

  const fromName = company.email_from_name ?? company.name

  if (company.custom_email_domain && company.custom_email_domain_verified) {
    const localPart = slugify(company.name)
    const fromAddress = `${localPart}@${company.custom_email_domain}`
    return {
      fromAddress,
      fromName,
      displayFrom: `${fromName} <${fromAddress}>`,
    }
  }

  const fromAddress = `${company.slug}@mail.getrivera.co`
  return {
    fromAddress,
    fromName,
    displayFrom: `${fromName} <${fromAddress}>`,
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'hello'
}
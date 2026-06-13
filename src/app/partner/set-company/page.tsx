import { redirect } from 'next/navigation'
import { setActiveCompany } from '@/actions/partner-company'

export default async function SetCompanyPage({
  searchParams,
}: {
  searchParams: { id?: string }
}) {
  if (!searchParams.id) redirect('/partner/pick-company')
  await setActiveCompany(searchParams.id)
}
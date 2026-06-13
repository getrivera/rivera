import { formatNaira } from '@/lib/utils'

type TemplateVars = {
  buyer_name: string
  listing_title: string
  amount?: number
  days_overdue?: number
  days_until_due?: number
  company_name?: string
}

export function interpolateTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/{{buyer_name}}/g, vars.buyer_name)
    .replace(/{{listing_title}}/g, vars.listing_title)
    .replace(/{{amount}}/g, vars.amount ? formatNaira(vars.amount) : '')
    .replace(/{{days_overdue}}/g, String(vars.days_overdue ?? 0))
    .replace(/{{days_until_due}}/g, String(vars.days_until_due ?? 0))
    .replace(/{{company_name}}/g, vars.company_name ?? 'Rivera')
}
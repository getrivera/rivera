import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira } from '@/lib/utils'

type Company = {
  id: string
  name: string
  logo_url: string | null
  brand_colour: string | null
}

type LeaderboardEntry = {
  rank: number
  full_name: string
  sales_count: number
  commission_earned: number
}

export default async function PublicLeaderboardPage({
  params,
}: {
  params: { slug: string }
}) {
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: companyRaw } = await (adminClient as any)
    .from('companies')
    .select('id, name, logo_url, brand_colour')
    .eq('slug', params.slug)
    .single()

  if (!companyRaw) notFound()
  const company = companyRaw as Company

  const brandColour = company.brand_colour ?? '#1B4F72'

  // Get all commissions for this company
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commissionsRaw } = await (adminClient as any)
    .from('commissions')
    .select('partner_id, amount_kobo, status')
    .eq('company_id', company.id)

  const commissions = (commissionsRaw ?? []) as {
    partner_id: string
    amount_kobo: number
    status: string
  }[]

  // Aggregate by partner
  const partnerMap: Record<string, { sales_count: number; commission_earned: number }> = {}

  commissions.forEach((c) => {
    if (!partnerMap[c.partner_id]) {
      partnerMap[c.partner_id] = { sales_count: 0, commission_earned: 0 }
    }
    partnerMap[c.partner_id].sales_count += 1
    if (c.status === 'paid') {
      partnerMap[c.partner_id].commission_earned += c.amount_kobo
    }
  })

  const partnerIds = Object.keys(partnerMap)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: partnersRaw } = partnerIds.length ? await (adminClient as any)
    .from('partners')
    .select('id, full_name')
    .in('id', partnerIds) : { data: [] }

  const partners = (partnersRaw ?? []) as { id: string; full_name: string }[]

  const leaderboard: LeaderboardEntry[] = partners
    .map((p) => ({
      rank: 0,
      full_name: p.full_name,
      sales_count: partnerMap[p.id]?.sales_count ?? 0,
      commission_earned: partnerMap[p.id]?.commission_earned ?? 0,
    }))
    .sort((a, b) => b.sales_count - a.sales_count)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div
          className="rounded-2xl p-8 text-white mb-6 text-center"
          style={{ backgroundColor: brandColour }}
        >
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="w-16 h-16 rounded-xl object-contain bg-white p-1.5 mx-auto mb-4"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4"
            >
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-white/70 mt-1">Partner leaderboard</p>
        </div>

        {/* Leaderboard */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              No partner sales yet
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-16">
                    Rank
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                    Partner
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">
                    Sales
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">
                    Earned
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaderboard.map((p) => (
                  <tr
                    key={p.rank}
                    className={p.rank <= 3 ? 'bg-yellow-50/30' : ''}
                  >
                    <td className="px-5 py-4">
                      <span
                        className={`text-lg font-bold ${
                          p.rank === 1
                            ? 'text-yellow-500'
                            : p.rank === 2
                            ? 'text-gray-400'
                            : p.rank === 3
                            ? 'text-orange-400'
                            : 'text-gray-300'
                        }`}
                      >
                        {p.rank === 1
                          ? '🥇'
                          : p.rank === 2
                          ? '🥈'
                          : p.rank === 3
                          ? '🥉'
                          : `#${p.rank}`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {p.full_name}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {p.sales_count}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium text-green-600">
                        {formatNaira(p.commission_earned)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Rivera · Real estate partner management
        </p>
      </div>
    </div>
  )
}
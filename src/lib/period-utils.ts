export type Period = 'today' | 'last_7' | 'last_30' | 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom'

export type DateRange = {
  from: Date | null
  to: Date | null
  label: string
}

export function resolvePeriod(
  period: string,
  customFrom?: string,
  customTo?: string
): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)

  switch (period as Period) {
    case 'today':
      return { from: today, to: endOfToday, label: 'Today' }

    case 'last_7': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { from, to: endOfToday, label: 'Last 7 days' }
    }

    case 'last_30': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { from, to: endOfToday, label: 'Last 30 days' }
    }

    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from, to: endOfToday, label: 'This month' }
    }

    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      return { from, to, label: 'Last month' }
    }

    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1)
      return { from, to: endOfToday, label: 'This year' }
    }

    case 'custom': {
      if (customFrom && customTo) {
        const from = new Date(customFrom)
        const to = new Date(customTo)
        to.setHours(23, 59, 59, 999)
        return {
          from,
          to,
          label: `${customFrom} → ${customTo}`,
        }
      }
      return { from: null, to: null, label: 'All time' }
    }

    case 'all_time':
    default:
      return { from: null, to: null, label: 'All time' }
  }
}
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100)
}

export function koboToNaira(kobo: number): number {
  return kobo / 100
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100)
}

/**
 * Parse a user-supplied number that may contain thousands separators,
 * currency symbols, or whitespace ("₦5,000,000" → 5000000).
 * Returns NaN for empty/invalid input so callers can validate.
 */
export function parseNumberInput(value: FormDataEntryValue | string | number | null): number {
  if (value === null || value === undefined) return NaN
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[₦,\s]/g, '')
  if (!cleaned) return NaN
  return parseFloat(cleaned)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const diff = (new Date(date).getTime() - Date.now()) / 1000
  const absDiff = Math.abs(diff)

  if (absDiff < 60) return rtf.format(Math.round(diff), 'second')
  if (absDiff < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateCompanyCode(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X')
  const suffix = Math.random().toString(36).substring(2, 4).toUpperCase()
  return `${prefix}${suffix}`
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatUnits(value: number, type: string): string {
  const labels: Record<string, string> = {
    number: value === 1 ? 'unit' : 'units',
    acres: value === 1 ? 'acre' : 'acres',
    hectares: value === 1 ? 'hectare' : 'hectares',
    sqm: 'sqm',
    sqft: 'sqft',
  }
  return `${value.toLocaleString()} ${labels[type] ?? type}`
}

export function formatRemainingUnits(total: number, sold: number, unitType: string): string {
  const remaining = Math.max(0, total - sold)
  const labels: Record<string, string> = {
    number: remaining === 1 ? 'unit' : 'units',
    acres: remaining === 1 ? 'acre' : 'acres',
    hectares: remaining === 1 ? 'hectare' : 'hectares',
    sqm: 'sqm',
    sqft: 'sqft',
  }
  return `${remaining.toLocaleString()} ${labels[unitType] ?? unitType} remaining`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isServer(): boolean {
  return typeof window === 'undefined'
}
'use client'

import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// MoneyInput
//
// A text input that displays comma-separated thousands (5,000,000) while the
// user types, but submits a plain numeric string via a hidden input so server
// actions can parse it safely.
//
// Usage (inside a <form>):
//   <MoneyInput name="price_naira" defaultValue={5000000} required />
//
// For controlled usage (modals that read state instead of FormData), use
// the value/onValueChange pair — onValueChange receives the raw numeric
// string with commas stripped.
// ─────────────────────────────────────────────────────────────────────────────

function addCommas(raw: string): string {
  if (!raw) return ''
  const [int, dec] = raw.split('.')
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${withCommas}.${dec}` : withCommas
}

function stripToNumeric(display: string): string {
  // Keep digits and at most one decimal point
  const cleaned = display.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

type Props = {
  name?: string
  defaultValue?: number | string
  value?: string
  onValueChange?: (raw: string) => void
  placeholder?: string
  required?: boolean
  min?: number
  className?: string
  prefix?: string // e.g. '₦'
  id?: string
}

export function MoneyInput({
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  required,
  className,
  prefix,
  id,
}: Props) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState<string>(() => {
    if (defaultValue === undefined || defaultValue === null || defaultValue === '') return ''
    return stripToNumeric(String(defaultValue))
  })

  const raw = isControlled ? value : internal
  const display = addCommas(raw ?? '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextRaw = stripToNumeric(e.target.value)
    if (isControlled) {
      onValueChange?.(nextRaw)
    } else {
      setInternal(nextRaw)
      onValueChange?.(nextRaw)
    }
  }

  const inputClass =
    className ??
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={prefix ? `${inputClass} pl-7` : inputClass}
      />
      {/* Raw numeric value submitted with the form */}
      {name && <input type="hidden" name={name} value={raw ?? ''} />}
    </div>
  )
}

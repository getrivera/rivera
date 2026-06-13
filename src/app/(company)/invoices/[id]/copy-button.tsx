'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-brand-500 hover:underline flex-shrink-0 flex items-center gap-1"
    >
      {copied ? <><Check size={11} className="text-green-500" /> Copied</> : 'Copy'}
    </button>
  )
}
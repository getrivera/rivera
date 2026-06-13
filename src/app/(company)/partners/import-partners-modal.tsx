'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Check, AlertCircle, Loader2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { bulkInvitePartners } from '@/actions/partners'

type ParsedRow = {
  row: number
  name: string
  email: string
  phone: string
  valid: boolean
  error: string | null
}

export function ImportPartnersModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload')
    setRows([])
    setImportResult(null)
    setError(null)
  }

  function handleClose() {
    setOpen(false)
    setTimeout(reset, 300)
  }

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, string>[]

        if (json.length === 0) {
          setError('The file appears to be empty.')
          return
        }

        // Normalize column names — case insensitive
        const parsed: ParsedRow[] = json.map((row, i) => {
          const keys = Object.keys(row).reduce((acc, k) => {
            acc[k.toLowerCase().trim()] = row[k]
            return acc
          }, {} as Record<string, string>)

          const name = (keys['name'] || keys['full_name'] || keys['fullname'] || '').toString().trim()
          const email = (keys['email'] || keys['email address'] || '').toString().trim()
          const phone = (keys['phone'] || keys['phone number'] || keys['mobile'] || '').toString().trim()

          let rowError: string | null = null
          if (!name) rowError = 'Name is required'
          else if (!email) rowError = 'Email is required'
          else if (!validateEmail(email)) rowError = 'Invalid email format'

          return {
            row: i + 2, // +2 because row 1 is header
            name,
            email,
            phone,
            valid: rowError === null,
            error: rowError,
          }
        })

        setRows(parsed)
        setStep('preview')
        setError(null)
      } catch {
        setError('Could not parse the file. Make sure it is a valid CSV or Excel file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    if (!allowed.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setError('Please upload a CSV or Excel (.xlsx) file.')
      return
    }

    parseFile(file)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'email', 'phone'],
      ['Amaka Obi', 'amaka@example.com', '08012345678'],
      ['Chidi Nwosu', 'chidi@example.com', '08098765432'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Partners')
    XLSX.writeFile(wb, 'rivera-partner-import-template.xlsx')
  }

  function handleImport() {
    const validRows = rows.filter((r) => r.valid)
    if (validRows.length === 0) return

    startTransition(async () => {
      const result = await bulkInvitePartners(
        validRows.map((r) => ({ name: r.name, email: r.email, phone: r.phone }))
      )

      if (!result.success) {
        setError(result.error)
        return
      }

      const data = result.data as { imported: number; skipped: number }
      setImportResult(data)
      setStep('done')
      router.refresh()
    })
  }

  const validCount = rows.filter((r) => r.valid).length
  const invalidCount = rows.filter((r) => !r.valid).length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Upload size={16} />
        Import
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900">Import partners</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Upload a CSV or Excel file to bulk invite partners
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Step 1 — Upload */}
              {step === 'upload' && (
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={14} />
                      {error}
                    </div>
                  )}

                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-brand-500 transition-colors"
                  >
                    <Upload size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      Click to upload CSV or Excel file
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supported formats: .csv, .xlsx
                    </p>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Required columns
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {['name', 'email'].map((col) => (
                        <span
                          key={col}
                          className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-mono"
                        >
                          {col}
                        </span>
                      ))}
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-mono">
                        phone (optional)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={downloadTemplate}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Download size={14} />
                    Download template
                  </button>
                </div>
              )}

              {/* Step 2 — Preview */}
              {step === 'preview' && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{validCount}</p>
                      <p className="text-xs text-green-600 mt-0.5">Ready to import</p>
                    </div>
                    {invalidCount > 0 && (
                      <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                        <p className="text-xs text-red-500 mt-0.5">Will be skipped</p>
                      </div>
                    )}
                  </div>

                  {/* Table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Row</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Name</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Email</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Phone</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map((row) => (
                          <tr
                            key={row.row}
                            className={row.valid ? '' : 'bg-red-50'}
                          >
                            <td className="px-3 py-2 text-xs text-gray-400">{row.row}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{row.name || '—'}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{row.email || '—'}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{row.phone || '—'}</td>
                            <td className="px-3 py-2">
                              {row.valid ? (
                                <Check size={14} className="text-green-500" />
                              ) : (
                                <span className="text-xs text-red-500">{row.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={() => { reset(); fileRef.current && (fileRef.current.value = '') }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Upload a different file
                  </button>
                </div>
              )}

              {/* Step 3 — Done */}
              {step === 'done' && importResult && (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-green-600" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">
                    Import complete
                  </p>
                  <p className="text-sm text-gray-500">
                    {importResult.imported} partner{importResult.imported !== 1 ? 's' : ''} invited
                    {importResult.skipped > 0 && `, ${importResult.skipped} skipped (already in network)`}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {step === 'preview' && (
              <div className="flex items-center justify-between p-5 border-t border-gray-100 flex-shrink-0">
                <p className="text-xs text-gray-400">
                  {invalidCount > 0 && `${invalidCount} invalid row${invalidCount !== 1 ? 's' : ''} will be skipped`}
                </p>
                <button
                  onClick={handleImport}
                  disabled={isPending || validCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Importing…</>
                  ) : (
                    <>Import {validCount} partner{validCount !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            )}

            {step === 'done' && (
              <div className="p-5 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
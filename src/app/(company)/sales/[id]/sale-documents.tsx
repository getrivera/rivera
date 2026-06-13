'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { uploadSaleDocument, deleteSaleDocument } from '@/actions/sale-documents'
import { DOCUMENT_TYPES } from '@/lib/document-types'
import { FileText, Upload, Trash2, Loader2, ExternalLink } from 'lucide-react'

type Document = {
  id: string
  document_type: string
  custom_label: string | null
  file_name: string
  storage_url: string
  size_bytes: number
  created_at: string
}

type Props = {
  saleId: string
  documents: Document[]
  canManage: boolean
}

export function SaleDocuments({ saleId, documents, canManage }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [documentType, setDocumentType] = useState<string>(DOCUMENT_TYPES[0])
  const [customLabel, setCustomLabel] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB')
      return
    }
    setError(null)
    setSelectedFile(file)
  }

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a file')
      return
    }
    setError(null)

    const formData = new FormData()
    formData.set('buyer_id', saleId)
    formData.set('document_type', documentType)
    formData.set('custom_label', customLabel)
    formData.set('file', selectedFile)

    startTransition(async () => {
      const result = await uploadSaleDocument(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setSelectedFile(null)
      setCustomLabel('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  function handleDelete(documentId: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    setDeletingId(documentId)

    startTransition(async () => {
      const result = await deleteSaleDocument(documentId, saleId)
      if (!result.success) {
        setError(result.error)
      } else {
        router.refresh()
      }
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No documents uploaded yet
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={16} className="text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {doc.custom_label || doc.document_type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {doc.file_name} · {(doc.size_bytes / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <a
                  href={doc.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"
                  title="View document"
                >
                  <ExternalLink size={14} />
                </a>
                {canManage && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      {canManage && (
        <form onSubmit={handleUpload} className="space-y-3 pt-3 border-t border-gray-100">
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          {success && (
            <p className="text-xs text-green-600">Document uploaded successfully</p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Document type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {documentType === 'Other' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Custom label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Power of Attorney"
                required={documentType === 'Other'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Upload size={14} />
              {selectedFile ? selectedFile.name : 'Choose PDF file (max 5MB)'}
            </button>
          </div>

          <button
            type="submit"
            disabled={isPending || !selectedFile}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Uploading…</>
            ) : (
              <><Upload size={14} /> Upload document</>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, ImageIcon, FileText, Film, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveMarketingKit, deleteMarketingAsset, publishListing } from '@/actions/listings'

type ExistingAsset = {
  id: string
  file_name: string
  file_type: string
  storage_url: string
  size_bytes: number
  download_count: number
}

type NewFile = {
  name: string
  url: string
  type: string
  size: number
}

type Props = {
  listingId: string
  existingGalleryUrls: string[]
  existingAssets: ExistingAsset[]
}

export function KitForm({ listingId, existingGalleryUrls, existingAssets }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gallery state — start with existing URLs
  const [galleryUrls, setGalleryUrls] = useState<string[]>(existingGalleryUrls)
  const [newGalleryFiles, setNewGalleryFiles] = useState<NewFile[]>([])

  // Kit state — existing assets from DB + new uploads
  const [existingKitAssets, setExistingKitAssets] = useState<ExistingAsset[]>(existingAssets)
  const [newKitFiles, setNewKitFiles] = useState<NewFile[]>([])

  const fileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: FileList, isGallery: boolean) {
    setUploading(true)
    setError(null)
    const supabase = createClient()

    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        setError(`${file.name} is too large. Max 50MB per file.`)
        continue
      }

      const path = `${listingId}/${isGallery ? 'gallery' : 'kit'}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('marketing-assets')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        setError(`Failed to upload ${file.name}`)
        continue
      }

      const { data } = supabase.storage
        .from('marketing-assets')
        .getPublicUrl(path)

      const newFile: NewFile = {
        name: file.name,
        url: data.publicUrl,
        type: file.type,
        size: file.size,
      }

      if (isGallery) {
        setGalleryUrls((prev) => [...prev, data.publicUrl])
        setNewGalleryFiles((prev) => [...prev, newFile])
      } else {
        setNewKitFiles((prev) => [...prev, newFile])
      }
    }

    setUploading(false)
  }

  function removeGalleryUrl(url: string) {
    setGalleryUrls((prev) => prev.filter((u) => u !== url))
    setNewGalleryFiles((prev) => prev.filter((f) => f.url !== url))
  }

  async function removeExistingAsset(asset: ExistingAsset) {
    await deleteMarketingAsset(asset.id)
    setExistingKitAssets((prev) => prev.filter((a) => a.id !== asset.id))
  }

  function removeNewKitFile(url: string) {
    setNewKitFiles((prev) => prev.filter((f) => f.url !== url))
  }

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return <ImageIcon size={16} className="text-blue-500" />
    if (type.startsWith('video/')) return <Film size={16} className="text-purple-500" />
    return <FileText size={16} className="text-orange-500" />
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  function handleSaveAndPublish() {
    startTransition(async () => {
      // Save gallery + new kit files to DB
      const result = await saveMarketingKit(
        listingId,
        galleryUrls,
        newKitFiles.map((f) => ({
          file_name: f.name,
          file_type: f.type,
          storage_url: f.url,
          size_bytes: f.size,
        }))
      )

      if (!result.success) {
        setError(result.error)
        return
      }

      // Publish the listing
      try {
        await publishListing(listingId)
        router.push(`/listings/${listingId}`)
      } catch (err) {
        const e = err as { digest?: string }
        if (!e?.digest?.includes('NEXT_REDIRECT')) {
          setError('Failed to publish listing.')
        }
      }
    })
  }

  function handleSaveOnly() {
    startTransition(async () => {
      const result = await saveMarketingKit(
        listingId,
        galleryUrls,
        newKitFiles.map((f) => ({
          file_name: f.name,
          file_type: f.type,
          storage_url: f.url,
          size_bytes: f.size,
        }))
      )

      if (!result.success) {
        setError(result.error)
        return
      }

      router.push(`/listings/${listingId}`)
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Gallery */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-800">Property gallery</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Photos partners see when browsing this listing
            </p>
          </div>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Upload size={14} />
            Upload photos
          </button>
        </div>

        <input
          ref={galleryRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files, true)}
        />

        {galleryUrls.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {galleryUrls.map((url, i) => (
              <div
                key={i}
                className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200"
              >
                <img
                  src={url}
                  alt={`Gallery ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryUrl(url)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => galleryRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-brand-500 transition-colors"
          >
            <ImageIcon size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Click to upload property photos</p>
            <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP</p>
          </div>
        )}
      </div>

      {/* Marketing kit */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-800">Marketing kit</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Flyers, brochures, videos — partners download these to share
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Upload size={14} />
            Upload files
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files, false)}
        />

        {existingKitAssets.length === 0 && newKitFiles.length === 0 ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-brand-500 transition-colors"
          >
            <Upload size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Upload flyers, PDFs, videos</p>
            <p className="text-xs text-gray-300 mt-1">Max 50MB per file</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Existing assets from DB */}
            {existingKitAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                {getFileIcon(asset.file_type)}
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {asset.file_name}
                </span>
                <span className="text-xs text-gray-400">
                  {formatSize(asset.size_bytes)}
                </span>
                <button
                  type="button"
                  onClick={() => removeExistingAsset(asset)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {/* New uploads */}
            {newKitFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg border border-green-100 bg-green-50"
              >
                {getFileIcon(file.type)}
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {file.name}
                </span>
                <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                <span className="text-xs text-green-600 font-medium">New</span>
                <button
                  type="button"
                  onClick={() => removeNewKitFile(file.url)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <div className="text-center py-2 text-sm text-gray-500 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          Uploading files…
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
       <a 
      href={`/listings/${listingId}/plans`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to plans
        </a>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={isPending || uploading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Save without publishing
          </button>
          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={isPending || uploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Saving…</>
            ) : (
                <><Check size={16} /> Save and publish</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
import 'server-only'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'

export type StorageBucket = 'originals' | 'thumbnails'

const THUMBNAIL_MAX_PX = 800
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

// Path helpers (4.5)

export function originalPath(itemId: string, ext: string): string {
  return `items/${itemId}/original.${ext.replace(/^\./, '')}`
}

export function thumbnailPath(itemId: string): string {
  return `items/${itemId}/thumb.webp`
}

// Signed URL generation (4.3)

export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  return data.signedUrl
}

// Missing thumbnails remain placeholders; sign each distinct path once per page.
export async function getThumbnailUrls(
  items: readonly { id: string; thumbnail_path: string | null }[],
): Promise<Record<string, string>> {
  const paths = [...new Set(items.flatMap(item => item.thumbnail_path ? [item.thumbnail_path] : []))]
  if (paths.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('thumbnails')
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error) {
    console.error('Unable to sign thumbnail URLs:', error.message)
    return {}
  }

  const urlsByPath = new Map(
    data.flatMap(entry => entry.path && entry.signedUrl && !entry.error
      ? [[entry.path, entry.signedUrl] as const]
      : []),
  )
  const urls: Record<string, string> = {}
  for (const item of items) {
    const url = item.thumbnail_path ? urlsByPath.get(item.thumbnail_path) : undefined
    if (url) urls[item.id] = url
  }
  return urls
}

// Thumbnail generation (4.4)
// Returns a WebP buffer resized to fit within THUMBNAIL_MAX_PX on the longest side.
// Throws if the input is not a recognised image format.

export async function generateThumbnail(input: Buffer | Uint8Array): Promise<Buffer> {
  return sharp(input)
    .resize(THUMBNAIL_MAX_PX, THUMBNAIL_MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}

// Returns true for MIME types that sharp can decode into a thumbnail.

export function isThumbnailable(mimeType: string): boolean {
  return /^image\/(jpeg|png|gif|webp|avif|tiff|heif|heic|svg\+xml)$/.test(mimeType)
}
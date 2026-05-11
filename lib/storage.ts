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
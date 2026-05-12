'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/supabase/admin'
import { generateThumbnail, isThumbnailable, thumbnailPath } from '@/lib/storage'

export type RegisterItemResult = { itemId: string } | { error: string }

function inferFileType(mimeType: string): 'photo' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'photo'
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType.startsWith('application/vnd.openxmlformats-officedocument') ||
    mimeType.startsWith('text/')
  )
    return 'document'
  return 'other'
}

export async function registerItem(
  itemId: string,
  title: string,
  filePath: string,
  mimeType: string,
): Promise<RegisterItemResult> {
  const supabase = await createClient()

  const [{ data: { user } }, orgId] = await Promise.all([
    supabase.auth.getUser(),
    getOrgId(),
  ])
  if (!user) return { error: 'Not authenticated' }
  if (!orgId) return { error: 'No organization assigned to your account.' }

  const fileType = inferFileType(mimeType)
  let thumbPath: string | null = null

  if (isThumbnailable(mimeType)) {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('originals')
      .download(filePath)

    if (!downloadError && fileData) {
      try {
        const buffer = Buffer.from(await fileData.arrayBuffer())
        const thumbBuffer = await generateThumbnail(buffer)
        const tPath = thumbnailPath(itemId)

        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(tPath, thumbBuffer, { contentType: 'image/webp' })

        if (!thumbError) thumbPath = tPath
      } catch {
        // thumbnail generation is best-effort; item creation continues without it
      }
    }
  }

  const { error: insertError } = await supabase.from('items').insert({
    id: itemId,
    title,
    file_path: filePath,
    thumbnail_path: thumbPath,
    file_type: fileType,
    uploaded_by: user.id,
    organization_id: orgId,
  })

  if (insertError) return { error: insertError.message }

  return { itemId }
}

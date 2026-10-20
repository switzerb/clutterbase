'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateThumbnail, isThumbnailable, thumbnailPath } from '@/lib/storage'

export type RegisterItemResult = { itemId: string; warning?: string } | { error: string }

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
  if (typeof itemId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)
    || typeof filePath !== 'string' || !new RegExp(`^items/${itemId}/original\\.[a-z0-9]{1,12}$`).test(filePath)
    || typeof title !== 'string' || !title.trim() || title.length > 500
    || typeof mimeType !== 'string' || mimeType.length > 255) {
    return { error: 'Invalid upload details.' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const userId = user.id
  const orgId = user.app_metadata?.organization_id
  if (!orgId) return { error: 'No organization assigned to your account.' }

  async function findRegisteredItem(): Promise<RegisterItemResult | null> {
    const { data, error } = await supabase.from('items')
      .select('id, file_path, uploaded_by, organization_id, thumbnail_path, file_type').eq('id', itemId).maybeSingle()
    if (error) return { error: 'Could not check this upload. Please retry.' }
    if (!data) return null
    if (data.file_path !== filePath || data.uploaded_by !== userId || data.organization_id !== orgId) {
      return { error: 'This upload does not belong to your account.' }
    }
    revalidatePath('/')
    return { itemId: data.id, ...(data.file_type === 'photo' && !data.thumbnail_path ? { warning: 'Original saved; thumbnail is unavailable.' } : {}) }
  }

  const registered = await findRegisteredItem()
  if (registered) return registered

  const { data: original, error: originalError } = await supabase.storage.from('originals').info(filePath)
  if (originalError || !original) return { error: 'Could not verify the uploaded original. Please retry.' }

  const storedMimeType = original.contentType ?? mimeType
  const fileType = inferFileType(storedMimeType)
  let thumbPath: string | null = null

  if (isThumbnailable(storedMimeType)) {
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
        else if (thumbError.statusCode === '409') {
          const { data: thumbnail, error } = await supabase.storage.from('thumbnails').info(tPath)
          if (!error && thumbnail) thumbPath = tPath
        }
      } catch {
        // thumbnail generation is best-effort; item creation continues without it
      }
    }
  }

  const { error: insertError } = await supabase.from('items').insert({
    id: itemId,
    title: title.trim(),
    file_path: filePath,
    thumbnail_path: thumbPath,
    file_type: fileType,
    uploaded_by: user.id,
    organization_id: orgId,
  })

  if (insertError) {
    // A concurrent retry or a lost response may already have committed this ID.
    if (insertError.code === '23505') {
      const existing = await findRegisteredItem()
      if (existing) return existing
    }
    return { error: 'The original is uploaded, but the item could not be saved. Retry to finish saving it.' }
  }

  revalidatePath('/')
  return {
    itemId,
    ...(isThumbnailable(storedMimeType) && !thumbPath ? { warning: 'Original saved; thumbnail could not be generated.' } : {}),
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  return { supabase, user }
}

export async function setItemTags(itemId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const tagIds = formData.getAll('tag_id') as string[]

  await supabase.from('item_tags').delete().eq('item_id', itemId)

  if (tagIds.length > 0) {
    await supabase
      .from('item_tags')
      .insert(tagIds.map(tag_id => ({ item_id: itemId, tag_id })))
  }

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

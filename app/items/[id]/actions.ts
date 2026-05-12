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

export async function addRelatedItem(itemId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const relatedItemId = (formData.get('related_item_id') as string)?.trim()
  if (!relatedItemId || relatedItemId === itemId) return
  const note = (formData.get('note') as string)?.trim() || null

  const [item_a_id, item_b_id] = [itemId, relatedItemId].sort()

  await supabase.from('item_relationships').insert({ item_a_id, item_b_id, note })

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function removeRelatedItem(
  itemId: string,
  relationshipId: string,
  _formData: FormData,
) {
  const { supabase } = await requireUser()

  await supabase.from('item_relationships').delete().eq('id', relationshipId)

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function updateItem(
  itemId: string,
  _state: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const { supabase } = await requireUser()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required.' }

  const description = (formData.get('description') as string)?.trim() || null
  const dateYearRaw = (formData.get('date_year') as string)?.trim()
  const date_year = dateYearRaw ? parseInt(dateYearRaw, 10) : null
  const date_precision = date_year ? ((formData.get('date_precision') as string) || 'year') : null

  const { error } = await supabase
    .from('items')
    .update({ title, description, date_year, date_precision })
    .eq('id', itemId)

  if (error) return { error: error.message }

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function addItemPerson(itemId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const personId = (formData.get('person_id') as string)?.trim()
  if (!personId) return

  await supabase
    .from('item_people')
    .upsert({ item_id: itemId, person_id: personId }, { ignoreDuplicates: true })

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function removeItemPerson(itemId: string, personId: string, _formData: FormData) {
  const { supabase } = await requireUser()

  await supabase.from('item_people').delete().eq('item_id', itemId).eq('person_id', personId)

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
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

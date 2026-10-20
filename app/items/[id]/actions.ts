'use server'

import { checkWrite, formText } from '@/lib/action-result'
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

  const relatedItemId = formText(formData, 'related_item_id')
  if (!relatedItemId || relatedItemId === itemId) return { error: 'Choose a different item to link.' }
  const note = formText(formData, 'note') || null

  const [item_a_id, item_b_id] = [itemId, relatedItemId].sort()

  const failure = await checkWrite(supabase.from('item_relationships').insert({ item_a_id, item_b_id, note }).select())
  if (failure) return failure

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function removeRelatedItem(
  itemId: string,
  relationshipId: string,
) {
  const { supabase } = await requireUser()

  const failure = await checkWrite(supabase.from('item_relationships').delete().eq('id', relationshipId).select())
  if (failure) return failure

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function updateItem(
  itemId: string,
  _state: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const { supabase } = await requireUser()

  const title = formText(formData, 'title')
  if (!title) return { error: 'Title is required.' }

  const description = formText(formData, 'description') || null
  const dateYearRaw = formText(formData, 'date_year')
  const date_year = dateYearRaw ? parseInt(dateYearRaw, 10) : null
  const date_precision = date_year ? ((formData.get('date_precision') as string) || 'year') : null

  const failure = await checkWrite(supabase
    .from('items')
    .update({ title, description, date_year, date_precision })
    .eq('id', itemId).select())
  if (failure) return failure

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function addItemPerson(itemId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const personId = formText(formData, 'person_id')
  if (!personId) return { error: 'Choose a person to link.' }

  const failure = await checkWrite(supabase
    .from('item_people')
    .insert({ item_id: itemId, person_id: personId }).select())
  if (failure) return failure

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function removeItemPerson(itemId: string, personId: string) {
  const { supabase } = await requireUser()

  const failure = await checkWrite(supabase.from('item_people').delete().eq('item_id', itemId).eq('person_id', personId).select())
  if (failure) return failure

  revalidatePath(`/items/${itemId}`)
  redirect(`/items/${itemId}`)
}

export async function setItemTags(itemId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const tagIds = formData.getAll('tag_id')
  if (tagIds.some(id => typeof id !== 'string')) return { error: 'Invalid tag selection.' }
  const { error } = await supabase.rpc('replace_item_tags', { p_item_id: itemId, p_tag_ids: tagIds })
  if (error) return { error: 'Could not save tags. Please try again.' }

  revalidatePath(`/items/${itemId}`)
  revalidatePath('/')
  return { success: 'Tags saved.' }
}

'use server'

import { checkWrite, formText } from '@/lib/action-result'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, getOrgId } from '@/lib/supabase/admin'

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createCategory(formData: FormData) {
  await requireAdmin()
  const [supabase, orgId] = [await createClient(), await getOrgId()]
  const name = formText(formData, 'name')
  if (!name) return { error: 'Name is required.' }
  const { error } = await supabase.from('tag_categories').insert({ name, organization_id: orgId })
  if (error) return { error: 'Could not save this change. Please try again.' }
  revalidatePath('/tags')
  redirect('/tags')
}

export async function renameCategory(id: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = formText(formData, 'name')
  if (!name) return { error: 'Name is required.' }
  const failure = await checkWrite(supabase.from('tag_categories').update({ name }).eq('id', id).select())
  if (failure) return failure
  revalidatePath('/tags')
  redirect('/tags')
}

export async function deleteCategory(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const failure = await checkWrite(supabase.from('tag_categories').delete().eq('id', id).select())
  if (failure) return failure
  revalidatePath('/tags')
  redirect('/tags')
}

export async function createTag(categoryId: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = formText(formData, 'name')
  if (!name) return { error: 'Name is required.' }
  const slug = toSlug(name)
  const { error } = await supabase
    .from('tags')
    .insert({ category_id: categoryId, name, slug })
  if (error) return { error: 'Could not save this change. Please try again.' }
  revalidatePath('/tags')
  redirect('/tags')
}

export async function renameTag(id: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = formText(formData, 'name')
  if (!name) return { error: 'Name is required.' }
  const slug = toSlug(name)
  const failure = await checkWrite(supabase.from('tags').update({ name, slug }).eq('id', id).select())
  if (failure) return failure
  revalidatePath('/tags')
  redirect('/tags')
}

export async function deleteTag(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  const failure = await checkWrite(supabase.from('tags').delete().eq('id', id).select())
  if (failure) return failure
  revalidatePath('/tags')
  redirect('/tags')
}

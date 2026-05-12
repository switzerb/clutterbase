'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createCategory(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  if (!name) return
  const { error } = await supabase.from('tag_categories').insert({ name })
  if (error) return
  revalidatePath('/tags')
  redirect('/tags')
}

export async function renameCategory(id: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  if (!name) return
  await supabase.from('tag_categories').update({ name }).eq('id', id)
  revalidatePath('/tags')
  redirect('/tags')
}

export async function deleteCategory(id: string, _formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('tag_categories').delete().eq('id', id)
  revalidatePath('/tags')
  redirect('/tags')
}

export async function createTag(categoryId: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  if (!name) return
  const slug = toSlug(name)
  const { error } = await supabase
    .from('tags')
    .insert({ category_id: categoryId, name, slug })
  if (error) return
  revalidatePath('/tags')
  redirect('/tags')
}

export async function renameTag(id: string, formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  if (!name) return
  const slug = toSlug(name)
  await supabase.from('tags').update({ name, slug }).eq('id', id)
  revalidatePath('/tags')
  redirect('/tags')
}

export async function deleteTag(id: string, _formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('tags').delete().eq('id', id)
  revalidatePath('/tags')
  redirect('/tags')
}

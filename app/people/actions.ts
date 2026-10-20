'use server'

import { checkWrite, formText } from '@/lib/action-result'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type PersonFormState = { error?: string } | null

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  return { supabase, user, orgId: user.app_metadata?.organization_id ?? null }
}

// ── People CRUD ────────────────────────────────────────────────────────────

export async function createPerson(
  _state: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const { supabase, orgId } = await requireUser()
  if (!orgId) return { error: 'No organization assigned to your account.' }

  const full_name = formText(formData, 'full_name')
  if (!full_name) return { error: 'Name is required.' }

  const birth_year = formData.get('birth_year')
    ? parseInt(formData.get('birth_year') as string, 10)
    : null
  const death_year = formData.get('death_year')
    ? parseInt(formData.get('death_year') as string, 10)
    : null
  const notes = formText(formData, 'notes') || null

  const { data, error } = await supabase
    .from('people')
    .insert({ full_name, birth_year, death_year, notes, organization_id: orgId })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/people/${data.id}`)
}

export async function updatePerson(
  id: string,
  _state: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const { supabase } = await requireUser()

  const full_name = formText(formData, 'full_name')
  if (!full_name) return { error: 'Name is required.' }

  const birth_year = formData.get('birth_year')
    ? parseInt(formData.get('birth_year') as string, 10)
    : null
  const death_year = formData.get('death_year')
    ? parseInt(formData.get('death_year') as string, 10)
    : null
  const notes = formText(formData, 'notes') || null
  const profile_photo_item_id =
    formText(formData, 'profile_photo_item_id') || null

  const failure = await checkWrite(supabase
    .from('people')
    .update({ full_name, birth_year, death_year, notes, profile_photo_item_id })
    .eq('id', id).select())
  if (failure) return failure
  revalidatePath(`/people/${id}`)
  redirect(`/people/${id}`)
}

export async function deletePerson(id: string) {
  const { supabase } = await requireUser()
  const failure = await checkWrite(supabase.from('people').delete().eq('id', id).select())
  if (failure) return failure
  revalidatePath('/people')
  redirect('/people')
}

// ── Family unit management ─────────────────────────────────────────────────

// Sets or updates the parents of a person. Creates a family unit if none exists.
export async function setPersonParents(personId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const parent1Id = (formData.get('parent1Id') as string) || null
  const parent2Id = (formData.get('parent2Id') as string) || null

  const { error } = await supabase.rpc('set_person_parents', {
    p_person_id: personId, p_parent1_id: parent1Id, p_parent2_id: parent2Id,
  })
  if (error) return { error: 'Could not save parents. Please try again.' }

  revalidatePath(`/people/${personId}`)
  redirect(`/people/${personId}`)
}

// Creates a new family unit where the given person is parent_1.
export async function createFamilyUnitAsParent(personId: string, formData: FormData) {
  const { supabase, orgId } = await requireUser()
  if (!orgId) return { error: 'No organization assigned to your account.' }

  const coParentId = (formData.get('coParentId') as string) || null

  const failure = await checkWrite(supabase
    .from('family_units')
    .insert({ parent_1_id: personId, parent_2_id: coParentId, organization_id: orgId }).select())
  if (failure) return failure

  revalidatePath(`/people/${personId}`)
  redirect(`/people/${personId}`)
}

// Adds a child to an existing family unit.
export async function addChildToUnit(
  personId: string,
  unitId: string,
  formData: FormData,
) {
  const { supabase } = await requireUser()

  const childId = formData.get('childId') as string
  if (!childId) return { error: 'Choose a child to add.' }

  const failure = await checkWrite(supabase
    .from('family_unit_children')
    .insert({ family_unit_id: unitId, person_id: childId }).select())
  if (failure) return failure

  revalidatePath(`/people/${personId}`)
  revalidatePath(`/people/${childId}`)
  redirect(`/people/${personId}`)
}

export async function removeChildFromUnit(
  personId: string,
  unitId: string,
  childId: string,
) {
  const { supabase } = await requireUser()

  const failure = await checkWrite(supabase
    .from('family_unit_children')
    .delete()
    .eq('family_unit_id', unitId)
    .eq('person_id', childId).select())
  if (failure) return failure

  revalidatePath(`/people/${personId}`)
  revalidatePath(`/people/${childId}`)
  redirect(`/people/${personId}`)
}

export async function deleteFamilyUnit(
  personId: string,
  unitId: string,
) {
  const { supabase } = await requireUser()

  const failure = await checkWrite(supabase.from('family_units').delete().eq('id', unitId).select())
  if (failure) return failure

  revalidatePath(`/people/${personId}`)
  redirect(`/people/${personId}`)
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type PersonFormState = { error?: string } | null

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  return { supabase, user }
}

// ── People CRUD ────────────────────────────────────────────────────────────

export async function createPerson(
  _state: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const { supabase } = await requireUser()

  const full_name = (formData.get('full_name') as string).trim()
  if (!full_name) return { error: 'Name is required.' }

  const birth_year = formData.get('birth_year')
    ? parseInt(formData.get('birth_year') as string, 10)
    : null
  const death_year = formData.get('death_year')
    ? parseInt(formData.get('death_year') as string, 10)
    : null
  const notes = (formData.get('notes') as string).trim() || null

  const { data, error } = await supabase
    .from('people')
    .insert({ full_name, birth_year, death_year, notes })
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

  const full_name = (formData.get('full_name') as string).trim()
  if (!full_name) return { error: 'Name is required.' }

  const birth_year = formData.get('birth_year')
    ? parseInt(formData.get('birth_year') as string, 10)
    : null
  const death_year = formData.get('death_year')
    ? parseInt(formData.get('death_year') as string, 10)
    : null
  const notes = (formData.get('notes') as string).trim() || null
  const profile_photo_item_id =
    (formData.get('profile_photo_item_id') as string).trim() || null

  const { error } = await supabase
    .from('people')
    .update({ full_name, birth_year, death_year, notes, profile_photo_item_id })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/people/${id}`)
  redirect(`/people/${id}`)
}

export async function deletePerson(id: string, _formData: FormData) {
  const { supabase } = await requireUser()
  await supabase.from('people').delete().eq('id', id)
  revalidatePath('/people')
  redirect('/people')
}

// ── Family unit management ─────────────────────────────────────────────────

// Sets or updates the parents of a person. Creates a family unit if none exists.
export async function setPersonParents(personId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const parent1Id = (formData.get('parent1Id') as string) || null
  const parent2Id = (formData.get('parent2Id') as string) || null

  const { data: existing } = await supabase
    .from('family_unit_children')
    .select('family_unit_id')
    .eq('person_id', personId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('family_units')
      .update({ parent_1_id: parent1Id, parent_2_id: parent2Id })
      .eq('id', existing.family_unit_id)
  } else {
    const { data: unit, error } = await supabase
      .from('family_units')
      .insert({ parent_1_id: parent1Id, parent_2_id: parent2Id })
      .select('id')
      .single()
    if (!error && unit) {
      await supabase
        .from('family_unit_children')
        .insert({ family_unit_id: unit.id, person_id: personId })
    }
  }

  revalidatePath(`/people/${personId}`)
  redirect(`/people/${personId}`)
}

// Creates a new family unit where the given person is parent_1.
export async function createFamilyUnitAsParent(personId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const coParentId = (formData.get('coParentId') as string) || null

  await supabase
    .from('family_units')
    .insert({ parent_1_id: personId, parent_2_id: coParentId })

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
  if (!childId) {
    revalidatePath(`/people/${personId}`)
    redirect(`/people/${personId}`)
  }

  await supabase
    .from('family_unit_children')
    .insert({ family_unit_id: unitId, person_id: childId })

  revalidatePath(`/people/${personId}`)
  revalidatePath(`/people/${childId}`)
  redirect(`/people/${personId}`)
}

export async function removeChildFromUnit(
  personId: string,
  unitId: string,
  childId: string,
  _formData: FormData,
) {
  const { supabase } = await requireUser()

  await supabase
    .from('family_unit_children')
    .delete()
    .eq('family_unit_id', unitId)
    .eq('person_id', childId)

  revalidatePath(`/people/${personId}`)
  revalidatePath(`/people/${childId}`)
  redirect(`/people/${personId}`)
}

export async function deleteFamilyUnit(
  personId: string,
  unitId: string,
  _formData: FormData,
) {
  const { supabase } = await requireUser()

  await supabase.from('family_units').delete().eq('id', unitId)

  revalidatePath(`/people/${personId}`)
  redirect(`/people/${personId}`)
}

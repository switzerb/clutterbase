import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updatePerson } from '../../actions'
import { PersonForm } from '../../_components/PersonForm'

type Params = Promise<{ id: string }>

export default async function EditPersonPage({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: person, error } = await supabase
    .from('people')
    .select('id, full_name, birth_year, death_year, notes, profile_photo_item_id')
    .eq('id', id)
    .single()

  if (error || !person) notFound()

  const action = updatePerson.bind(null, id)

  return (
    <main className="flex min-h-screen flex-col items-start gap-6 p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-semibold">Edit person</h1>
      <PersonForm action={action} defaultValues={person} submitLabel="Save changes" />
    </main>
  )
}

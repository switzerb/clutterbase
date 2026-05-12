import { createPerson } from '../actions'
import { PersonForm } from '../_components/PersonForm'

export default function NewPersonPage() {
  return (
    <main className="flex min-h-screen flex-col items-start gap-6 p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-semibold">Add person</h1>
      <PersonForm action={createPerson} submitLabel="Add person" />
    </main>
  )
}

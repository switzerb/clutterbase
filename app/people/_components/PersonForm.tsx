'use client'

import { useActionState } from 'react'
import { Alert, Button, Card, Input, Label, Spinner, TextField } from '@heroui/react'
import type { PersonFormState } from '../actions'

type PersonDefaults = {
  full_name?: string
  birth_year?: number | null
  death_year?: number | null
  notes?: string | null
  profile_photo_item_id?: string | null
}

type Props = {
  action: (state: PersonFormState, formData: FormData) => Promise<PersonFormState>
  defaultValues?: PersonDefaults
  submitLabel?: string
}

export function PersonForm({ action, defaultValues, submitLabel = 'Save' }: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <Card className="w-full max-w-lg">
      <Card.Content>
        <form action={formAction} className="flex flex-col gap-4">
          <TextField name="full_name" isRequired defaultValue={defaultValues?.full_name ?? ''}>
            <Label>Full name</Label>
            <Input placeholder="Jane Smith" variant="secondary" />
          </TextField>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              name="birth_year"
              type="number"
              defaultValue={defaultValues?.birth_year?.toString() ?? ''}
            >
              <Label>Birth year</Label>
              <Input placeholder="1942" variant="secondary" />
            </TextField>
            <TextField
              name="death_year"
              type="number"
              defaultValue={defaultValues?.death_year?.toString() ?? ''}
            >
              <Label>Death year</Label>
              <Input placeholder="2010" variant="secondary" />
            </TextField>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Notes</Label>
            <textarea
              name="notes"
              defaultValue={defaultValues?.notes ?? ''}
              rows={3}
              placeholder="Any notes about this person…"
              className="rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
          </div>

          <TextField
            name="profile_photo_item_id"
            defaultValue={defaultValues?.profile_photo_item_id ?? ''}
          >
            <Label>Profile photo item ID</Label>
            <Input
              placeholder="Paste an item UUID to use its thumbnail as avatar"
              variant="secondary"
            />
          </TextField>

          {state?.error && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{state.error}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <Button type="submit" className="self-start" isPending={pending}>
            {({ isPending }) => (
              <>
                {isPending && <Spinner size="sm" color="current" />}
                {isPending ? 'Saving…' : submitLabel}
              </>
            )}
          </Button>
        </form>
      </Card.Content>
    </Card>
  )
}

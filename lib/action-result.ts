export type ActionResult = { error?: string; success?: string } | void

export function formText(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

export async function checkWrite(
  operation: PromiseLike<{ data: unknown[] | null; error: { code?: string } | null }>,
): Promise<{ error: string } | undefined> {
  try {
    const { data, error } = await operation
    if (error) return { error: 'Could not save this change. Please try again.' }
    if (!data?.length) return { error: 'Nothing was changed. The record may be unavailable or you may not have permission.' }
  } catch {
    return { error: 'Could not reach the server. Please try again.' }
  }
}
